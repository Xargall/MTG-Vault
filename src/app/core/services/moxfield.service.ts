import { Injectable, inject } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { AverageDeckCard } from './edhrec.service';
import { SupabaseService } from './supabase.service';
import { RequestQueue } from '../utils/request-queue';

// Same reasoning as EdhrecService's own cooldown - a 403 from the proxy
// means Moxfield itself blocked the outbound request (bot/hotlink
// protection), almost certainly a temporary IP-level block rather than this
// one query, so every Moxfield call pauses for a while rather than
// hammering it with more requests that would just 403 again too.
const RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;

// Moxfield's own stated condition for handing out a user-agent at all: at
// most 1 request/second, or the IP gets firewalled and the user-agent
// revoked - unlike Scryfall's 10/sec, this leaves no margin for callers to
// fire several deck fetches concurrently, so every actual network call
// funnels through this one queue (see invoke()) regardless of how many the
// caller (see FormatDeckRecommendationsDialog's own batching) kicks off
// together.
const MOXFIELD_MIN_DELAY_MS = 1000;

// A format's top-liked decks barely change day to day, and every full list
// burns real budget against the 1 req/sec limit above - persisted in
// localStorage for 24h (same pattern/TTL as EdhrecService's commander-lists/
// salt caches) so re-opening the dialog, or just reloading the page, doesn't
// repeat the same ~25-request fetch.
const MOXFIELD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TOP_DECKS_CACHE_KEY = 'mtg-vault-moxfield-top-decks';

interface MoxfieldCacheEntry<T> {
  data: Record<string, T>;
  timestamp: number;
}

function readMoxfieldCache<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const { data, timestamp } = JSON.parse(raw) as MoxfieldCacheEntry<T>;
    if (Date.now() - timestamp >= MOXFIELD_CACHE_TTL_MS) return {};
    return data;
  } catch {
    return {};
  }
}

function writeMoxfieldCache<T>(key: string, data: Record<string, T>): void {
  try {
    const entry: MoxfieldCacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full/unavailable (private browsing) - not fatal, just means
    // the next session fetches fresh instead of from cache.
  }
}

// Moxfield's own format slugs, exactly as they appear in a real deck's
// "format" field (confirmed live: "modern") - not guessed, but the other
// five follow the same obvious pattern and haven't all been individually
// re-verified.
export const MOXFIELD_FORMATS: readonly { slug: string; labelKey: string; descriptionKey: string }[] = [
  { slug: 'standard', labelKey: 'formatRecs.formatStandard', descriptionKey: 'formatRecs.formatStandardDescription' },
  { slug: 'pioneer', labelKey: 'formatRecs.formatPioneer', descriptionKey: 'formatRecs.formatPioneerDescription' },
  { slug: 'modern', labelKey: 'formatRecs.formatModern', descriptionKey: 'formatRecs.formatModernDescription' },
  { slug: 'legacy', labelKey: 'formatRecs.formatLegacy', descriptionKey: 'formatRecs.formatLegacyDescription' },
  { slug: 'vintage', labelKey: 'formatRecs.formatVintage', descriptionKey: 'formatRecs.formatVintageDescription' },
  { slug: 'pauper', labelKey: 'formatRecs.formatPauper', descriptionKey: 'formatRecs.formatPauperDescription' },
];

// How many of a format's most-liked decks to offer as recommendations.
const TOP_DECK_COUNT = 24;

export interface MoxfieldTopDeck {
  publicId: string;
  name: string;
  likeCount: number;
}

interface MoxfieldSearchItem {
  publicId: string;
  name: string;
  likeCount: number;
}

interface MoxfieldSearchResponse {
  totalResults: number;
  data: MoxfieldSearchItem[];
}

interface MoxfieldBoardCard {
  quantity: number;
  card: { name: string };
}

interface MoxfieldDeckResponse {
  boards?: Record<string, { cards?: Record<string, MoxfieldBoardCard> } | undefined>;
}

/**
 * Client for the `moxfield-proxy` Supabase Edge Function - Moxfield's own
 * unofficial deck-search/deck-detail JSON API (api2.moxfield.com), used for
 * 60-card-format ("Standard"/"Modern"/...) deck recommendations the way
 * EdhrecService covers Commander. EDHREC ties its recommendations to a
 * single unambiguous identity (the commander) and serves one precomputed
 * average build for it; a 60-card format has no equivalent singular
 * identity, so this instead surfaces the format's actual most-liked
 * individual community decks, each exactly as its author built it (real
 * names like "Temur Garden", real full decklists) - not a computed blend
 * across many decks under a hand-picked strategy label. See
 * ~/.claude/plans/crispy-gathering-wand.md for the full design/research
 * behind this.
 */
@Injectable({ providedIn: 'root' })
export class MoxfieldService {
  private readonly supabase = inject(SupabaseService);

  private readonly queue = new RequestQueue(MOXFIELD_MIN_DELAY_MS);
  private rateLimitedUntil = 0;

