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
  /** Only present on pages/commanders/{identity}.json's cardviews - EDHREC's own popularity ranking signal, see getCommandersByColorIdentity. */
  numDecks?: number;
}

/** One of the 32 possible MTG color identities, exactly as EDHREC names/groups them (mono colors, guilds, shards/wedges, four-color, five-color) - see getCommandersByColorIdentity. Pulled directly from a live pages/commanders/five-color.json response's own related_info listing, not guessed. */
export interface EdhrecColorIdentity {
  slug: string;
  colors: string[];
}

export const EDHREC_COLOR_IDENTITIES: readonly EdhrecColorIdentity[] = [
  { slug: 'mono-white', colors: ['W'] },
  { slug: 'mono-blue', colors: ['U'] },
  { slug: 'mono-black', colors: ['B'] },
  { slug: 'mono-red', colors: ['R'] },
  { slug: 'mono-green', colors: ['G'] },
  { slug: 'colorless', colors: [] },
  { slug: 'azorius', colors: ['W', 'U'] },
  { slug: 'dimir', colors: ['U', 'B'] },
  { slug: 'rakdos', colors: ['B', 'R'] },
  { slug: 'gruul', colors: ['R', 'G'] },
  { slug: 'selesnya', colors: ['G', 'W'] },
  { slug: 'orzhov', colors: ['W', 'B'] },
  { slug: 'izzet', colors: ['U', 'R'] },
  { slug: 'golgari', colors: ['B', 'G'] },
  { slug: 'boros', colors: ['R', 'W'] },
  { slug: 'simic', colors: ['G', 'U'] },
  { slug: 'esper', colors: ['W', 'U', 'B'] },
  { slug: 'grixis', colors: ['U', 'B', 'R'] },
  { slug: 'jund', colors: ['B', 'R', 'G'] },
  { slug: 'naya', colors: ['R', 'G', 'W'] },
  { slug: 'bant', colors: ['G', 'W', 'U'] },
  { slug: 'abzan', colors: ['W', 'B', 'G'] },
  { slug: 'jeskai', colors: ['U', 'R', 'W'] },
  { slug: 'sultai', colors: ['B', 'G', 'U'] },
  { slug: 'mardu', colors: ['R', 'W', 'B'] },
  { slug: 'temur', colors: ['G', 'U', 'R'] },
  { slug: 'yore-tiller', colors: ['W', 'U', 'B', 'R'] },
  { slug: 'glint-eye', colors: ['U', 'B', 'R', 'G'] },
  { slug: 'dune-brood', colors: ['B', 'R', 'G', 'W'] },
  { slug: 'ink-treader', colors: ['R', 'G', 'W', 'U'] },
  { slug: 'witch-maw', colors: ['G', 'W', 'U', 'B'] },
  { slug: 'five-color', colors: ['W', 'U', 'B', 'R', 'G'] },
];

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
  /** Only present on pages/commanders/{identity}.json's cardviews - see getCommandersByColorIdentity. */
  num_decks?: number;
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

// Same reasoning as the salt cache above - EDHREC's per-color-identity
// popularity rankings don't meaningfully shift within a day, and fetching
// all 32 of them is exactly the bulk cost getCommandersByColorIdentity
// exists to keep bounded and infrequent (see CommanderRecommendationsDialog,
// which replaced an unbounded per-owned-card reverse scan with this). One
// shared cache entry keyed by identity slug, not 32 separate localStorage keys.
const COMMANDER_LISTS_CACHE_KEY = 'mtg-vault-commander-lists';
const COMMANDER_LISTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CommanderListsCacheEntry {
  data: Record<string, EdhrecCommanderHit[]>;
  timestamp: number;
}

function readCommanderListsCache(): Record<string, EdhrecCommanderHit[]> {
  try {
    const raw = localStorage.getItem(COMMANDER_LISTS_CACHE_KEY);
    if (!raw) return {};
    const { data, timestamp } = JSON.parse(raw) as CommanderListsCacheEntry;
    if (Date.now() - timestamp >= COMMANDER_LISTS_CACHE_TTL_MS) return {};
    return data;
  } catch {
    return {};
  }
}

function writeCommanderListsCache(data: Record<string, EdhrecCommanderHit[]>): void {
  try {
    const entry: CommanderListsCacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(COMMANDER_LISTS_CACHE_KEY, JSON.stringify(entry));
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
  // Set once a 403 comes back from the proxy - checked *before* touching
  // either cache above, so a cooled-off skip never gets memoized as if it
  // were a real (empty) EDHREC result for that slug.
  private rateLimitedUntil = 0;

  getAverageDeck(commanderName: string): Promise<EdhrecCard[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    const slug = slugifyMtgName(commanderName);
    const edhrecUrl = `https://json.edhrec.com/pages/average-decks/${slug}.json`;
    console.log('Commander Slug:', slug);
    console.log('EDHREC Commander URL:', edhrecUrl);

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

  private readonly colorIdentityCache = new Map<string, Promise<EdhrecCommanderHit[]>>();
  // Read once per app load, lazily, then kept in sync as identities resolve -
  // avoids re-parsing localStorage on every one of the (up to 32) calls this
  // fires in a burst from CommanderRecommendationsDialog.
  private commanderListsDiskCache: Record<string, EdhrecCommanderHit[]> | null = null;

  /**
   * Every EDHREC-ranked commander for one color identity (`slug` - see
   * EDHREC_COLOR_IDENTITIES), sorted by EDHREC itself in num_decks order.
   * Replaces the old "ask EDHREC which commanders run each of my owned
   * cards" reverse scan (one request per owned card, unbounded, tripped
   * EDHREC's own bot-protection on any collection past a couple dozen
   * cards) with a fixed set of at most 32 requests total, independent of
   * collection size, and cached both in-memory and in localStorage for 24h
   * (see COMMANDER_LISTS_CACHE_KEY) since these rankings barely move day to
   * day. See CommanderRecommendationsDialog.load() for how the 32 get
   * narrowed down to just the identities the collection can actually support.
   */
  getCommandersByColorIdentity(identity: string): Promise<EdhrecCommanderHit[]> {
    if (Date.now() < this.rateLimitedUntil) return Promise.resolve([]);

    this.commanderListsDiskCache ??= readCommanderListsCache();
    const fromDisk = this.commanderListsDiskCache[identity];
    if (fromDisk) return Promise.resolve(fromDisk);

    let cached = this.colorIdentityCache.get(identity);
    if (!cached) {
      cached = this.fetchPage<EdhrecCommanderHit>(`pages/commanders/${identity}.json`, (cardlists) =>
        cardlists.flatMap((list) =>
          list.cardviews.map((view) => ({ name: view.name, numDecks: view.num_decks })),
        ),
      ).then((hits) => {
        if (hits.length > 0 && this.commanderListsDiskCache) {
          this.commanderListsDiskCache[identity] = hits;
          writeCommanderListsCache(this.commanderListsDiskCache);
        }
        return hits;
      });
      this.colorIdentityCache.set(identity, cached);
    }
    return cached;
  }

  private saltiestCardsCache: Promise<EdhrecSaltCard[]> | null = null;

  /**
   * EDHREC's yearly "Saltiest Cards" community survey (dashboard's
   * Saltiest Cards section) - unlike getAverageDeck, also persisted in
   * localStorage for 24h (see SALT_CACHE_KEY), since this
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
