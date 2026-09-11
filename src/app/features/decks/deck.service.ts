import { Injectable, inject } from '@angular/core';

import { Card } from '../../core/models/card.model';
import { PreconDetail } from '../../core/models/precon.model';
import { GameService } from '../../core/services/game.service';
import { MtgBulkDataService } from '../../core/services/mtg-bulk-data.service';
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
  private readonly mtgBulkData = inject(MtgBulkDataService);

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
   * owns" it. Resolves each card's oracle_id from the local bulk-data cache
   * (no Scryfall call at all - the /cards/collection endpoint this used to
   * call for exactly this has no CORS support for a plain browser POST) so
   * a basic land or reprint already owned under a *different* printing
   * correctly counts as owned here too, instead of granting a redundant
   * duplicate.
   */
  private async grantMissingCards(deckId: string, cards: Array<{ cardId: string; quantity: number }>): Promise<void> {
    const isMtg = this.gameService.currentSlug() === 'mtg';
    const [ownedByCardId, ownedByOracle, allDecks] = await Promise.all([
      this.collectionService.getQuantitiesByCardId(),
      this.collectionService.getQuantitiesByOracleId(),
      this.getMyDecks(),
    ]);
    // Excludes this deck's own just-inserted rows - only *other* decks'
    // claims should shrink what's available to grant here.
    const { byCardId: assignedByCardId, byOracleId: assignedByOracle } = buildAssignedElsewhereMaps(
      allDecks,
      deckId,
    );

    const collectionInputs = (
      await Promise.all(
        cards.map(async (card) => {
          // oracle_id is a Scryfall/MTG-only concept (see card.model.ts) -
          // no lookup at all for other games, same as everywhere else.
          const bulkMatch = isMtg ? await this.mtgBulkData.findById(card.cardId) : null;
          const oracleId = bulkMatch?.oracle_id ?? null;
          const cardRef = { cardId: card.cardId, oracleId };
          const owned = getOwnedQuantity(cardRef, ownedByCardId, ownedByOracle);
          const assignedElsewhere = getOwnedQuantity(cardRef, assignedByCardId, assignedByOracle);
          const available = Math.max(0, owned - assignedElsewhere);
          const input: AddCardInput = {
            cardId: card.cardId,
            quantity: card.quantity - available,
            foil: false,
            condition: 'NM',
            oracleId,
          };
          return input;
        }),
      )
    ).filter((input) => input.quantity > 0);

    if (collectionInputs.length > 0) {
      await this.collectionService.addCards(collectionInputs);
    }
  }

  /**
   * Deleting a deck releases the collection copies that were granted for it
   * on import, so a shared card (see grantMissingCards) becomes available
   * for another deck again and a later re-import of the same deck doesn't
   * find it "already owned" and skip granting its own copy back.
   */
  async deleteDeck(deckId: string): Promise<void> {
    const { data: deckCards, error: cardsError } = await this.supabase.client
      .from('deck_cards')
      .select('card_id, quantity')
      .eq('deck_id', deckId)
      .returns<Array<{ card_id: string; quantity: number }>>();
    if (cardsError) throw cardsError;

    const { error } = await this.supabase.client.from('decks').delete().eq('id', deckId);
    if (error) throw error;

    if (deckCards && deckCards.length > 0) {
      await this.collectionService.reduceQuantities(
        deckCards.map((row) => ({ cardId: row.card_id, quantity: row.quantity })),
      );
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