  private readonly topDecksCache = new Map<string, Promise<MoxfieldTopDeck[]>>();
  private readonly deckCardsCache = new Map<string, Promise<AverageDeckCard[]>>();
  // Lazily read once per app load, then kept in sync as fetches resolve -
  // avoids re-parsing localStorage on every format/deck lookup.
  private topDecksDiskCache: Record<string, MoxfieldTopDeck[]> | null = null;
  private deckCardsDiskCache: Record<string, AverageDeckCard[]> | null = null;

  /**
   * The format's most-liked decks (name/likeCount only, not their card
   * lists yet - see getDeckCards) - cached both in-memory and in
   * localStorage for 24h (see TOP_DECKS_CACHE_KEY).
   */
  getTopDecks(format: string): Promise<MoxfieldTopDeck[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    this.topDecksDiskCache ??= readMoxfieldCache<MoxfieldTopDeck[]>(TOP_DECKS_CACHE_KEY);
    const fromDisk = this.topDecksDiskCache[format];
    if (fromDisk) return Promise.resolve(fromDisk);

    let cached = this.topDecksCache.get(format);
    if (!cached) {
      cached = this.loadTopDecks(format).then((decks) => {
        if (decks.length > 0 && this.topDecksDiskCache) {
          this.topDecksDiskCache[format] = decks;
          writeMoxfieldCache(TOP_DECKS_CACHE_KEY, this.topDecksDiskCache);
        }
        return decks;
      });
      this.topDecksCache.set(format, cached);
    }
    return cached;
  }

  private async loadTopDecks(format: string): Promise<MoxfieldTopDeck[]> {
    const response = await this.search({ fmt: format, sort: 'mostLiked', pageSize: TOP_DECK_COUNT }).catch(
      () => null,
    );
    return (response?.data ?? []).map((item) => ({
      publicId: item.publicId,
      name: item.name,
      likeCount: item.likeCount,
    }));
  }

  /**
   * One deck's real, complete mainboard - same {name, quantity} shape as
   * EdhrecService.getAverageDeck, so it plugs into the exact same matching
   * code in deck-stats.ts (splitAverageDeckByAvailability,
   * getAverageDeckMatch) without either of them knowing which source it
   * came from. Cached both in-memory and in localStorage for 24h (see
   * TOP_DECKS_CACHE_KEY's sibling below), keyed by the deck's own publicId
   * (globally unique on Moxfield, so no format prefix needed).
   */
  getDeckCards(publicId: string): Promise<AverageDeckCard[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    this.deckCardsDiskCache ??= readMoxfieldCache<AverageDeckCard[]>(`${TOP_DECKS_CACHE_KEY}-cards`);
    const fromDisk = this.deckCardsDiskCache[publicId];
    if (fromDisk) return Promise.resolve(fromDisk);

    let cached = this.deckCardsCache.get(publicId);
    if (!cached) {
      cached = this.loadDeckCards(publicId).then((cards) => {
        if (cards.length > 0 && this.deckCardsDiskCache) {
          this.deckCardsDiskCache[publicId] = cards;
          writeMoxfieldCache(`${TOP_DECKS_CACHE_KEY}-cards`, this.deckCardsDiskCache);
        }
        return cards;
      });
      this.deckCardsCache.set(publicId, cached);
    }
    return cached;
  }

  private async loadDeckCards(publicId: string): Promise<AverageDeckCard[]> {
    const deck = await this.fetchDeck(publicId).catch(() => null);
    const mainboard = deck?.boards?.['mainboard']?.cards;
    if (!mainboard) return [];
    return Object.values(mainboard).map((entry) => ({ name: entry.card.name, quantity: entry.quantity }));
  }

  private search(params: {
    fmt: string;
    sort?: 'mostLiked' | 'mostViewed' | 'recent';
    pageSize: number;
  }): Promise<MoxfieldSearchResponse> {
    return this.invoke<MoxfieldSearchResponse>({ mode: 'search', ...params });
  }

  private fetchDeck(deckId: string): Promise<MoxfieldDeckResponse> {
    return this.invoke<MoxfieldDeckResponse>({ mode: 'deck', deckId });
  }

  // getManyDeckCards kicks off its own Promise.all batch of several of
  // these at once - the queue is what actually turns that into a strictly
  // serialized, ≥1s-apart stream of real network calls, so that batch size
  // stays about local concurrency of bookkeeping, not actual request pacing.
  private async invoke<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.queue.add(() =>
      this.supabase.client.functions.invoke<T>('moxfield-proxy', { body }),
    );
    if (error) {
      if (error instanceof FunctionsHttpError && error.context?.status === 403) {
        this.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        throw error;
      }
      if (error instanceof FunctionsHttpError) {
        const responseBody = await error.context
          .clone()
          .json()
          .catch(() => null);
        throw new Error(responseBody?.error ?? error.message);
      }
      throw error;
    }
    return data as T;
  }
}
