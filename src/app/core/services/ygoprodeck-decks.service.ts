import { Injectable, inject } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import { RequestQueue } from '../utils/request-queue';

// A 403 here would mean YGOPRODeck itself started blocking the proxy's
// requests - same defensive cooldown shape as MoxfieldService/EdhrecService,
// even though (unlike Moxfield) no dedicated grant/UA exists to lose; a long
// pause is still the safer response to any sustained block than retrying
// immediately.
const RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;

// No official rate limit is documented for this endpoint (unlike
// YGOPRODeck's main card API's stated 20 req/sec) - paced conservatively
// anyway, same reasoning as MoxfieldService's own queue, just looser since
// each call here already returns full decklists for a whole category in one
// shot (no per-deck follow-up fetch like Moxfield needs).
const MIN_DELAY_MS = 1500;

// A category's own top decks barely change day to day - same cache
// reasoning/TTL as MoxfieldService's TOP_DECKS_CACHE_KEY.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = 'mtg-vault-ygoprodeck-decks';

interface DiskCacheEntry<T> {
  data: Record<string, T>;
  timestamp: number;
}

function readCache<T>(): Record<string, T> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const { data, timestamp } = JSON.parse(raw) as DiskCacheEntry<T>;
    if (Date.now() - timestamp >= CACHE_TTL_MS) return {};
    return data;
  } catch {
    return {};
  }
}

function writeCache<T>(data: Record<string, T>): void {
  try {
    const entry: DiskCacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full/unavailable (private browsing) - not fatal, just means
    // the next session fetches fresh instead of from cache.
  }
}

// The real `_sft_category` values the live `filter-format` <select> on
// ygoprodeck.com/deck-search/ offers (confirmed live via browser network
// inspection, 2026-10-28 and again 2026-10-28 when the picker was widened to
// cover the format's full "Alternative Formats"/"Competitive" optgroups) -
// a handful of regional/niche variants (OCG China/Asian-English,
// anime/fun-casual decks, Common Charity Decks, and the empty "Tournament
// Meta Decks (Genesys OCG)" - confirmed 0 decks live) are left out to keep
// the picker to categories someone building a real, ownable deck actually
// cares about. Every slug below was spot-checked live against
// getDecks.php directly (not just the proxy) to confirm it returns a
// non-empty deck list before being added.
export const YGO_DECK_CATEGORIES: readonly { slug: string; labelKey: string; descriptionKey: string }[] = [
  {
    slug: 'Tournament Meta Decks',
    labelKey: 'ygoDeckRecs.categoryTournamentMeta',
    descriptionKey: 'ygoDeckRecs.categoryTournamentMetaDescription',
  },
  {
    slug: 'Tournament Meta Decks OCG',
    labelKey: 'ygoDeckRecs.categoryTournamentMetaOcg',
    descriptionKey: 'ygoDeckRecs.categoryTournamentMetaOcgDescription',
  },
  {
    slug: 'Tournament Meta Decks Worlds',
    labelKey: 'ygoDeckRecs.categoryTournamentMetaWorlds',
    descriptionKey: 'ygoDeckRecs.categoryTournamentMetaWorldsDescription',
  },
  {
    slug: 'Tournament Meta Decks (Genesys)',
    labelKey: 'ygoDeckRecs.categoryGenesysTournament',
    descriptionKey: 'ygoDeckRecs.categoryGenesysTournamentDescription',
  },
  {
    slug: 'meta decks',
    labelKey: 'ygoDeckRecs.categoryMeta',
    descriptionKey: 'ygoDeckRecs.categoryMetaDescription',
  },
  {
    slug: 'non-meta decks',
    labelKey: 'ygoDeckRecs.categoryNonMeta',
    descriptionKey: 'ygoDeckRecs.categoryNonMetaDescription',
  },
  {
    slug: 'theorycrafting decks',
    labelKey: 'ygoDeckRecs.categoryTheorycrafting',
    descriptionKey: 'ygoDeckRecs.categoryTheorycraftingDescription',
  },
  {
    slug: 'master duel decks',
    labelKey: 'ygoDeckRecs.categoryMasterDuel',
    descriptionKey: 'ygoDeckRecs.categoryMasterDuelDescription',
  },
  {
    slug: 'genesys decks',
    labelKey: 'ygoDeckRecs.categoryGenesysCasual',
    descriptionKey: 'ygoDeckRecs.categoryGenesysCasualDescription',
  },
  {
    slug: 'speed duel decks',
    labelKey: 'ygoDeckRecs.categorySpeedDuel',
    descriptionKey: 'ygoDeckRecs.categorySpeedDuelDescription',
  },
  {
    slug: 'goat format decks',
    labelKey: 'ygoDeckRecs.categoryGoat',
    descriptionKey: 'ygoDeckRecs.categoryGoatDescription',
  },
  {
    slug: 'edison format decks',
    labelKey: 'ygoDeckRecs.categoryEdison',
    descriptionKey: 'ygoDeckRecs.categoryEdisonDescription',
  },
  {
    slug: 'domain format decks',
    labelKey: 'ygoDeckRecs.categoryDomain',
    descriptionKey: 'ygoDeckRecs.categoryDomainDescription',
  },
  {
    slug: 'trinity format decks',
    labelKey: 'ygoDeckRecs.categoryTrinity',
    descriptionKey: 'ygoDeckRecs.categoryTrinityDescription',
  },
  {
    slug: 'worlds format decks',
    labelKey: 'ygoDeckRecs.categoryWorldsFormat',
    descriptionKey: 'ygoDeckRecs.categoryWorldsFormatDescription',
  },
  {
    slug: 'world championship decks',
    labelKey: 'ygoDeckRecs.categoryWorldChampionship',
    descriptionKey: 'ygoDeckRecs.categoryWorldChampionshipDescription',
  },
];

