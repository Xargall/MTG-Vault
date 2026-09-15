import { Injectable, inject } from '@angular/core';

import { AverageDeckCard } from './edhrec.service';
import { SupabaseService } from './supabase.service';

// Same TTL/pattern as MoxfieldService's own localStorage cache - a format's
// recent Challenge results barely change within a day, and every full fetch
// burns real requests against mtgo.com.
const MTGO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TOP_DECKS_CACHE_KEY = 'mtg-vault-mtgo-top-decks';

// Only ever pull from this many of a format's most recent Challenge events -
// one event alone already lists every entrant's full decklist (a "Standard
// Challenge 32" has 32), so this is a freshness/redundancy margin, not a
// volume need (see mtgo-proxy's own MAX_EVENTS comment).
const MAX_EVENTS_PER_FORMAT = 3;
// How many decks to offer as recommendations - same list length as
// MoxfieldService.TOP_DECK_COUNT for a consistent UX between sources.
const TOP_DECK_COUNT = 24;

interface MtgoCacheEntry<T> {
  data: Record<string, T>;
  timestamp: number;
}

function readMtgoCache<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const { data, timestamp } = JSON.parse(raw) as MtgoCacheEntry<T>;
    if (Date.now() - timestamp >= MTGO_CACHE_TTL_MS) return {};
    return data;
  } catch {
    return {};
  }
}

function writeMtgoCache<T>(key: string, data: Record<string, T>): void {
  try {
    const entry: MtgoCacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full/unavailable (private browsing) - not fatal, just means
    // the next session fetches fresh instead of from cache.
  }
}

// MTGO's own format slugs, matching mtgo.com's real event-page URLs (e.g.
// ".../standard-challenge-32-...") - same six 60-card formats
// MOXFIELD_FORMATS already covers, so no separate format picker is needed.
export type MtgoFormat = 'standard' | 'pioneer' | 'modern' | 'legacy' | 'vintage' | 'pauper';

export interface MtgoTopDeck {
  // `${eventSlug}::${player}` - unique across events, used the same way
  // MoxfieldTopDeck.publicId is.
  id: string;
  name: string;
  event: string;
  // Sortable placement: the final playoff rank when the player made the
  // playoff bracket ('final', typically the top 8), otherwise their
  // swiss-stage standing ('swiss'). null/null for an event with no rank
  // data at all. See mtgo-proxy's own MtgoDeck.rank/.rankType doc comment.
  rank: number | null;
  rankType: 'final' | 'swiss' | null;
}

interface MtgoRawEvent {
  slug: string;
  title: string;
}

interface MtgoRawDeckCard {
  name: string;
  quantity: number;
}

interface MtgoRawDeck {
  player: string;
  rank: number | null;
  rankType: 'final' | 'swiss' | null;
  mainboard: MtgoRawDeckCard[];
  sideboard: MtgoRawDeckCard[];
}

// Playoff placements (1..8) always rank above pure-swiss standings (which
// span the whole field, e.g. 1..32) - pushing swiss ranks into their own
// numeric band keeps a single ascending sort correct without a multi-key
// comparator.
function sortKey(deck: MtgoTopDeck): number {
  if (deck.rank == null) return Number.POSITIVE_INFINITY;
  return deck.rankType === 'final' ? deck.rank : 1000 + deck.rank;
}

/**
 * Client for the `mtgo-proxy` Supabase Edge Function - MTGO's own public
 * decklist pages (mtgo.com/decklists), scraped server-side (confirmed
 * within MTGO's ToS by their support team, 2026-09-15). Second source for
 * 60-card-format deck recommendations alongside MoxfieldService: instead of
 * community-liked decks, this surfaces real recent Challenge-event results,
 * ranked by tournament placement rather than likes.
 */
@Injectable({ providedIn: 'root' })
export class MtgoService {
  private readonly supabase = inject(SupabaseService);

  private readonly topDecksCache = new Map<string, Promise<MtgoTopDeck[]>>();
  private readonly deckCardsCache = new Map<string, Promise<AverageDeckCard[]>>();
  private topDecksDiskCache: Record<string, MtgoTopDeck[]> | null = null;
  private deckCardsDiskCache: Record<string, AverageDeckCard[]> | null = null;

