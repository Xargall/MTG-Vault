import { Injectable } from '@angular/core';

import { PreconDeckProvider, PreconDetail, PreconIndexData, PreconListEntry } from '../models/precon.model';

interface YgoCardSet {
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date: string;
  set_image: string;
}

interface YgoPreconCard {
  id: number;
  name: string;
  card_sets?: Array<{ set_name: string }>;
}

const CARD_SETS_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardsets.php';
const CARD_INFO_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

// Covers every preconstructed-deck product YGOPRODeck lists, not just the
// two most common lines - verified live against the full cardsets.php
// response (2026-10-30): Structure/Starter Decks, the multi-deck "Legendary
// ... Decks" boxes (Yugi's Legendary Decks, Legendary Hero Decks, Legendary
// Decks II, ...), Egyptian God Decks, Speed Duel Starter/Demo Decks, Demo
// Decks and the foil Chronicles Decks all have "deck(s)" as a standalone
// word in set_name; nothing else in the live set list does.
function classifyPreconType(setName: string): string {
  if (/legendary.*decks?\b/i.test(setName)) return 'Legendary Decks';
  if (/egyptian god deck/i.test(setName)) return 'Egyptian God Deck';
  if (/chronicles deck/i.test(setName)) return 'Chronicles Deck';
  if (/demo deck/i.test(setName)) return 'Demo Deck';
  if (/starter deck/i.test(setName)) return 'Starter Deck';
  return 'Structure Deck';
}

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
      .filter((set) => /\bdecks?\b/i.test(set.set_name))
      .map((set) => ({
        fileName: set.set_name,
        name: set.set_name,
        type: classifyPreconType(set.set_name),
        releaseDate: set.tcg_date ?? '',
        bannerImageUrl: set.set_image ?? null,
      }));
  }

  async getDeckDetail(fileName: string): Promise<PreconDetail> {
    const { heroCardId, cards, skippedCount } = await this.getDeckIndexData(fileName);
    return { heroCardId, commanderCardId: null, cards, skippedCount };
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
    const body: { data: YgoPreconCard[] } = await response.json();

    const names = body.data.map((card) => card.name);
    // `cardinfo.php?cardset=` lists every card in the set once, even when
    // it physically appears several times (either several copies in one
    // deck, or - for a multi-deck box like Yugi's Legendary Decks - spread
    // across more than one of the box's sub-decks) - the real per-card
    // copy count is how many of that card's own `card_sets` entries name
    // this exact set (verified live, 2026-10-30: "Starter Deck: Yugi"
    // reports 50 unique cards but 95 such entries, matching its documented
    // 95-card real total; "Yugi's Legendary Decks" reports 105 unique names
    // but 125, matching its three 41/42-card sub-decks combined).
    const cards = body.data.map((card) => {
      const quantity = card.card_sets?.filter((set) => set.set_name === fileName).length ?? 0;
      return { cardId: String(card.id), quantity: quantity || 1 };
    });
    const heroCardId = cards[0]?.cardId ?? null;

    return { names, heroCardId, commanderCardId: null, cards, skippedCount: 0 };
  }
}
