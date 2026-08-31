import { Injectable } from '@angular/core';

export interface MtgjsonDeckListEntry {
  code: string;
  fileName: string;
  name: string;
  releaseDate: string;
  type: string;
}

export interface MtgjsonResolvedCard {
  scryfallId: string;
  quantity: number;
}

export interface MtgjsonDeckDetail {
  heroScryfallId: string | null;
  cards: MtgjsonResolvedCard[];
  skippedCount: number;
}

interface MtgjsonDeckCard {
  name: string;
  count: number;
  identifiers?: { scryfallId?: string };
}

interface MtgjsonDeckJson {
  commander: MtgjsonDeckCard[];
  mainBoard: MtgjsonDeckCard[];
}

export const PRECON_TYPES = [
  'Commander Deck',
  'Duel Deck',
  'Planeswalker Deck',
  'Starter Deck',
  'Starter Kit',
  'Intro Pack',
  'Welcome Deck',
  'Welcome Booster',
  'Game Night Deck',
  'Challenger Deck',
  'Event Deck',
  'Archenemy Deck',
  'Planechase Deck',
  'Brawl Deck',
  'Historic Brawl Precon Deck',
  'Guild Kit',
  'Clash Pack',
  'Theme Deck',
  'World Championship Deck',
  'Pioneer Challenger Deck',
  'Premium Deck',
];

const DECK_LIST_ENDPOINT = 'https://mtgjson.com/api/v5/DeckList.json';
const DECK_ENDPOINT = 'https://mtgjson.com/api/v5/decks';

@Injectable({ providedIn: 'root' })
export class MtgjsonService {
  private deckListCache: Promise<MtgjsonDeckListEntry[]> | null = null;
  private readonly deckJsonCache = new Map<string, Promise<MtgjsonDeckJson>>();

  getDeckList(): Promise<MtgjsonDeckListEntry[]> {
    if (!this.deckListCache) {
      this.deckListCache = this.fetchDeckList();
    }
    return this.deckListCache;
  }

  private async fetchDeckList(): Promise<MtgjsonDeckListEntry[]> {
    const response = await fetch(DECK_LIST_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Deck-Liste konnte nicht geladen werden (${response.status})`);
    }
    const body: { data: MtgjsonDeckListEntry[] } = await response.json();
    const preconTypes = new Set(PRECON_TYPES);
    return body.data.filter((entry) => preconTypes.has(entry.type));
  }

  private getDeckJson(fileName: string): Promise<MtgjsonDeckJson> {
    let cached = this.deckJsonCache.get(fileName);
    if (!cached) {
      cached = this.fetchDeckJson(fileName);
      this.deckJsonCache.set(fileName, cached);
    }
    return cached;
  }

  private async fetchDeckJson(fileName: string): Promise<MtgjsonDeckJson> {
    const response = await fetch(`${DECK_ENDPOINT}/${fileName}.json`);
    if (!response.ok) {
      throw new Error(`Deck konnte nicht geladen werden (${response.status})`);
    }
    const body: { data: MtgjsonDeckJson } = await response.json();
    return body.data;
  }

  async getDeckDetail(fileName: string): Promise<MtgjsonDeckDetail> {
    const deck = await this.getDeckJson(fileName);

    const quantities = new Map<string, number>();
    let skippedCount = 0;

    for (const entry of [...deck.commander, ...deck.mainBoard]) {
      const scryfallId = entry.identifiers?.scryfallId;
      if (!scryfallId) {
        skippedCount += 1;
        continue;
      }
      quantities.set(scryfallId, (quantities.get(scryfallId) ?? 0) + entry.count);
    }

    const heroScryfallId =
      deck.commander[0]?.identifiers?.scryfallId ?? deck.mainBoard[0]?.identifiers?.scryfallId ?? null;

    const cards: MtgjsonResolvedCard[] = [...quantities.entries()].map(([scryfallId, quantity]) => ({
      scryfallId,
      quantity,
    }));

    return { heroScryfallId, cards, skippedCount };
  }

  async getDeckCardNames(fileName: string): Promise<string[]> {
    const deck = await this.getDeckJson(fileName);
    const names = new Set<string>();
    for (const card of [...deck.commander, ...deck.mainBoard]) {
      names.add(card.name);
    }
    return [...names];
  }
}
