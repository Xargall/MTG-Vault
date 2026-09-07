import { Injectable, inject } from '@angular/core';

import { Card } from '../../core/models/card.model';
import { GameService } from '../../core/services/game.service';
import { SupabaseService } from '../../core/services/supabase.service';

export interface CollectionCardRow {
  id: string;
  user_id: string;
  game_id: string;
  card_id: string;
  quantity: number;
  foil: boolean;
  // 'nonfoil' | 'foil' | 'halo' | 'etched' - independent of the `foil`
  // boolean above (kept as-is for the existing foil toggle/pricing), added
  // specifically so a halo-finish scan isn't misrepresented as a plain foil.
  finish: string;
  // 'normal' | 'token' | 'special' - drives the collection's "✨ Specials"
  // bucket (see card-category-stats.ts); set at add-time from the scanner's
  // parsed collector-number flags, not recomputed from the card afterward.
  card_category: string;
  condition: string;
  created_at: string;
}

export interface CollectionEntry {
  row: CollectionCardRow;
  card: Card;
}

export interface AddCardInput {
  cardId: string;
  quantity: number;
  foil: boolean;
  condition: string;
  finish?: string;
  cardCategory?: string;
}

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly supabase = inject(SupabaseService);
  private readonly gameService = inject(GameService);

  async getCollectionWithCardData(): Promise<CollectionEntry[]> {
    await this.gameService.ready;
    const gameId = this.gameService.currentGameId();
    if (!gameId) return [];

    const { data, error } = await this.supabase.client
      .from('collection_cards')
      .select('*')
      .eq('game_id', gameId)
      .returns<CollectionCardRow[]>();

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const cards = await this.gameService.cardApi().getCardsByIds(data.map((row) => row.card_id));
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    return data
      .map((row) => {
        const card = cardsById.get(row.card_id);
        return card ? { row, card } : null;
      })
      .filter((entry): entry is CollectionEntry => entry !== null);
  }

  async getQuantitiesByCardId(): Promise<Map<string, number>> {
    await this.gameService.ready;
    const gameId = this.gameService.currentGameId();
    if (!gameId) return new Map();

    const { data, error } = await this.supabase.client
      .from('collection_cards')
      .select('card_id, quantity')
      .eq('game_id', gameId)
      .returns<Array<{ card_id: string; quantity: number }>>();

    if (error) throw error;

    const totals = new Map<string, number>();
    for (const row of data ?? []) {
      totals.set(row.card_id, (totals.get(row.card_id) ?? 0) + row.quantity);
    }
    return totals;
  }

  /** Card totals across every game at once (not scoped to the currently active game) - used by the game-selection screen to show "X Karten in Sammlung" per tile. */
  async getQuantityTotalsByGame(): Promise<Map<string, number>> {
    const { data, error } = await this.supabase.client
      .from('collection_cards')
      .select('game_id, quantity')
      .returns<Array<{ game_id: string; quantity: number }>>();

    if (error) throw error;

    const totals = new Map<string, number>();
    for (const row of data ?? []) {
      totals.set(row.game_id, (totals.get(row.game_id) ?? 0) + row.quantity);
    }
    return totals;
  }

  async addCard(input: AddCardInput): Promise<void> {
    return this.upsertOne(input);
  }

  async addCards(inputs: AddCardInput[]): Promise<void> {
    await Promise.all(inputs.map((input) => this.upsertOne(input)));
  }

  private async upsertOne({
    cardId,
    quantity,
    foil,
    condition,
    finish = 'nonfoil',
    cardCategory = 'normal',
  }: AddCardInput): Promise<void> {
    await this.gameService.ready;
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');
    const gameId = this.gameService.currentGameId();
    if (!gameId) throw new Error('Kein aktives Spiel.');

    // `finish` is part of the match, not just `foil` - a halo copy of a
    // card must stack separately from a nonfoil copy of the same card_id,
    // even though both have foil=false.
    const { data: existing, error: selectError } = await this.supabase.client
      .from('collection_cards')
      .select('id, quantity')
      .eq('game_id', gameId)
      .eq('card_id', cardId)
      .eq('foil', foil)
      .eq('finish', finish)
      .maybeSingle<{ id: string; quantity: number }>();

    if (selectError) throw selectError;

    if (existing) {
      const { error } = await this.supabase.client
        .from('collection_cards')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await this.supabase.client.from('collection_cards').insert({
      user_id: userId,
      game_id: gameId,
      card_id: cardId,
      quantity,
      foil,
      condition,
      finish,
      card_category: cardCategory,
    });
    if (error) throw error;
  }

  /** Deletes one specific collection row (a single card/foil/condition stack), unlike removeCard() which drops every row for that card. */
  async deleteEntry(rowId: string): Promise<void> {
    const { error } = await this.supabase.client.from('collection_cards').delete().eq('id', rowId);
    if (error) throw error;
  }

  async removeCard(cardId: string): Promise<void> {
    await this.gameService.ready;
    const gameId = this.gameService.currentGameId();
    if (!gameId) return;

    const { error } = await this.supabase.client
      .from('collection_cards')
      .delete()
      .eq('game_id', gameId)
      .eq('card_id', cardId);
    if (error) throw error;
  }
}
