import { Injectable, inject } from '@angular/core';

import { Card } from '../../core/models/card.model';
import { PreconDetail } from '../../core/models/precon.model';
import { GameService } from '../../core/services/game.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { AddCardInput, CollectionService } from '../collection/collection.service';

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

    const owned = await this.collectionService.getQuantitiesByCardId();
    const collectionInputs: AddCardInput[] = detail.cards
      .map((card) => ({
        cardId: card.cardId,
        quantity: card.quantity - (owned.get(card.cardId) ?? 0),
        foil: false,
        condition: 'NM',
      }))
      .filter((input) => input.quantity > 0);

    if (collectionInputs.length > 0) {
      await this.collectionService.addCards(collectionInputs);
    }
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

    const owned = await this.collectionService.getQuantitiesByCardId();
    const collectionInputs: AddCardInput[] = cards
      .map((card) => ({
        cardId: card.cardId,
        quantity: card.quantity - (owned.get(card.cardId) ?? 0),
        foil: false,
        condition: 'NM',
      }))
      .filter((input) => input.quantity > 0);

    if (collectionInputs.length > 0) {
      await this.collectionService.addCards(collectionInputs);
    }
  }

  /** Deck built from an EDHREC average-decklist (see CommanderRecommendationsDialog) - same shape/side effects as importDeck (grants any missing cards into the collection), just tagged with a fixed 'Commander' format instead of a free-text one. */
  async addEdhrecDeck(commanderName: string, cards: Array<{ cardId: string; quantity: number }>): Promise<void> {
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
        name: commanderName,
        format: 'Commander',
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

    const owned = await this.collectionService.getQuantitiesByCardId();
    const collectionInputs: AddCardInput[] = cards
      .map((card) => ({
        cardId: card.cardId,
        quantity: card.quantity - (owned.get(card.cardId) ?? 0),
        foil: false,
        condition: 'NM',
      }))
      .filter((input) => input.quantity > 0);

    if (collectionInputs.length > 0) {
      await this.collectionService.addCards(collectionInputs);
    }
  }

  async deleteDeck(deckId: string): Promise<void> {
    const { error } = await this.supabase.client.from('decks').delete().eq('id', deckId);
    if (error) throw error;
  }
}
