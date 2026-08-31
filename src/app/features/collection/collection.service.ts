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
}
