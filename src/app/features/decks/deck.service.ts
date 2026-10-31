import { Injectable, inject } from '@angular/core';

import { Card } from '../../core/models/card.model';
import { PreconDetail } from '../../core/models/precon.model';
import { GameService } from '../../core/services/game.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { AddCardInput, CollectionService } from '../collection/collection.service';
import { buildAssignedElsewhereMaps, getOwnedQuantity } from './deck-stats';

export interface DeckRow {
  id: string;
  user_id: string;
  game_id: string;
  name: string;
  format: string | null;
  is_precon: boolean;
  // Set at add-time by the "Alle Karten vorhanden" checkbox for any deck
  // *other* than a precon (import/EDHREC/Moxfield/MTGO format set) that the
  // user says represents a real, fully-owned physical pool just like a
  // precon does - see grantAllCards/grantMissingCards and
  // deck-detail-dialog.ts's matchingMaps.
  all_cards_owned: boolean;
  release_date: string | null;
  mtgjson_file_name: string | null;
  // Known (not guessed) commander card_id, set at add-time when the source
  // data actually names one - currently only a genuine Commander-type precon
  // (see PreconDetail.commanderCardId). Null for every other deck, including
  // one built via addEdhrecDeck (its own commander is only known by name,
  // via deck.name itself - see DeckDetailDialog's inferredCommanderCardId)
  // and a manually imported deck (no commander data at all).
  commander_card_id: string | null;
  created_at: string;
}

export interface DeckCardRow {
  id: string;
  deck_id: string;
  card_id: string;
  quantity: number;
  // Whether this card counts as "committed" to this deck for the
  // availability calculation in deck-stats.ts - defaults true (being listed
  // in a deck's card list is itself the commitment); there's no UI to
  // toggle it off in this pass.
  is_assigned: boolean;
}

export interface DeckCardEntry {
  row: DeckCardRow;
  card: Card;
}

export interface DeckEntry {
  deck: DeckRow;
  cards: DeckCardEntry[];
}

// Same reasoning as CollectionService's COLLECTION_PAGE_SIZE - an unbounded
// select on deck_cards is subject to PostgREST's default max-rows cap, and
// several decks' worth of cards can realistically add up past it.
const DECK_CARDS_PAGE_SIZE = 1000;

