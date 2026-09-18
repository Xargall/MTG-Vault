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
  release_date: string | null;
  mtgjson_file_name: string | null;
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

    const { data: deckCards, error: cardsError } = await this.supabase.client
      .from('deck_cards')
      .select('*')
      .in(
        'deck_id',
        decks.map((deck) => deck.id),
      )
      .returns<DeckCardRow[]>();

    if (cardsError) throw cardsError;

    const cards = await this.gameService
      .cardApi()
      .getCardsByIds((deckCards ?? []).map((row) => row.card_id));
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    const cardsByDeck = new Map<string, DeckCardEntry[]>();
    for (const row of deckCards ?? []) {
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

    const { data: deck, error: deckError } = await this.supabase.client
      .from('decks')
      .insert({
        user_id: userId,
        game_id: gameId,
        name,
        format: type,
        is_precon: true,
        release_date: releaseDate,
        mtgjson_file_name: fileName,
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

    await this.grantMissingCards(deck.id, detail.cards);
  }

  /** Deck built from a pasted card list (see DeckImportDialog) rather than a bundled precon. */
  async importDeck(name: string, cards: Array<{ cardId: string; quantity: number }>): Promise<void> {
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
        release_date: null,
        mtgjson_file_name: null,
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

    await this.grantMissingCards(deck.id, cards);
  }

  /** Deck built from a computed average-decklist (EDHREC for Commander via CommanderRecommendationsDialog, Moxfield for 60-card formats via FormatDeckRecommendationsDialog) - same shape/side effects as importDeck (grants any missing cards into the collection), just tagged with the given format instead of a free-text one. */
  async addArchetypeDeck(
    name: string,
    format: string,
    cards: Array<{ cardId: string; quantity: number }>,
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
        release_date: null,
        mtgjson_file_name: null,
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

    await this.grantMissingCards(deck.id, cards);
  }

  /** Thin wrapper around addArchetypeDeck for the Commander case - kept as its own method since CommanderRecommendationsDialog already calls it by this name. */
  addEdhrecDeck(commanderName: string, cards: Array<{ cardId: string; quantity: number }>): Promise<void> {
    return this.addArchetypeDeck(commanderName, 'Commander', cards);
  }

  /**
   * Grants any not-yet-*available* copies of a newly added deck's cards into
   * the collection - shared by addPreconDeck/importDeck/addEdhrecDeck.
   * "Available" excludes copies already committed to another of the user's
   * decks (see deck-stats.ts's assigned-elsewhere maps) - otherwise a card
   * shared across several decks (e.g. Howling Golem across every Game Night
   * 2022 precon) only ever gets granted once, leaving every later deck
   * short a copy it needs of its own even though the first deck "already
   * owns" it. Resolves each card's oracle_id via the card API (scryfall_cards
   * for MTG) - previously went through MtgBulkDataService's local IndexedDB
   * cache instead (built for the offline scanner), which returns null for
   * anything it hasn't downloaded/refreshed yet. Live-confirmed on a
   * recently-released set (Final Fantasy): oracle_id came back null for
   * every card of a deck added this way, so none of those collection rows
   * ever counted as "owned" via oracle_id afterwards - only a same-printing
   * or name match still caught them, and OracleIdBackfillService (see its
   * own doc comment) treats a bulk-cache miss as permanent, so a row like
   * that never got a second chance either. scryfall_cards is kept fully
   * synced server-side now (see the daily sync workflow), so there's no
   * reason to depend on a giant, separately-refreshed local cache just to
   * look up an id this table already has.
   */
  private async grantMissingCards(deckId: string, cards: Array<{ cardId: string; quantity: number }>): Promise<void> {
    const isMtg = this.gameService.currentSlug() === 'mtg';
    const [ownedByCardId, ownedByOracle, allDecks, resolvedCards] = await Promise.all([
      this.collectionService.getQuantitiesByCardId(),
      this.collectionService.getQuantitiesByOracleId(),
      this.getMyDecks(),
      // oracle_id is a Scryfall/MTG-only concept (see card.model.ts) - no
      // lookup at all for other games, same as everywhere else.
      isMtg ? this.gameService.cardApi().getCardsByIds(cards.map((card) => card.cardId)) : Promise.resolve([]),
    ]);
    const oracleIdByCardId = new Map(resolvedCards.map((card) => [card.id, card.oracleId]));
    // Excludes this deck's own just-inserted rows - only *other* decks'
    // claims should shrink what's available to grant here.
    const { byCardId: assignedByCardId, byOracleId: assignedByOracle } = buildAssignedElsewhereMaps(
      allDecks,
      deckId,
    );

    const collectionInputs = cards
      .map((card): AddCardInput => {
        const oracleId = oracleIdByCardId.get(card.cardId) ?? null;
        const cardRef = { cardId: card.cardId, oracleId };
        const owned = getOwnedQuantity(cardRef, ownedByCardId, ownedByOracle);
        const assignedElsewhere = getOwnedQuantity(cardRef, assignedByCardId, assignedByOracle);
        const available = Math.max(0, owned - assignedElsewhere);
        return { cardId: card.cardId, quantity: card.quantity - available, foil: false, condition: 'NM', oracleId };
      })
      .filter((input) => input.quantity > 0);

    if (collectionInputs.length > 0) {
      await this.collectionService.addCards(collectionInputs);
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

    const { error } = await this.supabase.client.from('decks').delete().eq('id', deckId);
    if (error) throw error;

    if (reductions.length > 0) {
      await this.collectionService.reduceQuantities(reductions);
    }
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
