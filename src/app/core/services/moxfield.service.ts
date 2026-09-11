import { Injectable, inject } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { AverageDeckCard } from './edhrec.service';
import { SupabaseService } from './supabase.service';

// Same reasoning as EdhrecService's own cooldown - a 403 from the proxy
// means Moxfield itself blocked the outbound request (bot/hotlink
// protection), almost certainly a temporary IP-level block rather than this
// one query, so every Moxfield call pauses for a while rather than
// hammering it with more requests that would just 403 again too.
const RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;

// Moxfield's own format slugs, exactly as they appear in a real deck's
// "format" field (confirmed live: "modern") - not guessed, but the other
// five follow the same obvious pattern and haven't all been individually
// re-verified.
export const MOXFIELD_FORMATS: readonly { slug: string; labelKey: string }[] = [
  { slug: 'standard', labelKey: 'formatRecs.formatStandard' },
  { slug: 'pioneer', labelKey: 'formatRecs.formatPioneer' },
  { slug: 'modern', labelKey: 'formatRecs.formatModern' },
  { slug: 'legacy', labelKey: 'formatRecs.formatLegacy' },
  { slug: 'vintage', labelKey: 'formatRecs.formatVintage' },
  { slug: 'pauper', labelKey: 'formatRecs.formatPauper' },
];

// Moxfield has no endpoint that lists valid hub (archetype tag) names - this
// is a hand-picked, deliberately generic starter set that shows up
// throughout constructed Magic, live-verified per format in
// getArchetypeHubs (see MIN_HUB_DECK_COUNT) rather than trusted blindly, so
// a name that doesn't apply to a given format (e.g. "Tron" in Standard)
// simply never surfaces as an empty bucket.
const CANDIDATE_HUB_NAMES = [
  'Aggro',
  'Control',
  'Midrange',
  'Combo',
  'Tempo',
  'Tokens',
  'Reanimator',
  'Affinity',
  'Burn',
  'Tron',
  'Ramp',
  'Artifacts',
  'Storm',
  'Lifegain',
  'Mill',
  'Sacrifice',
  'Spellslinger',
  'Stax',
] as const;

const MIN_HUB_DECK_COUNT = 15;
const HUB_PROBE_BATCH_SIZE = 6;
// How many of a hub's top (most-liked) decks get aggregated into its
// "average deck" - kept modest since, unlike EDHREC, Moxfield's search
// doesn't return card lists inline: each sampled deck costs its own extra
// full-deck fetch (see loadAverageDeck), and this same call also drives the
// hub list's own dual free/total % badges (see FormatDeckRecommendationsDialog),
// so it runs once per candidate hub, not just once per opened detail view.
const SAMPLE_DECK_COUNT = 8;
const DECK_FETCH_BATCH_SIZE = 4;
// A card must appear in at least half the sampled decks to make the average
// decklist - keeps one-off tech/sideboard choices out of what's presented as
// "the" build, same spirit as EDHREC's own inclusion-rate cutoff.
const MIN_INCLUSION_RATE = 0.5;

export interface MoxfieldHub {
  name: string;
  deckCount: number;
}