@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly supabase = inject(SupabaseService);
  private readonly gameService = inject(GameService);
  private readonly collectionService = inject(CollectionService);

  async getMyDecks(): Promise<DeckEntry[]> {
    await this.gameService.ready;
    const gameId = this.gameService.currentGameId();
    if (!gameId) return [];

    const { data: decks, error: decksError } = await this.supabase.client
      .from('decks')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .returns<DeckRow[]>();

    if (decksError) throw decksError;
    if (!decks || decks.length === 0) return [];

    const deckIds = decks.map((deck) => deck.id);
    const deckCards: DeckCardRow[] = [];
    for (let from = 0; ; from += DECK_CARDS_PAGE_SIZE) {
      const { data, error: cardsError } = await this.supabase.client
        .from('deck_cards')
        .select('*')
        .in('deck_id', deckIds)
        // See CollectionService.fetchAllPages's own doc comment - .range()
        // has no guaranteed row order between pages without this, so a
        // concurrent write between the two page requests can drop a row
        // from both pages instead of landing it in either one.
        .order('id')
        .range(from, from + DECK_CARDS_PAGE_SIZE - 1)
        .returns<DeckCardRow[]>();
      if (cardsError) throw cardsError;
      const page = data ?? [];
      deckCards.push(...page);
      if (page.length < DECK_CARDS_PAGE_SIZE) break;
    }

    const cards = await this.gameService.cardApi().getCardsByIds(deckCards.map((row) => row.card_id));
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    const cardsByDeck = new Map<string, DeckCardEntry[]>();
    for (const row of deckCards) {
      const card = cardsById.get(row.card_id);
      if (!card) continue;
      const list = cardsByDeck.get(row.deck_id);
      const entry = { row, card };
      if (list) {
        list.push(entry);
      } else {
        cardsByDeck.set(row.deck_id, [entry]);
      }
    }

    return decks.map((deck) => ({ deck, cards: cardsByDeck.get(deck.id) ?? [] }));
  }

  async addPreconDeck(
    name: string,
    type: string,
    releaseDate: string,
    fileName: string,
    detail: PreconDetail,
  ): Promise<void> {
    await this.gameService.ready;
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');
    const gameId = this.gameService.currentGameId();
    if (!gameId) throw new Error('Kein aktives Spiel.');
    // Would otherwise create a deck with no cards, permanently stuck at 0%.
    if (detail.cards.length === 0) {
      throw new Error('Die Kartenliste dieses Decks ist noch nicht verfügbar - bitte später erneut versuchen.');
    }

    const { data: deck, error: deckError } = await this.supabase.client
      .from('decks')
      .insert({
        user_id: userId,
        game_id: gameId,
        name,
        format: type,
        is_precon: true,
        all_cards_owned: false,
        release_date: releaseDate,
        mtgjson_file_name: fileName,
        commander_card_id: detail.commanderCardId,
      })
      .select('id')
      .single<{ id: string }>();

    if (deckError) throw deckError;

    const { error: cardsError } = await this.supabase.client.from('deck_cards').insert(
      detail.cards.map((card) => ({
        deck_id: deck.id,
        card_id: card.cardId,
        quantity: card.quantity,
      })),
    );
    if (cardsError) throw cardsError;

    // A precon is a sealed physical product, unlike importDeck/
    // addArchetypeDeck's "a decklist to build from what I already own" -
    // every listed card (and bonus token) ships in the box regardless of
    // what's already owned from elsewhere or claimed by another deck, so
    // this always adds the full quantity rather than topping up a shared
    // pool (see grantAllCards's own doc comment).
    await this.grantAllCards(detail.cards);
  }

  /**
   * Deck built from a pasted card list (see DeckImportDialog) rather than a
   * bundled precon. `allCardsOwned` is the "Alle Karten vorhanden"
   * checkbox - checked when the pasted list is itself a real, fully-owned
   * physical pool (e.g. a Game Night/Beginner Box product typed in by
   * hand rather than pulled from the precon library): grants the full
   * list unconditionally and, from then on, is matched exact-print-only
   * forever (see deck-detail-dialog.ts). Left unchecked (default), this is
   * a "build from what I already own" decklist instead: only the
   * shortfall against freely available stock is granted (grantMissingCards).
   */
  async importDeck(
    name: string,
    cards: Array<{ cardId: string; quantity: number }>,
    allCardsOwned = false,
  ): Promise<void> {
    await this.gameService.ready;
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');
    const gameId = this.gameService.currentGameId();
    if (!gameId) throw new Error('Kein aktives Spiel.');

    const { data: deck, error: deckError } = await this.supabase.client
      .from('decks')
      .insert({
        user_id: userId,
        game_id: gameId,
        name,
        format: null,
        is_precon: false,
        all_cards_owned: allCardsOwned,
        release_date: null,
        mtgjson_file_name: null,
        commander_card_id: null,
      })
      .select('id')
      .single<{ id: string }>();

    if (deckError) throw deckError;

    const { error: cardsError } = await this.supabase.client.from('deck_cards').insert(
      cards.map((card) => ({
        deck_id: deck.id,
        card_id: card.cardId,
        quantity: card.quantity,
      })),
    );
    if (cardsError) throw cardsError;

    if (allCardsOwned) {
      await this.grantAllCards(cards);
    } else {
      await this.grantMissingCards(deck.id, cards);
    }
  }

  /** Deck built from a computed average-decklist (EDHREC for Commander via CommanderRecommendationsDialog, Moxfield for 60-card formats via FormatDeckRecommendationsDialog) - same shape/side effects as importDeck (the "Alle Karten vorhanden" checkbox picks grantAllCards vs grantMissingCards), just tagged with the given format instead of a free-text one. */
  async addArchetypeDeck(
    name: string,
    format: string,
    cards: Array<{ cardId: string; quantity: number }>,
    allCardsOwned = false,
  ): Promise<void> {
    await this.gameService.ready;
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');
    const gameId = this.gameService.currentGameId();
    if (!gameId) throw new Error('Kein aktives Spiel.');

    const { data: deck, error: deckError } = await this.supabase.client
      .from('decks')
      .insert({
        user_id: userId,
        game_id: gameId,
        name,
        format,
        is_precon: false,
        all_cards_owned: allCardsOwned,
        release_date: null,
        mtgjson_file_name: null,
        commander_card_id: null,
      })
      .select('id')
      .single<{ id: string }>();

    if (deckError) throw deckError;

    const { error: cardsError } = await this.supabase.client.from('deck_cards').insert(
      cards.map((card) => ({
        deck_id: deck.id,
        card_id: card.cardId,
        quantity: card.quantity,
      })),
    );
    if (cardsError) throw cardsError;

    if (allCardsOwned) {
      await this.grantAllCards(cards);
    } else {
      await this.grantMissingCards(deck.id, cards);
    }
  }

  /** Thin wrapper around addArchetypeDeck for the Commander case - kept as its own method since CommanderRecommendationsDialog already calls it by this name. */
  addEdhrecDeck(
    commanderName: string,
    cards: Array<{ cardId: string; quantity: number }>,
    allCardsOwned = false,
  ): Promise<void> {
    return this.addArchetypeDeck(commanderName, 'Commander', cards, allCardsOwned);
  }

  /**
   * Grants a newly added deck's *full* listed quantity of every card into
   * the collection, regardless of what's already owned from elsewhere or
   * claimed by another deck - explicit user call: duplicates across decks
   * are fine as long as the collection ends up reflecting the full,
   * physical card pool across every deck added (including ones added by
   * pasting/importing a list, not just the precon browser - e.g. "Political
   * Trickery (Game Night 2022)", a real boxed product someone would import
   * rather than pull from the precon library, previously came up short on
   * Counterspell/Pull from Tomorrow because an *other* deck's own need for
   * the same card silently absorbed the "already owned" copies instead of
   * this deck getting its own). Used by every deck-adding path
   * (addPreconDeck/importDeck/addArchetypeDeck) - a plain top-up (only
   * granting the shortfall against a shared pool) used to be the behavior
   * for anything other than a precon, which is exactly what caused this.
   */
  private async grantAllCards(cards: Array<{ cardId: string; quantity: number }>): Promise<void> {
    const isMtg = this.gameService.currentSlug() === 'mtg';
    const resolvedCards = isMtg ? await this.gameService.cardApi().getCardsByIds(cards.map((card) => card.cardId)) : [];
    const oracleIdByCardId = new Map(resolvedCards.map((card) => [card.id, card.oracleId]));

    const collectionInputs: AddCardInput[] = cards.map((card) => ({
      cardId: card.cardId,
      quantity: card.quantity,
      foil: false,
      condition: 'NM',
      oracleId: oracleIdByCardId.get(card.cardId) ?? null,
    }));
    await this.collectionService.addCardsOrThrow(collectionInputs);
  }

  /**
   * Grants only the *shortfall* of a newly added deck's cards - the
   * "build from what I already own" counterpart to grantAllCards, used for
   * importDeck/addArchetypeDeck when the "Alle Karten vorhanden" checkbox
   * is left unchecked (this deck isn't a claim on a sealed physical
   * product, just a decklist to assemble). A card already free (owned
   * minus whatever's committed to the user's *other* decks) counts toward
   * this deck's need instead of adding a redundant copy; only what's left
   * short gets added. `deckId` is the just-created deck's own id, excluded
   * from "assigned elsewhere" so its own freshly-inserted deck_cards rows
   * don't count against themselves.
   */
  private async grantMissingCards(deckId: string, cards: Array<{ cardId: string; quantity: number }>): Promise<void> {
    const isMtg = this.gameService.currentSlug() === 'mtg';
    const resolvedCards = isMtg ? await this.gameService.cardApi().getCardsByIds(cards.map((card) => card.cardId)) : [];
    const oracleIdByCardId = new Map(resolvedCards.map((card) => [card.id, card.oracleId]));

    const [ownedByCardId, ownedByOracle, allDecks] = await Promise.all([
      this.collectionService.getQuantitiesByCardId(),
      this.collectionService.getQuantitiesByOracleId(),
      this.getMyDecks(),
    ]);
    const { byCardId: assignedByCardId, byOracleId: assignedByOracle } = buildAssignedElsewhereMaps(allDecks, deckId);

    const collectionInputs: AddCardInput[] = [];
    for (const card of cards) {
      const oracleId = oracleIdByCardId.get(card.cardId) ?? null;
      const cardRef = { cardId: card.cardId, oracleId };
      const owned = getOwnedQuantity(cardRef, ownedByCardId, ownedByOracle);
      const assignedElsewhere = getOwnedQuantity(cardRef, assignedByCardId, assignedByOracle);
      const free = Math.max(0, owned - assignedElsewhere);
      const shortfall = card.quantity - free;
      if (shortfall <= 0) continue;
      collectionInputs.push({ cardId: card.cardId, quantity: shortfall, foil: false, condition: 'NM', oracleId });
    }

    if (collectionInputs.length > 0) {
      await this.collectionService.addCardsOrThrow(collectionInputs);
    }
  }

  /**
   * Deletes a deck. By default its cards stay in the collection untouched -
   * a deck is just a list, not a claim on physical cards the user might
   * still want. When `removeCards` is set (the deck-detail dialog's opt-in
   * checkbox), also takes each of the deck's cards back out of the
   * collection - but never more than is actually *free*: a card also
   * required by one of the user's other decks (is_assigned there) is left
   * alone, the same "available" math grantMissingCards uses when adding a
   * deck. Skipping this used to be a real data-loss bug - deleting one deck
   * would blindly drain a shared card's collection stock by this deck's own
   * needed quantity, silently starving every other deck that also listed
   * it (e.g. a Sol Ring shared with an untouched precon), with no way to
   * tell afterwards which deck "took" the missing copies.
   */
  async deleteDeck(deckId: string, removeCards = false): Promise<void> {
    let reductions: Array<{ cardId: string; quantity: number }> = [];
    if (removeCards) {
      const [{ data: deckCards, error: cardsError }, ownedByCardId, ownedByOracle, allDecks] = await Promise.all([
        this.supabase.client
          .from('deck_cards')
          .select('card_id, quantity')
          .eq('deck_id', deckId)
          .returns<Array<{ card_id: string; quantity: number }>>(),
        this.collectionService.getQuantitiesByCardId(),
        this.collectionService.getQuantitiesByOracleId(),
        this.getMyDecks(),
      ]);
      if (cardsError) throw cardsError;

      const isMtg = this.gameService.currentSlug() === 'mtg';
      const resolvedCards = isMtg
        ? await this.gameService.cardApi().getCardsByIds((deckCards ?? []).map((row) => row.card_id))
        : [];
      const oracleIdByCardId = new Map(resolvedCards.map((card) => [card.id, card.oracleId]));
      // This deck's own rows still exist at this point (not deleted yet) -
      // excluding deckId keeps them from counting as "assigned elsewhere"
      // against themselves.
      const { byCardId: assignedByCardId, byOracleId: assignedByOracle } = buildAssignedElsewhereMaps(
        allDecks,
        deckId,
      );

      reductions = (deckCards ?? [])
        .map((row) => {
          const oracleId = oracleIdByCardId.get(row.card_id) ?? null;
          const cardRef = { cardId: row.card_id, oracleId };
          const owned = getOwnedQuantity(cardRef, ownedByCardId, ownedByOracle);
          const assignedElsewhere = getOwnedQuantity(cardRef, assignedByCardId, assignedByOracle);
          const freeToRemove = Math.max(0, owned - assignedElsewhere);
          return { cardId: row.card_id, quantity: Math.min(row.quantity, freeToRemove) };
        })
        .filter((reduction) => reduction.quantity > 0);
    }

    // Reduce the collection first: if this fails partway (one card's update
    // errors, the connection drops), the deck row is still there to retry
    // deletion against. Deleting the deck row first used to leave the
    // collection half-adjusted with nothing left to check it against or
    // retry from if this step then failed.
    if (reductions.length > 0) {
      await this.collectionService.reduceQuantities(reductions);
    }

    const { error } = await this.supabase.client.from('decks').delete().eq('id', deckId);
    if (error) throw error;
  }

  /** Manually frees a card from another deck's commitment (see deck-stats.ts's "assigned elsewhere" - the deck-detail dialog's "Freigeben" button) - the freed deck itself keeps the card in its list (still shows on its card grid), just no longer counts against its own completeness/availability elsewhere. `cardIds` covers every printing of the card that deck happens to list (see getAssignedElsewhereDecks), not just one. */
  async releaseAssignment(deckId: string, cardIds: string[]): Promise<void> {
    const { error } = await this.supabase.client
      .from('deck_cards')
      .update({ is_assigned: false })
      .eq('deck_id', deckId)
      .in('card_id', cardIds);
    if (error) throw error;
  }
}