  /**
   * The format's most recent Challenge-event decks (name/event/place only,
   * not their card lists - see getDeckCards), ranked by placement. Cached
   * both in-memory and in localStorage for 24h.
   */
  getTopDecks(format: string): Promise<MtgoTopDeck[]> {
    this.topDecksDiskCache ??= readMtgoCache<MtgoTopDeck[]>(TOP_DECKS_CACHE_KEY);
    const fromDisk = this.topDecksDiskCache[format];
    if (fromDisk) return Promise.resolve(fromDisk);

    let cached = this.topDecksCache.get(format);
    if (!cached) {
      cached = this.loadTopDecks(format).then((decks) => {
        if (decks.length > 0 && this.topDecksDiskCache) {
          this.topDecksDiskCache[format] = decks;
          writeMtgoCache(TOP_DECKS_CACHE_KEY, this.topDecksDiskCache);
        }
        return decks;
      });
      this.topDecksCache.set(format, cached);
    }
    return cached;
  }

  private async loadTopDecks(format: string): Promise<MtgoTopDeck[]> {
    const { events } = await this.invoke<{ events: MtgoRawEvent[] }>({ mode: 'events', format }).catch(() => ({
      events: [],
    }));

    this.deckCardsDiskCache ??= readMtgoCache<AverageDeckCard[]>(`${TOP_DECKS_CACHE_KEY}-cards`);
    const result: MtgoTopDeck[] = [];

    for (const evt of events.slice(0, MAX_EVENTS_PER_FORMAT)) {
      const eventData = await this.invoke<{ title: string; decks: MtgoRawDeck[] }>({
        mode: 'event',
        slug: evt.slug,
      }).catch(() => null);
      if (!eventData) continue;

      for (const deck of eventData.decks) {
        const id = `${evt.slug}::${deck.player}`;
        result.push({
          id,
          name: deck.player,
          event: eventData.title || evt.title,
          rank: deck.rank,
          rankType: deck.rankType,
        });
        if (this.deckCardsDiskCache) this.deckCardsDiskCache[id] = deck.mainboard;
      }
    }

    if (this.deckCardsDiskCache) writeMtgoCache(`${TOP_DECKS_CACHE_KEY}-cards`, this.deckCardsDiskCache);

    return result.sort((a, b) => sortKey(a) - sortKey(b)).slice(0, TOP_DECK_COUNT);
  }

  /**
   * One deck's real mainboard - same {name, quantity} shape as
   * MoxfieldService.getDeckCards/EdhrecService.getAverageDeck, so it plugs
   * into the same matching code regardless of source. Normally already
   * populated by getTopDecks (an event fetch yields every entrant's full
   * decklist at once) - only re-fetches the deck's event on a cache miss
   * (e.g. this id was never listed in the current session/cache window).
   */
  getDeckCards(id: string): Promise<AverageDeckCard[]> {
    this.deckCardsDiskCache ??= readMtgoCache<AverageDeckCard[]>(`${TOP_DECKS_CACHE_KEY}-cards`);
    const fromDisk = this.deckCardsDiskCache[id];
    if (fromDisk) return Promise.resolve(fromDisk);

    let cached = this.deckCardsCache.get(id);
    if (!cached) {
      cached = this.loadDeckCardsFallback(id);
      this.deckCardsCache.set(id, cached);
    }
    return cached;
  }

  private async loadDeckCardsFallback(id: string): Promise<AverageDeckCard[]> {
    const separatorIndex = id.indexOf('::');
    if (separatorIndex === -1) return [];
    const slug = id.slice(0, separatorIndex);
    const player = id.slice(separatorIndex + 2);

    const eventData = await this.invoke<{ decks: MtgoRawDeck[] }>({ mode: 'event', slug }).catch(() => null);
    return eventData?.decks.find((deck) => deck.player === player)?.mainboard ?? [];
  }

  private async invoke<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.client.functions.invoke<T>('mtgo-proxy', { body });
    if (error) throw error;
    return data as T;
  }
}
