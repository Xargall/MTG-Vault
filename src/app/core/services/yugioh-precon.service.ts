import { Injectable } from '@angular/core';

import { PreconDeckProvider, PreconDetail, PreconIndexData, PreconListEntry } from '../models/precon.model';

interface YgoCardSet {
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date: string;
  set_image: string;
}

const CARD_SETS_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardsets.php';
const CARD_INFO_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

// `set_code` is not a unique key across precon-style sets (e.g. a 2-player
// starter box and its two individually-named half-decks can share one
// product code) - `set_name` is verified unique and doubles as the exact
// `cardset` query value, so it's used as the stable id/`fileName`.
@Injectable({ providedIn: 'root' })
export class YugiohPreconService implements PreconDeckProvider {
  private listCache: Promise<PreconListEntry[]> | null = null;
  private readonly detailCache = new Map<string, Promise<PreconIndexData>>();

  getDeckList(): Promise<PreconListEntry[]> {
    if (!this.listCache) {
      this.listCache = this.fetchList();
    }
    return this.listCache;
  }

  private async fetchList(): Promise<PreconListEntry[]> {
    const response = await fetch(CARD_SETS_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Set-Liste konnte nicht geladen werden (${response.status})`);
    }
    const sets: YgoCardSet[] = await response.json();

    return sets
      .filter((set) => /\b(structure deck|starter deck)\b/i.test(set.set_name))
      .map((set) => ({
        fileName: set.set_name,
        name: set.set_name,
        type: /starter deck/i.test(set.set_name) ? 'Starter Deck' : 'Structure Deck',
        releaseDate: set.tcg_date ?? '',
        bannerImageUrl: set.set_image ?? null,
      }));
  }

  async getDeckDetail(fileName: string): Promise<PreconDetail> {
    const { heroCardId, cards, skippedCount } = await this.getDeckIndexData(fileName);
    return { heroCardId, cards, skippedCount };
  }

  getDeckIndexData(fileName: string): Promise<PreconIndexData> {
    let cached = this.detailCache.get(fileName);
    if (!cached) {
      cached = this.fetchDetail(fileName);
      this.detailCache.set(fileName, cached);
    }
    return cached;
  }

  private async fetchDetail(fileName: string): Promise<PreconIndexData> {
    const response = await fetch(`${CARD_INFO_ENDPOINT}?cardset=${encodeURIComponent(fileName)}`);
    if (!response.ok) {
      throw new Error(`Deck konnte nicht geladen werden (${response.status})`);
    }
    const body: { data: Array<{ id: number; name: string }> } = await response.json();

    const names = body.data.map((card) => card.name);
    // The API only reports which cards are in a set, not how many copies -
    // every card is recorded once, so quantity is a documented
    // approximation, not a measured value.
    const cards = body.data.map((card) => ({ cardId: String(card.id), quantity: 1 }));
    const heroCardId = cards[0]?.cardId ?? null;

    return { names, heroCardId, cards, skippedCount: 0 };
  }
}
