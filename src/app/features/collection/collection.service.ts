import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../../core/services/supabase.service';
import { ScryfallCard, ScryfallService } from '../../core/services/scryfall.service';

export interface CollectionCardRow {
  id: string;
  user_id: string;
  scryfall_id: string;
  quantity: number;
  foil: boolean;
  condition: string;
  created_at: string;
}

export interface CollectionEntry {
  row: CollectionCardRow;
  card: ScryfallCard;
}

export interface AddCardInput {
  scryfallId: string;
  quantity: number;
  foil: boolean;
  condition: string;
}

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly supabase = inject(SupabaseService);
  private readonly scryfall = inject(ScryfallService);

  async getCollectionWithCardData(): Promise<CollectionEntry[]> {
    const { data, error } = await this.supabase.client
      .from('collection_cards')
      .select('*')
      .returns<CollectionCardRow[]>();

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const cards = await this.scryfall.getCardsByIds(data.map((row) => row.scryfall_id));
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    return data
      .map((row) => {
        const card = cardsById.get(row.scryfall_id);
        return card ? { row, card } : null;
      })
      .filter((entry): entry is CollectionEntry => entry !== null);
  }

  async getQuantitiesByScryfallId(): Promise<Map<string, number>> {
    const { data, error } = await this.supabase.client
      .from('collection_cards')
      .select('scryfall_id, quantity')
      .returns<Array<{ scryfall_id: string; quantity: number }>>();

    if (error) throw error;

    const totals = new Map<string, number>();
    for (const row of data ?? []) {
      totals.set(row.scryfall_id, (totals.get(row.scryfall_id) ?? 0) + row.quantity);
    }
    return totals;
  }

  async addCard(input: AddCardInput): Promise<void> {
    return this.upsertOne(input);
  }

  async addCards(inputs: AddCardInput[]): Promise<void> {
    await Promise.all(inputs.map((input) => this.upsertOne(input)));
  }

  private async upsertOne({ scryfallId, quantity, foil, condition }: AddCardInput): Promise<void> {
    const userId = this.supabase.session()?.user.id;
    if (!userId) throw new Error('Nicht eingeloggt.');

    const { data: existing, error: selectError } = await this.supabase.client
      .from('collection_cards')
      .select('id, quantity')
      .eq('scryfall_id', scryfallId)
      .eq('foil', foil)
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

    const { error } = await this.supabase.client
      .from('collection_cards')
      .insert({ user_id: userId, scryfall_id: scryfallId, quantity, foil, condition });
    if (error) throw error;
  }
}