interface MoxfieldSearchItem {
  publicId: string;
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
 * EdhrecService covers Commander. Unlike EDHREC, Moxfield has no
 * precomputed "average deck" per archetype - getAverageDeck below builds
 * one client-side by sampling the most-liked decks tagged with a given hub
 * (Moxfield's own community-assigned archetype tag) and averaging their
 * card counts. See ~/.claude/plans/crispy-gathering-wand.md for the full
 * design/research behind this.
 */
@Injectable({ providedIn: 'root' })
export class MoxfieldService {
  private readonly supabase = inject(SupabaseService);

  private rateLimitedUntil = 0;

  private readonly hubsCache = new Map<string, Promise<MoxfieldHub[]>>();
  private readonly averageDeckCache = new Map<string, Promise<AverageDeckCard[]>>();

  /**
   * Live-verified candidate hubs for one format, sorted by how many decks
   * carry that tag - cached per format for 24h (in-memory only, unlike
   * EdhrecService's identity lists, since this doesn't need to survive a
   * reload the way a 32-fixed-identity scan does).
   */
  getArchetypeHubs(format: string): Promise<MoxfieldHub[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    let cached = this.hubsCache.get(format);
    if (!cached) {
      cached = this.loadArchetypeHubs(format);
      this.hubsCache.set(format, cached);
    }
    return cached;
  }

  private async loadArchetypeHubs(format: string): Promise<MoxfieldHub[]> {
    const hubs: MoxfieldHub[] = [];
    for (let i = 0; i < CANDIDATE_HUB_NAMES.length; i += HUB_PROBE_BATCH_SIZE) {
      const batch = CANDIDATE_HUB_NAMES.slice(i, i + HUB_PROBE_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (name) => {
          // pageSize 1 - only the result count matters here, not the decks
          // themselves.
          const response = await this.search({ fmt: format, hubName: name, pageSize: 1 }).catch(() => null);
          return { name, deckCount: response?.totalResults ?? 0 };
        }),
      );
      hubs.push(...batchResults.filter((hub) => hub.deckCount >= MIN_HUB_DECK_COUNT));
    }
    return hubs.sort((a, b) => b.deckCount - a.deckCount);
  }

  /**
   * A computed "average deck" for one format+hub - same {name, quantity}
   * shape as EdhrecService.getAverageDeck, so it plugs into the exact same
   * matching code in deck-stats.ts (splitAverageDeckByAvailability,
   * getAverageDeckMatch) without either of them knowing which source it
   * came from.
   */
  getAverageDeck(format: string, hubName: string): Promise<AverageDeckCard[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    const key = `${format}:${hubName}`;
    let cached = this.averageDeckCache.get(key);
    if (!cached) {
      cached = this.loadAverageDeck(format, hubName);
      this.averageDeckCache.set(key, cached);
    }
    return cached;
  }

  private async loadAverageDeck(format: string, hubName: string): Promise<AverageDeckCard[]> {
    const searchResult = await this.search({
      fmt: format,
      hubName,
      sort: 'mostLiked',
      pageSize: SAMPLE_DECK_COUNT,
    }).catch(() => null);
    const deckIds = searchResult?.data.map((item) => item.publicId) ?? [];
    if (deckIds.length === 0) return [];

    const decks: MoxfieldDeckResponse[] = [];
    for (let i = 0; i < deckIds.length; i += DECK_FETCH_BATCH_SIZE) {
      const batch = deckIds.slice(i, i + DECK_FETCH_BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((id) => this.fetchDeck(id).catch(() => null)));
      decks.push(...batchResults.filter((deck): deck is MoxfieldDeckResponse => deck !== null));
    }
    if (decks.length === 0) return [];

    // How many of the sampled decks include this card at all, and the
    // summed quantity across all of them - both needed to decide inclusion
    // (MIN_INCLUSION_RATE) and the averaged count.
    const deckCounts = new Map<string, number>();
    const totalQuantities = new Map<string, number>();
    for (const deck of decks) {
      const mainboard = deck.boards?.['mainboard']?.cards;
      if (!mainboard) continue;
      for (const entry of Object.values(mainboard)) {
        const name = entry.card.name;
        deckCounts.set(name, (deckCounts.get(name) ?? 0) + 1);
        totalQuantities.set(name, (totalQuantities.get(name) ?? 0) + entry.quantity);
      }
    }

    const minDeckCount = Math.ceil(decks.length * MIN_INCLUSION_RATE);
    const result: AverageDeckCard[] = [];
    for (const [name, deckCount] of deckCounts) {
      if (deckCount < minDeckCount) continue;
      const quantity = Math.max(1, Math.round((totalQuantities.get(name) ?? 0) / decks.length));
      result.push({ name, quantity });
    }
    return result;
  }

  private search(params: {
    fmt: string;
    hubName?: string;
    sort?: 'mostLiked' | 'mostViewed' | 'recent';
    pageSize: number;
  }): Promise<MoxfieldSearchResponse> {
    return this.invoke<MoxfieldSearchResponse>({ mode: 'search', ...params });
  }

  private fetchDeck(deckId: string): Promise<MoxfieldDeckResponse> {
    return this.invoke<MoxfieldDeckResponse>({ mode: 'deck', deckId });
  }

  private async invoke<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.client.functions.invoke<T>('moxfield-proxy', { body });
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
