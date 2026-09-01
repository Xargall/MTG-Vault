import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';
import { ScryfallCard, ScryfallService } from '../../core/services/scryfall.service';
import { AddCardInput, CollectionService } from '../collection/collection.service';
import { MtgjsonDeckDetail } from '../../core/services/mtgjson.service';

export interface DeckRow {
  id: string;
  user_id: string;
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
  scryfall_id: string;
  quantity: number;
}

export interface DeckCardEntry {
  row: DeckCardRow;
  card: ScryfallCard;
}

export interface DeckEntry {
  deck: DeckRow;
  cards: DeckCardEntry[];
}

@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly supabase = inject(SupabaseService);
  private readonly scryfall = inject(ScryfallService);
  private readonly collectionService = inject(CollectionService);

  async getMyDecks(): Promise<DeckEntry[]> {
    const { data: decks, error: decksError } = await this.supabase.client
      .from('decks')
      .select('*')
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

    const cards = await this.scryfall.getCardsByIds(
      (deckCards ?? []).map((row) => row.scryfall_id),
    );
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    const cardsByDeck = new Map<string, DeckCardEntry[]>();
    for (const row of deckCards ?? []) {
      const card = cardsById.get(row.scryfall_id);
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
    mtgjsonType: string,
    releaseDate: string,
    fileName: string,
    detail: MtgjsonDeckDetail,
  ): Promise<void> {
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');

    const { data: deck, error: deckError } = await this.supabase.client
      .from('decks')
      .insert({
        user_id: userId,
        name,
        format: mtgjsonType,
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
        scryfall_id: card.scryfallId,
        quantity: card.quantity,
      })),
    );
    if (cardsError) throw cardsError;

    const owned = await this.collectionService.getQuantitiesByScryfallId();
    const collectionInputs: AddCardInput[] = detail.cards
      .map((card) => ({
        scryfallId: card.scryfallId,
        quantity: card.quantity - (owned.get(card.scryfallId) ?? 0),
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
