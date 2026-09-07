import { Injectable } from '@angular/core';

import { Card, PokemonCard, PokemonSupertype } from '../models/card.model';
import { cleanOcrText, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification } from './card-api.interface';

const IDENTIFY_CONFIDENCE_THRESHOLD = 0.8;
// TCGdex's name search has no result cap and returns every printing across
// every set for a common name (Pikachu alone is 100+) - the search list
// endpoint is brief (id/localId/name only), so each result needs its own
// follow-up request to hydrate into a full Card. Capping here keeps a
// search from firing dozens of requests; identifyCard doesn't need this at
// all since it only ever hydrates its single winning match (see below).
const MAX_SEARCH_RESULTS = 24;
const HYDRATE_CONCURRENCY = 6;

interface TcgdexBriefCard {
  id: string;
  localId: string;
  name: string;
}

interface TcgdexPriceVariant {
  marketPrice?: number;
}

interface TcgdexRawCard {
  id: string;
  name: string;
  image?: string;
  category: PokemonSupertype;
  rarity?: string;
  set?: { name: string };
  types?: string[];
  hp?: number;
  evolveFrom?: string;
  pricing?: {
    cardmarket?: { trend?: number; avg?: number };
    // Keyed by variant ("normal", "holofoil", "reverseHolofoil", ...) plus
    // fixed "unit"/"updated" metadata fields - only the variant entries are
    // objects with a marketPrice, so picking the first one found is enough.
    tcgplayer?: Record<string, TcgdexPriceVariant | string | undefined>;
  };
}

const API_BASE = 'https://api.tcgdex.net/v2/de';

/** Runs `mapper` over `items` with at most `limit` calls in flight at once - TCGdex has no batch/collection endpoint (unlike Scryfall), so hydrating several cards means several individual requests. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await mapper(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

@Injectable({ providedIn: 'root' })
export class PokemonApiService implements CardApiService {
  async searchCards(query: string): Promise<Card[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const brief = await this.fetchBrief(trimmed);
    const capped = brief.slice(0, MAX_SEARCH_RESULTS);
    const raw = await mapWithConcurrency(capped, HYDRATE_CONCURRENCY, (entry) => this.fetchDetail(entry.id));
    return raw.filter((c): c is TcgdexRawCard => c !== null).map((c) => this.toCard(c));
  }

  async getCard(id: string): Promise<Card | null> {
    const raw = await this.fetchDetail(id);
    return raw ? this.toCard(raw) : null;
  }

  async getCardsByIds(ids: string[]): Promise<Card[]> {
    if (ids.length === 0) return [];
    const raw = await mapWithConcurrency(ids, HYDRATE_CONCURRENCY, (id) => this.fetchDetail(id));
    return raw.filter((c): c is TcgdexRawCard => c !== null).map((c) => this.toCard(c));
  }

  async getCardsByNames(names: string[]): Promise<Card[]> {
    if (names.length === 0) return [];
    const resolved = await Promise.all(names.map((name) => this.identifyCard(name)));
    return resolved.filter((r): r is CardIdentification => r !== null).map((r) => r.card);
  }

  async getPrints(name: string): Promise<Card[]> {
    return this.searchCards(name);
  }

  async identifyCard(rawText: string): Promise<CardIdentification | null> {
    const cleaned = cleanOcrText(rawText);
    if (!cleaned) return null;

    const brief = await this.fetchBrief(cleaned);
    let best: { entry: TcgdexBriefCard; confidence: number } | null = null;
    for (const entry of brief) {
      const confidence = similarity(cleaned, entry.name);
      if (!best || confidence > best.confidence) {
        best = { entry, confidence };
      }
    }

    if (!best || best.confidence < IDENTIFY_CONFIDENCE_THRESHOLD) return null;

    const raw = await this.fetchDetail(best.entry.id);
    if (!raw) return null;
    return { card: this.toCard(raw), confidence: best.confidence };
  }

  private async fetchBrief(name: string): Promise<TcgdexBriefCard[]> {
    const response = await fetch(`${API_BASE}/cards?name=${encodeURIComponent(name)}`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`TCGdex-Anfrage fehlgeschlagen (${response.status})`);
    }
    return response.json();
  }

  private async fetchDetail(id: string): Promise<TcgdexRawCard | null> {
    const response = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    return response.json();
  }

  private toCard(raw: TcgdexRawCard): PokemonCard {
    const tcgplayerVariant = Object.values(raw.pricing?.tcgplayer ?? {}).find(
      (value): value is TcgdexPriceVariant => typeof value === 'object' && value !== null && 'marketPrice' in value,
    );

    return {
      game: 'pokemon',
      id: raw.id,
      name: raw.name,
      imageUrl: raw.image ? `${raw.image}/high.webp` : null,
      setName: raw.set?.name ?? null,
      rarity: raw.rarity ?? null,
      prices: {
        eur: raw.pricing?.cardmarket?.trend ?? raw.pricing?.cardmarket?.avg ?? null,
        eurFoil: null,
        usd: tcgplayerVariant?.marketPrice ?? null,
        usdFoil: null,
      },
      supertype: raw.category,
      types: raw.types ?? [],
      hp: typeof raw.hp === 'number' ? raw.hp : null,
      evolvesFrom: raw.evolveFrom ?? null,
    };
  }
}
