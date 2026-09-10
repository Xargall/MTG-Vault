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
  quantity: number;
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
  /** How many copies are needed - omit on a priority/notes-only update to leave the existing value untouched (upsert only writes columns it's given). Defaults to 1 for a fresh manual add. */
  quantity?: number;
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

  /** Manual "add to wishlist" entry point (see AddWishlistDialog) - unlike upsertEntry, bumps quantity on top of whatever is already there instead of resetting it to 1, so adding the same card a second time is reflected as "2 wanted" rather than silently staying at 1. */
  async addEntry({ cardId, priority, notes }: Omit<UpsertWishlistInput, 'quantity'>): Promise<void> {
    await this.gameService.ready;
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');
    const gameId = this.gameService.currentGameId();
    if (!gameId) throw new Error('Kein aktives Spiel.');

    const { data: existing, error: selectError } = await this.supabase.client
      .from('wishlist')
      .select('quantity')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('card_id', cardId)
      .maybeSingle<{ quantity: number }>();
    if (selectError) throw selectError;

    await this.upsertEntry({ cardId, priority, notes, quantity: (existing?.quantity ?? 0) + 1 });
  }

  async upsertEntry({ cardId, priority, notes, quantity }: UpsertWishlistInput): Promise<void> {
    await this.gameService.ready;
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');
    const gameId = this.gameService.currentGameId();
    if (!gameId) throw new Error('Kein aktives Spiel.');

    const { error } = await this.supabase.client.from('wishlist').upsert(
      {
        user_id: userId,
        game_id: gameId,
        card_id: cardId,
        priority,
        notes,
        // A priority/notes-only update (see Wishlist.updatePriority/updateNotes)
        // omits quantity entirely so the upsert's generated UPDATE SET clause
        // never touches the column - only a fresh add or a deck-derived
        // "missing to wishlist" call sets it explicitly.
        ...(quantity !== undefined ? { quantity } : {}),
      },
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
