import { Injectable, inject } from '@angular/core';

import { Card } from '../../core/models/card.model';
import { GameService } from '../../core/services/game.service';
import { SupabaseService } from '../../core/services/supabase.service';

export interface WishlistRow {
  id: string;
  user_id: string;
  game_id: string;
  card_id: string;
  priority: number;
  notes: string | null;
  created_at: string;
}

export interface WishlistEntry {
  row: WishlistRow;
  card: Card;
}

export interface UpsertWishlistInput {
  cardId: string;
  priority: number;
  notes: string | null;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly supabase = inject(SupabaseService);
  private readonly gameService = inject(GameService);

  async getWishlist(): Promise<WishlistEntry[]> {
    await this.gameService.ready;
    const gameId = this.gameService.currentGameId();
    if (!gameId) return [];

    const { data, error } = await this.supabase.client
      .from('wishlist')
      .select('*')
      .eq('game_id', gameId)
      .returns<WishlistRow[]>();

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const cards = await this.gameService.cardApi().getCardsByIds(data.map((row) => row.card_id));
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    return data
      .map((row) => {
        const card = cardsById.get(row.card_id);
        return card ? { row, card } : null;
      })
      .filter((entry): entry is WishlistEntry => entry !== null);
  }

  async getCardIds(): Promise<Set<string>> {
    await this.gameService.ready;
    const gameId = this.gameService.currentGameId();
    if (!gameId) return new Set();

    const { data, error } = await this.supabase.client
      .from('wishlist')
      .select('card_id')
      .eq('game_id', gameId)
      .returns<Array<{ card_id: string }>>();

    if (error) throw error;
    return new Set((data ?? []).map((row) => row.card_id));
  }

  async upsertEntry({ cardId, priority, notes }: UpsertWishlistInput): Promise<void> {
    await this.gameService.ready;
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');
    const gameId = this.gameService.currentGameId();
    if (!gameId) throw new Error('Kein aktives Spiel.');

    const { error } = await this.supabase.client
      .from('wishlist')
      .upsert(
        { user_id: userId, game_id: gameId, card_id: cardId, priority, notes },
        { onConflict: 'user_id,game_id,card_id' },
      );
    if (error) throw error;
  }

  async upsertMany(inputs: UpsertWishlistInput[]): Promise<void> {
    await Promise.all(inputs.map((input) => this.upsertEntry(input)));
  }

  async removeEntry(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('wishlist').delete().eq('id', id);
    if (error) throw error;
  }
}
