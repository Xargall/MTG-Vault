import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';
import { ScryfallCard, ScryfallService } from '../../core/services/scryfall.service';

export interface WishlistRow {
  id: string;
  user_id: string;
  scryfall_id: string;
  priority: number;
  notes: string | null;
  created_at: string;
}

export interface WishlistEntry {
  row: WishlistRow;
  card: ScryfallCard;
}

export interface UpsertWishlistInput {
  scryfallId: string;
  priority: number;
  notes: string | null;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly supabase = inject(SupabaseService);
  private readonly scryfall = inject(ScryfallService);

  async getWishlist(): Promise<WishlistEntry[]> {
    const { data, error } = await this.supabase.client
      .from('wishlist')
      .select('*')
      .returns<WishlistRow[]>();

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const cards = await this.scryfall.getCardsByIds(data.map((row) => row.scryfall_id));
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    return data
      .map((row) => {
        const card = cardsById.get(row.scryfall_id);
        return card ? { row, card } : null;
      })
      .filter((entry): entry is WishlistEntry => entry !== null);
  }

  async getScryfallIds(): Promise<Set<string>> {
    const { data, error } = await this.supabase.client
      .from('wishlist')
      .select('scryfall_id')
      .returns<Array<{ scryfall_id: string }>>();

    if (error) throw error;
    return new Set((data ?? []).map((row) => row.scryfall_id));
  }

  async upsertEntry({ scryfallId, priority, notes }: UpsertWishlistInput): Promise<void> {
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');

    const { error } = await this.supabase.client
      .from('wishlist')
      .upsert(
        { user_id: userId, scryfall_id: scryfallId, priority, notes },
        { onConflict: 'user_id,scryfall_id' },
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
