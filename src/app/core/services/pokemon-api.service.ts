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

export interface PokemonSetOption {
  id: string;
  name: string;
  symbolUrl: string | null;
}

interface TcgdexPriceVariant {
  marketPrice?: number;
}

interface TcgdexRawCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category: PokemonSupertype;
  rarity?: string;
  set?: { name: string; cardCount?: { official?: number }; symbol?: string };
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
// TCGdex's German-locale coverage has real gaps for older/niche sets (e.g.
// the original Grundset/Base Set and promo-adjacent releases like McDonald's
// collaborations) - confirmed live (2026-11-03): the entire German Grundset
// (102/102 cards) has no `image` at all, while the exact same cards under
// the English locale are 100% covered. All display text (name, attacks,
// description, ...) still comes from the German response untouched - this
// is only ever consulted for the one `image` field, and only when the
// German response left it empty.
const FALLBACK_IMAGE_API_BASE = 'https://api.tcgdex.net/v2/en';

/**
 * A set's `symbol` field comes back as e.g.
 * "https://assets.tcgdex.net/univ/base/base2/symbol" - that literal "univ"
 * path segment 400s on TCGdex's own asset host (confirmed live: it's an
 * S3 "InvalidBucketName" error, not a real locale bucket) and needs a real
 * locale ("de" works for both plain and ".webp") substituted in, plus a
 * file extension TCGdex's docs require and the bare path otherwise lacks.
 */
function toSetSymbolUrl(symbol: string | undefined): string | null {
  if (!symbol) return null;
  return `${symbol.replace('/univ/', '/de/')}.webp`;
}

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
  private setsPromise: Promise<PokemonSetOption[]> | null = null;

  /**
   * `setId`, when given, narrows the search to that one TCGdex set
   * server-side (`set=<id>`) instead of relying on name-match ranking
   * alone - a prolific name like Pikachu has 200+ printings across 25+
   * years, and MAX_SEARCH_RESULTS only ever hydrates the first 24 of
   * whatever order TCGdex happens to return (confirmed live, 2026-11-03:
   * not reliably newest-first, so a specific set's printing can sit well
   * past that cutoff and never show up at all). Extra optional param on
   * top of CardApiService's own signature - AddCardDialog calls this
   * directly (not through GameService.cardApi()) when a Pokémon set
   * filter is active, same way it already reaches into
   * YugiohApiService.yugiohPrintNumber for a Yu-Gi-Oh!-only concern.
   */
  async searchCards(query: string, signal?: AbortSignal, setId?: string): Promise<Card[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const brief = await this.fetchBrief(trimmed, signal, setId);
    const capped = brief.slice(0, MAX_SEARCH_RESULTS);
    const raw = await mapWithConcurrency(capped, HYDRATE_CONCURRENCY, (entry) => this.fetchDetail(entry.id));
    return raw.filter((c): c is TcgdexRawCard => c !== null).map((c) => this.toCard(c));
  }

  /** Every TCGdex set (id + display name), for the set-filter dropdown next to Pokémon's search box - memoized for the service's lifetime, the list doesn't change within a session and is small enough (~155 entries) to just keep around. */
  async getSets(): Promise<PokemonSetOption[]> {
    return (this.setsPromise ??= this.fetchSets());
  }

  private async fetchSets(): Promise<PokemonSetOption[]> {
    try {
      const response = await fetch(`${API_BASE}/sets`);
      if (!response.ok) return [];
      const raw: { id: string; name: string; symbol?: string }[] = await response.json();
      return raw
        .map((s) => ({ id: s.id, name: s.name, symbolUrl: toSetSymbolUrl(s.symbol) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    } catch {
      return [];
    }
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

  private async fetchBrief(name: string, signal?: AbortSignal, setId?: string): Promise<TcgdexBriefCard[]> {
    const params = new URLSearchParams({ name });
    // Confirmed live (2026-11-03): TCGdex's own `set` filter matches by id
    // prefix, not just exact equality (e.g. "swsh12" also pulls in the
    // "swsh12.5" sub-set) - harmless here since every id this ever receives
    // comes straight from getSets()'s own real ids, never free-typed.
    if (setId) params.set('set', setId);
    const response = await fetch(`${API_BASE}/cards?${params.toString()}`, { signal });
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`TCGdex-Anfrage fehlgeschlagen (${response.status})`);
    }
    return response.json();
  }

  private async fetchDetail(id: string): Promise<TcgdexRawCard | null> {
    const response = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const raw: TcgdexRawCard = await response.json();
    if (!raw.image) raw.image = await this.fetchFallbackImage(id);
    return raw;
  }

  /** See FALLBACK_IMAGE_API_BASE's doc comment - only ever asked for when the German response itself had no image. Best-effort: any failure here just leaves the card imageless, same as before this fallback existed. */
  private async fetchFallbackImage(id: string): Promise<string | undefined> {
    try {
      const response = await fetch(`${FALLBACK_IMAGE_API_BASE}/cards/${encodeURIComponent(id)}`);
      if (!response.ok) return undefined;
      const raw: { image?: string } = await response.json();
      return raw.image;
    } catch {
      return undefined;
    }
  }

  private toCard(raw: TcgdexRawCard): PokemonCard {
    const tcgplayerVariant = Object.values(raw.pricing?.tcgplayer ?? {}).find(
      (value): value is TcgdexPriceVariant => typeof value === 'object' && value !== null && 'marketPrice' in value,
    );

    return {
      game: 'pokemon',
      id: raw.id,
      oracleId: null,
      name: raw.name,
      oracleName: raw.name,
      localizedName: null,
      imageUrl: raw.image ? `${raw.image}/high.webp` : null,
      // TCGdex's documented quality suffixes are "low"/"high" - same base
      // URL, smaller variant for the grid thumbnail (see card-tile.html).
      // Not live-verified against a real response the way MTG/Yu-Gi-Oh were
      // (Pokémon decks are still pending, see CLAUDE.md) - worth a quick
      // sanity check once Pokémon sees real usage.
      imageUrlSmall: raw.image ? `${raw.image}/low.webp` : null,
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
      localId: raw.localId ?? null,
      setTotal: raw.set?.cardCount?.official ?? null,
      setSymbolUrl: toSetSymbolUrl(raw.set?.symbol),
    };
  }
}
