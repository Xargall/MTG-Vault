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
  // Scryfall's oracle_id, mirrored from the card at add-time - null for rows
  // added before this column existed, and always null for Yu-Gi-Oh/Pokémon
  // (see card.model.ts). Used to recognize a different printing of the same
  // card as a deck substitute (see deck-stats.ts).
  oracle_id: string | null;
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
  oracleId?: string | null;
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

    // Every lookup failing at once (e.g. Scryfall down and the local bulk
    // cache wasn't warm either - see MtgApiService.getCardsByIds) would
    // otherwise map to an empty array below, indistinguishable to every
    // caller (see hasCards in DashboardComponent) from a genuinely empty
    // collection - surfaced as a real error instead of a misleading "add
    // your first card" empty state. A partial failure is left alone; it
    // already degrades gracefully by just omitting the unresolved rows.
    if (data.length > 0 && cardsById.size === 0) {
      throw new Error('Kartendaten konnten nicht geladen werden. Bitte versuche es erneut.');
    }

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

  /** Same as getQuantitiesByCardId, keyed by oracle_id instead - rows added before that column existed (oracle_id null) are simply excluded, not bucketed under a fake key. Callers combine this with the card_id-keyed map so a legacy row still matches by its exact print. */
  async getQuantitiesByOracleId(): Promise<Map<string, number>> {
    await this.gameService.ready;
    const gameId = this.gameService.currentGameId();
    if (!gameId) return new Map();

    const { data, error } = await this.supabase.client
      .from('collection_cards')
      .select('oracle_id, quantity')
      .eq('game_id', gameId)
      .not('oracle_id', 'is', null)
      .returns<Array<{ oracle_id: string; quantity: number }>>();

    if (error) throw error;

    const totals = new Map<string, number>();
    for (const row of data ?? []) {
      totals.set(row.oracle_id, (totals.get(row.oracle_id) ?? 0) + row.quantity);
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
    oracleId = null,
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
      .select('id, quantity, oracle_id')
      .eq('game_id', gameId)
      .eq('card_id', cardId)
      .eq('foil', foil)
      .eq('finish', finish)
      .maybeSingle<{ id: string; quantity: number; oracle_id: string | null }>();

    if (selectError) throw selectError;

    if (existing) {
      const updatePayload = { quantity: existing.quantity + quantity, oracle_id: existing.oracle_id ?? oracleId };
      const { error } = await this.supabase.client
        .from('collection_cards')
        // Backfills oracle_id on a legacy row (added before this column
        // existed) the next time more copies of it are added, rather than
        // leaving it null forever - self-healing, no migration script needed.
        .update(updatePayload)
        .eq('id', existing.id);
      if (error) throw error;
      return;
    }

    const insertPayload = {
      user_id: userId,
      game_id: gameId,
      card_id: cardId,
      quantity,
      foil,
      condition,
      finish,
      card_category: cardCategory,
      oracle_id: oracleId,
    };
    const { error } = await this.supabase.client.from('collection_cards').insert(insertPayload);
    if (error) throw error;
  }

  /** Deletes one specific collection row (a single card/foil/condition stack), unlike removeCard() which drops every row for that card. */
  async deleteEntry(rowId: string): Promise<void> {
    const { error } = await this.supabase.client.from('collection_cards').delete().eq('id', rowId);
    if (error) throw error;
  }

  /** Manual correction of one collection row's own quantity/foil (see CardDetailDialog's edit form) - unlike addCards/reduceQuantities, sets these fields directly rather than incrementing/decrementing them. */
  async updateEntry(rowId: string, changes: { quantity?: number; foil?: boolean }): Promise<void> {
    const { error } = await this.supabase.client.from('collection_cards').update(changes).eq('id', rowId);
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

  /** Reverses a prior addCards grant (see DeckService.deleteDeck) - takes `quantity` copies of each card back out of the collection, never below what's actually there. A card_id can be stacked across several rows (foil/finish variants); the nonfoil stack is drained first since that's what deck grants always add to. */
  async reduceQuantities(cards: Array<{ cardId: string; quantity: number }>): Promise<void> {
    await this.gameService.ready;
    const gameId = this.gameService.currentGameId();
    if (!gameId) return;

    for (const { cardId, quantity } of cards) {
      let remaining = quantity;
      if (remaining <= 0) continue;

      const { data: rows, error } = await this.supabase.client
        .from('collection_cards')
        .select('id, quantity, foil')
        .eq('game_id', gameId)
        .eq('card_id', cardId)
        .returns<Array<{ id: string; quantity: number; foil: boolean }>>();
      if (error) throw error;
      if (!rows || rows.length === 0) continue;

      const ordered = [...rows].sort((a, b) => Number(a.foil) - Number(b.foil));
      for (const row of ordered) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, row.quantity);
        remaining -= take;
        if (take === row.quantity) {
          await this.deleteEntry(row.id);
        } else {
          const { error: updateError } = await this.supabase.client
            .from('collection_cards')
            .update({ quantity: row.quantity - take })
            .eq('id', row.id);
          if (updateError) throw updateError;
        }
      }
    }
  }
}