export interface YgoDeckCardQuantity {
  cardId: string;
  quantity: number;
}

export interface YgoTopDeck {
  deckNum: number;
  name: string;
  format: string | null;
  views: number | null;
  price: string | null;
  prettyUrl: string | null;
  tournamentName: string | null;
  tournamentPlacement: string | null;
  mainDeck: YgoDeckCardQuantity[];
  extraDeck: YgoDeckCardQuantity[];
  sideDeck: YgoDeckCardQuantity[];
}

/**
 * Client for the `ygoprodeck-decks-proxy` Supabase Edge Function -
 * YGOPRODeck's own unofficial deck-browsing JSON API
 * (ygoprodeck.com/api/decks/getDecks.php), used for Yu-Gi-Oh! community/
 * tournament deck recommendations the way MoxfieldService covers MTG's
 * 60-card formats. Unlike Moxfield, one call already returns full,
 * zone-separated decklists for a whole batch of decks - no separate
 * per-deck detail fetch is needed (see YgoDeckRecommendationsDialog).
 */
@Injectable({ providedIn: 'root' })
export class YgoprodeckDecksService {
  private readonly supabase = inject(SupabaseService);

  private readonly queue = new RequestQueue(MIN_DELAY_MS);
  private rateLimitedUntil = 0;

  private readonly memoryCache = new Map<string, Promise<YgoTopDeck[]>>();
  // Lazily read once per app load, then kept in sync as fetches resolve -
  // avoids re-parsing localStorage on every category lookup.
  private diskCache: Record<string, YgoTopDeck[]> | null = null;

  getTopDecks(category: string): Promise<YgoTopDeck[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    this.diskCache ??= readCache<YgoTopDeck[]>();
    const fromDisk = this.diskCache[category];
    if (fromDisk) return Promise.resolve(fromDisk);

    let cached = this.memoryCache.get(category);
    if (!cached) {
      cached = this.loadTopDecks(category).then((decks) => {
        if (decks.length > 0 && this.diskCache) {
          this.diskCache[category] = decks;
          writeCache(this.diskCache);
        }
        return decks;
      });
      this.memoryCache.set(category, cached);
    }
    return cached;
  }

  private async loadTopDecks(category: string): Promise<YgoTopDeck[]> {
    const { data, error } = await this.queue.add(() =>
      this.supabase.client.functions.invoke<YgoTopDeck[]>('ygoprodeck-decks-proxy', {
        body: { category, sort: 'Deck Views' },
      }),
    );
    if (error) {
      if (error instanceof FunctionsHttpError && error.context?.status === 403) {
        this.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        return [];
      }
      throw error;
    }
    return data ?? [];
  }
}
