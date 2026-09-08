import { Injectable, inject } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

// EDHREC's 403 (see edhrec-proxy) is presumably a temporary block on the
// proxy's own outbound IP, not a per-user thing - same cool-off pattern as
// GeminiVisionService.rateLimited/ScryfallRateLimitError, just a much
// longer window since this is an IP-level block, not a per-second quota.
const RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;

export interface EdhrecCard {
  name: string;
  quantity: number;
}

export interface EdhrecCommanderHit {
  name: string;
}

export interface EdhrecSaltCard {
  name: string;
  /** 0-4 scale, EDHREC's yearly community "Salt Score" survey. */
  salt: number;
}

interface EdhrecCardviewRaw {
  name: string;
  label?: string;
  /** Only present on pages/top/salt.json's cardviews - see getSaltiestCards. */
  salt?: number;
}

interface EdhrecCardlistRaw {
  header: string;
  tag: string;
  cardviews: EdhrecCardviewRaw[];
}

interface EdhrecPageResponse {
  container?: { json_dict?: { cardlists?: EdhrecCardlistRaw[] } };
}

// The salt survey runs once a year, so there's no point re-fetching it every
// session - cached in localStorage (not just the in-memory caches below,
// which don't survive a reload) for a full day.
const SALT_CACHE_KEY = 'mtg-vault-saltiest-cards';
const SALT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface SaltCacheEntry {
  data: EdhrecSaltCard[];
  timestamp: number;
}

function readSaltCache(): EdhrecSaltCard[] | null {
  try {
    const raw = localStorage.getItem(SALT_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as SaltCacheEntry;
    if (Date.now() - timestamp >= SALT_CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeSaltCache(data: EdhrecSaltCard[]): void {
  try {
    const entry: SaltCacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(SALT_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full/unavailable (private browsing) - not fatal, just means
    // the next session fetches fresh instead of from cache.
  }
}

const DIACRITICS_PATTERN = /[̀-ͯ]/g;

/**
 * EDHREC serves static, precomputed JSON files for both commander pages and
 * individual card pages, keyed by a slug derived from the card's name.
 * Direct cross-origin browser requests are now blocked (403) - see
 * fetchPage's edhrec-proxy Edge Function call below.
 */
export function slugifyMtgName(name: string): string {
  const frontFace = name.split(' // ')[0];
  return frontFace
    .normalize('NFKD')
    .replace(DIACRITICS_PATTERN, '') // strip diacritics, e.g. "Jötun" -> "Jotun"
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseQuantity(card: EdhrecCardviewRaw): number {
  const match = card.label?.match(/^(\d+)\s+/);
  return match ? parseInt(match[1], 10) : 1;
}

@Injectable({ providedIn: 'root' })
export class EdhrecService {
  private readonly supabase = inject(SupabaseService);

  private readonly averageDeckCache = new Map<string, Promise<EdhrecCard[]>>();
  private readonly cardCommandersCache = new Map<string, Promise<EdhrecCommanderHit[]>>();
  // Set once a 403 comes back from the proxy - checked *before* touching
  // either cache above, so a cooled-off skip never gets memoized as if it
  // were a real (empty) EDHREC result for that slug.
  private rateLimitedUntil = 0;

  getAverageDeck(commanderName: string): Promise<EdhrecCard[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    const slug = slugifyMtgName(commanderName);
    let cached = this.averageDeckCache.get(slug);
    if (!cached) {
      cached = this.fetchPage<EdhrecCard>(`pages/average-decks/${slug}.json`, (cardlists) =>
        cardlists.flatMap((list) =>
          list.cardviews.map((card) => ({ name: card.name, quantity: parseQuantity(card) })),
        ),
      );
      this.averageDeckCache.set(slug, cached);
    }
    return cached;
  }

  /**
   * Which commanders most often run a given card - EDHREC's per-card page
   * carries a "Top Commanders" list for exactly this. Used to find commanders
   * the collection doesn't (yet) own but whose average deck the collection
   * already substantially covers, not just commanders already owned.
   */
  getCommandersForCard(cardName: string): Promise<EdhrecCommanderHit[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    const slug = slugifyMtgName(cardName);
    let cached = this.cardCommandersCache.get(slug);
    if (!cached) {
      cached = this.fetchPage<EdhrecCommanderHit>(`pages/cards/${slug}.json`, (cardlists) => {
        const topCommanders = cardlists.find((list) => list.tag === 'topcommanders');
        return (topCommanders?.cardviews ?? []).map((view) => ({ name: view.name }));
      });
      this.cardCommandersCache.set(slug, cached);
    }
    return cached;
  }

  private saltiestCardsCache: Promise<EdhrecSaltCard[]> | null = null;

  /**
   * EDHREC's yearly "Saltiest Cards" community survey (dashboard's
   * Saltiest Cards section) - unlike getAverageDeck/getCommandersForCard,
   * also persisted in localStorage for 24h (see SALT_CACHE_KEY), since this
   * list only changes once a year and there's no reason to hit the proxy
   * again every time the app reloads. Still respects the shared 403
   * cool-off above: a page load during a cooldown gets an empty list, same
   * as every other EDHREC call right now, so the dashboard section just
   * hides itself instead of showing an error (see Dashboard.loadSaltiestCards).
   */
  getSaltiestCards(limit: number): Promise<EdhrecSaltCard[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    if (!this.saltiestCardsCache) {
      this.saltiestCardsCache = this.loadSaltiestCards();
    }
    return this.saltiestCardsCache.then((cards) => cards.slice(0, limit));
  }

  private async loadSaltiestCards(): Promise<EdhrecSaltCard[]> {
    const cached = readSaltCache();
    if (cached) return cached;

    const cards = await this.fetchPage<EdhrecSaltCard>('pages/top/salt.json', (cardlists) =>
      (cardlists[0]?.cardviews ?? []).map((view) => ({ name: view.name, salt: view.salt ?? 0 })),
    );
    if (cards.length > 0) writeSaltCache(cards);
    return cards;
  }

  /** Routed through the edhrec-proxy Supabase Edge Function, not a direct browser fetch - EDHREC now returns 403 for direct cross-origin requests (bot/hotlink protection), so this fetches server-side on the app's behalf, same as gemini-ocr does for Gemini Vision. `path` is EDHREC's own relative page path (e.g. "pages/average-decks/atraxa-praetors-voice.json"). */
  private async fetchPage<T>(
    path: string,
    extract: (cardlists: EdhrecCardlistRaw[]) => T[],
  ): Promise<T[]> {
    const { data, error } = await this.supabase.client.functions.invoke<EdhrecPageResponse & { error?: string }>(
      'edhrec-proxy',
      { body: { path } },
    );
    if (error) {
      // A 403 from the proxy means EDHREC itself blocked its outbound
      // request (see edhrec-proxy/index.ts, which forwards EDHREC's own
      // status through) - almost certainly a temporary IP-level block, not
      // this specific page. Pausing every EDHREC call for a while beats
      // hammering it with more requests that would just 403 again too.
      if (error instanceof FunctionsHttpError && error.context?.status === 403) {
        this.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        return [];
      }
      throw error;
    }
    if (data?.error) throw new Error(`EDHREC-Anfrage fehlgeschlagen: ${data.error}`);

    return extract(data?.container?.json_dict?.cardlists ?? []);
  }
}
