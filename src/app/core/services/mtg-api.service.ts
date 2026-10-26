import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Card, MtgCard } from '../models/card.model';
import { withSignal } from '../utils/abortable-query';
import { ExtractedFields, extractFields } from '../utils/card-field-extraction';
import { ScryfallQueue, ScryfallRateLimitError } from '../utils/scryfall-queue';
import { CollectorFinish, SetCodeMatch, parseGeminiMtgResult } from '../utils/set-code-parser';
import { OcrLineLike, cleanOcrText, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification, MtgIdentificationResult, ScoredCandidate } from './card-api.interface';
import { CardDisplayLanguageService } from './card-display-language.service';
import { MtgBulkDataService } from './mtg-bulk-data.service';
import { SupabaseService } from './supabase.service';

// Exported so MtgBulkDataService (the local IndexedDB card cache) can trim
// down and store bulk-data records in exactly this shape - anything read
// back out of the local cache then plugs directly into toCard()/
// scoreCandidate() below with no adapter needed.
export interface ScryfallCardFace {
  image_uris?: { normal: string; small: string; art_crop: string };
  mana_cost?: string;
}

export interface ScryfallRawCard {
  id: string;
  oracle_id: string;
  name: string;
  printed_name?: string;
  type_line: string;
  printed_type_line?: string;
  power?: string;
  toughness?: string;
  artist?: string;
  keywords?: string[];
  legalities?: Record<string, string>;
  cmc: number;
  color_identity: string[];
  mana_cost?: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  released_at: string;
  image_uris?: { normal: string; small: string; art_crop: string };
  card_faces?: ScryfallCardFace[];
  prices: { usd: string | null; usd_foil: string | null; eur: string | null; eur_foil: string | null };
  purchase_uris?: { cardmarket?: string };
}

interface ScryfallCandidate {
  card: ScryfallRawCard;
  source: 'exact' | 'name' | 'filter';
}

/**
 * Row shape of the `scryfall_cards` table (supabase/sql/016_scryfall_cards.sql),
 * synced from Scryfall's bulk data by the sync-scryfall-cards Edge Function.
 * Queried directly via PostgREST for searchCards/getCard/getCardBySetAndNumber/
 * getCardsByIds/getCardsByNames/getPrints - a live-debugging session found
 * scryfall-proxy failing consistently on at least one real network while
 * PostgREST queries against this project's own tables never did. Flat and
 * pre-resolved (a double-faced card's image/mana_cost already fell back to
 * its first face during sync) - unlike ScryfallRawCard, there's no nested
 * card_faces to unwrap here.
 */
interface ScryfallCardRow {
  id: string;
  oracle_id: string;
  name: string;
  printed_name: string | null;
  // Scryfall's own printed-language code (e.g. 'en', 'de', 'ja') - this row
  // is one specific printing in one specific language; the same oracle_id
  // has a separate row per language it was ever printed in (see
  // 025_scryfall_cards_lang.sql). Backs the card-display language toggle
  // (MtgApiService.translateCards) - unrelated to collection_cards.language,
  // which tracks which language copy a user physically owns.
  lang: string;
  image_url: string | null;
  set_code: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  released_at: string | null;
  color_identity: string[];
  mana_cost: string | null;
  cmc: number;
  type_line: string;
  price_eur: number | null;
  price_eur_foil: number | null;
  price_usd: number | null;
  price_usd_foil: number | null;
  cardmarket_url: string | null;
  image_url_small: string | null;
  // Added by migration 034 - null for a row synced before it, or still
  // waiting on its next daily sync. See MtgCard.legalities.
  legalities: Record<string, string> | null;
}

// A token or halo-finish card gets its own collection bucket ("✨ Specials")
// instead of the normal color grouping - see collection-stats.ts. Derived
// once here (see categoryForMatch below) from the same parsed collector-
// number flags that already drive the Scryfall lookup, rather than
// recomputed downstream from the resolved card.
export type CardCategory = 'normal' | 'token' | 'special';

export interface CroppedIdentification {
  card: Card;
  finish: CollectorFinish;
  cardCategory: CardCategory;
  language: string;
}

const IDENTIFY_CONFIDENCE_THRESHOLD = 0.8;

// Multi-field scoring for the camera scanner: every recognizable structural
// field adds confidence, so a single noisy signal can't make or break a
// match on its own - and none of it depends on successfully OCR'ing the
// (often mangled) printed name. A set-code-sourced candidate is already an
// exact structural match, so it starts far ahead of one found via the
// looser filter search.
const SCORE_SET_CODE_SOURCE = 80;
// A fuzzy name lookup is a good signal for finding the right oracle card,
// but (unlike an exact set+number hit) not certain to be the exact print
// scanned - worth less than the exact-lookup bonus, and still has to beat
// out other structural signals (collector number above all) in scoring.
const SCORE_NAME_SOURCE = 50;
const SCORE_POWER = 20;
const SCORE_TOUGHNESS = 20;
const SCORE_KEYWORD = 10;
const KEYWORD_COUNT = 7;
const SCORE_ARTIST = 15;
// Lets a bare collector number (read even without a valid accompanying set
// code) still pick out the right printing/variant in scoring - e.g. two
// prints of the same card with different collector numbers otherwise tie.
const SCORE_COLLECTOR_NUMBER = 30;
// Only worth a bulk filter search once at least this many structural
// signals agree - any fewer and the filters are too loose to narrow down
// Scryfall's card pool meaningfully.
const MIN_FILTERS_FOR_SEARCH = 2;
// Confidence tier for a filter-sourced top candidate that decides how many
// runners-up to offer if the caller doesn't auto-confirm it (an exact
// set+number lookup always skips this, being unambiguous by construction):
// 5 options total for a fairly confident guess, the full 10 when weak.
const MEDIUM_CONFIDENCE_THRESHOLD = 50;
const TOP_N_MEDIUM_CONFIDENCE = 5;
const TOP_N_LOW_CONFIDENCE = 10;
// Below this, a candidate is discarded outright rather than offered in the
// picker - a near-zero score means almost nothing about it actually agreed
// with what was scanned, so showing it just invites picking the wrong card.
const MIN_SCORE_FOR_CANDIDATE = 30;
// Universes Beyond Marvel cards print "MARVEL" prominently instead of (or
// alongside) a clearly readable set code - when that's the only text found,
// try the handful of real Marvel-line sets directly with the OCR'd
// collector number rather than falling back to a vague filter search.
const MARVEL_FALLBACK_SET_CODES = ['msh', 'spm', 'acx', 'fan'];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Routed through the scryfall-proxy Supabase Edge Function, not directly at
// api.scryfall.com - the browser gets a CORS error calling Scryfall
// cross-origin. Still used for everything NOT migrated to query
// scryfall_cards directly (see ScryfallCardRow's comment): the scanner's
// identification methods and getPopularCards/getValidSetCodes. The proxy
// mirrors Scryfall's URL structure 1:1, so only these base URLs change -
// every path/query/method built from them below is unchanged.
const SCRYFALL_PROXY_BASE = `${environment.supabaseUrl}/functions/v1/scryfall-proxy`;
const CARD_ENDPOINT = `${SCRYFALL_PROXY_BASE}/cards`;
const SEARCH_ENDPOINT = `${SCRYFALL_PROXY_BASE}/cards/search`;
const SETS_ENDPOINT = `${SCRYFALL_PROXY_BASE}/sets`;
const SCRYFALL_USER_AGENT = 'TCGVault/1.0 (mathias-mayer.de)';
// Batches an .in(column, [...]) PostgREST filter to keep the request's
// query string comfortably under typical proxy/URL-length limits - a
// user's full collection can run into the hundreds of ids.
const POSTGRES_BATCH_SIZE = 200;
// searchCards fetches this many rows per pass (prefix, then word-boundary)
// before deduping by name client-side - generous enough that a common
// query still surfaces plenty of distinct card names after every printing
// of the same few cards is collapsed down to one.
const SEARCH_ROW_LIMIT = 200;
// A plain set code (e.g. "emn") typed into the search box, with nothing
// else - real MTG set codes run 2-6 alphanumeric characters with no spaces,
// so this cheaply rules out an actual card name (always longer and/or
// containing a space) before bothering with the extra query. Checked
// against actual set_code rows below rather than a fixed-length regex alone -
// a short card name could otherwise coincidentally match the shape.
const SET_CODE_QUERY_PATTERN = /^[a-z0-9]{2,6}$/i;
// Generous enough for any real set (even combined box-topper/number lists)
// without a limit - this is "show me the whole set", not a ranked search.
const SET_CARDS_LIMIT = 600;
// Mobile networks hit Scryfall 504s (gateway timeout) far more often than
// desktop - retried with exponential backoff (1s, 2s, 4s) rather than
// surfacing the failure immediately. A thrown network error (offline blip,
// DNS hiccup) gets the same treatment, on the same retry budget.
const FETCH_RETRY_ATTEMPTS = 3;
const FETCH_RETRY_BASE_DELAY_MS = 1000;
// A single batch query (scryfall_cards or an RPC against it) failing isn't
// necessarily bad data - running every batch in parallel (see
// queryScryfallCards's own doc comment) means several can land on the
// database at once, and a "57014 canceling statement due to statement
// timeout" under that concurrent load (the exact same error seen live
// during the Scryfall bulk sync, see scripts/sync-scryfall-cards.mjs's own
// retry) is very likely to succeed a moment later, once that load has
// eased. Retried before a batch is treated as a permanent failure.
const BATCH_RETRY_ATTEMPTS = 3;
const BATCH_RETRY_BASE_DELAY_MS = 500;

// Real set codes vary in length and can coincide with ordinary words (e.g.
// "war" for War of the Spark) - matching the scanner's set-code guesses
// against this actual list (see MtgApiService.getValidSetCodes) beats any
// fixed-length/ignore-list heuristic. Refetched at most once a day.
const SET_CODES_STORAGE_KEY = 'tcgvault.scryfallSetCodes';
const SET_CODES_TIMESTAMP_KEY = 'tcgvault.scryfallSetCodesTimestamp';
const SET_CODES_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class MtgApiService implements CardApiService {
  // Local IndexedDB card cache the scanner checks before ever touching the
  // network - see MtgBulkDataService. This is a one-directional dependency
  // (that service never depends back on this one).
  private readonly bulkData = inject(MtgBulkDataService);
  private readonly supabase = inject(SupabaseService);
  private readonly displayLanguage = inject(CardDisplayLanguageService);

  // Every Scryfall call funnels through this queue (max 10 req/s, per
  // Scryfall's documented limit) and carries an identifying User-Agent -
  // both required to avoid the 403s a bursty, unidentified scanner triggers.
  private readonly queue = new ScryfallQueue();

  // Purely decorative dashboard widgets (popular/saltiest cards) share this
  // separate queue instead of `queue` above - on a large collection, `queue`
  // can be backed up with a dozen-plus sequential collection-fetch batches,
  // and these two calls fire at the same time as that fetch (see
  // DashboardComponent). Queued behind that backlog, they'd only ever start
  // once the whole collection load is done instead of showing promptly.
  private readonly decorativeQueue = new ScryfallQueue();

  // Cached for the life of the service (and 24h across sessions via
  // localStorage) - null only means "no real list available", which callers
  // treat as "fall back to the cruder ignore-list heuristic", never as "no
  // set codes are valid".
  private validSetCodesPromise: Promise<Set<string> | null> | null = null;

  private getValidSetCodes(): Promise<Set<string> | null> {
    return (this.validSetCodesPromise ??= this.loadValidSetCodes());
  }

  private async loadValidSetCodes(): Promise<Set<string> | null> {
    const cachedTimestamp = localStorage.getItem(SET_CODES_TIMESTAMP_KEY);
    const cachedJson = localStorage.getItem(SET_CODES_STORAGE_KEY);
    if (cachedJson && cachedTimestamp && Date.now() - parseInt(cachedTimestamp, 10) < SET_CODES_TTL_MS) {
      return new Set(JSON.parse(cachedJson));
    }

    try {
      const response = await this.scryfallFetch(SETS_ENDPOINT);
      if (!response.ok) throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
      const body: { data: Array<{ code: string }> } = await response.json();
      const codes = body.data.map((set) => set.code.toUpperCase());
      localStorage.setItem(SET_CODES_STORAGE_KEY, JSON.stringify(codes));
      localStorage.setItem(SET_CODES_TIMESTAMP_KEY, Date.now().toString());
      return new Set(codes);
    } catch {
      // A stale cache is still far more accurate than the ignore-list
      // fallback - only give up on it entirely if there's nothing cached.
      return cachedJson ? new Set(JSON.parse(cachedJson)) : null;
    }
  }

  /** Retries one batch query up to BATCH_RETRY_ATTEMPTS times (see its own doc comment) before handing back whatever the last attempt got, success or not - `run` is a factory (not a bare promise) since a Postgrest/RPC builder can only be awaited once, so each retry needs its own fresh call. */
  private async runBatchWithRetry<T>(
    run: () => PromiseLike<{ data: T | null; error: unknown }>,
  ): Promise<{ data: T | null; error: unknown }> {
    let last: { data: T | null; error: unknown } = { data: null, error: null };
    for (let attempt = 0; attempt < BATCH_RETRY_ATTEMPTS; attempt++) {
      last = await run();
      if (!last.error) return last;
      if (attempt < BATCH_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_RETRY_BASE_DELAY_MS * 2 ** attempt));
      }
    }
    return last;
  }

  private scryfallFetch(url: string, init?: RequestInit, queue: ScryfallQueue = this.queue): Promise<Response> {
    return queue.add(async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await fetch(url, {
            ...init,
            // TEMPORARY EXPERIMENT: back to apikey/Authorization (and
            // scryfall-proxy back to its default verify_jwt) after the
            // --no-verify-jwt + headerless "simple request" approach didn't
            // fix the 504s on a real device after all - every OTHER
            // function on this same Supabase project (edhrec-proxy,
            // collection_cards, has_user_secret) succeeded on the exact
            // same network while every scryfall-proxy route failed, and
            // verify_jwt was the one structural difference between
            // scryfall-proxy and those. Testing whether that's really it.
            headers: {
              ...init?.headers,
              'User-Agent': SCRYFALL_USER_AGENT,
              apikey: environment.supabaseAnonKey,
              Authorization: `Bearer ${this.supabase.session()?.access_token ?? environment.supabaseAnonKey}`,
            },
          });
          if (response.status === 403) throw new ScryfallRateLimitError();
          // A 504 is transient (mobile networks hit these often) - retry
          // instead of handing the caller a hard failure, unless retries
          // are exhausted, in which case the (still-504) response is
          // returned as-is for the caller's existing !response.ok handling.
          if (response.status === 504 && attempt < FETCH_RETRY_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, FETCH_RETRY_BASE_DELAY_MS * 2 ** attempt));
            continue;
          }
          return response;
        } catch (error) {
          if (error instanceof ScryfallRateLimitError || attempt >= FETCH_RETRY_ATTEMPTS - 1) throw error;
          await new Promise((r) => setTimeout(r, FETCH_RETRY_BASE_DELAY_MS * 2 ** attempt));
        }
      }
    });
  }

  /**
   * Two passes against scryfall_cards, one row per name kept (many rows
   * share a name - every printing) so an exact-ish match (name starts with
   * the query, e.g. "Sol" -> "Sol Ring") always ranks first - a plain
   * word-boundary search alone sorts alphabetically across ALL word-start
   * matches ("Sol" also matches "Agrus Kos, Eternal Soldier"), which can
   * bury the obvious card behind less relevant ones.
   */
  async searchCards(query: string, signal?: AbortSignal): Promise<Card[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // A bare set code (e.g. "emn") browses that whole set instead of
    // searching by name - falls through to the name search below if it
    // doesn't actually match a real set (so a short card name typed alone
    // still works as a normal search).
    if (SET_CODE_QUERY_PATTERN.test(trimmed)) {
      const setCards = await this.getCardsBySetCode(trimmed, signal);
      if (setCards.length > 0) return this.translateCards(setCards);
    }

    const pattern = escapeRegExp(trimmed);
    const [prefixResult, wordResult] = await Promise.all([
      withSignal(
        this.supabase.client
          .from('scryfall_cards')
          .select('*')
          .ilike('name', `${trimmed}%`)
          // One row per name per language (see 025_scryfall_cards_lang.sql) -
          // without this, every non-English printing of the same card shows
          // up as its own extra, visually-duplicate-looking search result.
          .eq('lang', 'en')
          .order('name')
          .limit(SEARCH_ROW_LIMIT),
        signal,
      ),
      withSignal(
        this.supabase.client
          .from('scryfall_cards')
          .select('*')
          // PostgREST's case-insensitive regex operator is the keyword
          // "imatch" (~*), not the raw symbol - passing "~*" as the operator
          // string sends `name=~*.<value>` on the wire, which PostgREST
          // rejects with a 400 ("unknown operator") for every query, silently
          // breaking word-boundary search results (e.g. "Sol Ring") even
          // though the prefix-match pass above still succeeds.
          .filter('name', 'imatch', `\\y${pattern}`)
          .eq('lang', 'en')
          .order('name')
          .limit(SEARCH_ROW_LIMIT),
        signal,
      ),
    ]);
    // Either pass alone still gives usable results (the prefix pass covers
    // the most likely card) - only fail the search when both did.
    if (prefixResult.error && wordResult.error) throw prefixResult.error;
    if (prefixResult.error || wordResult.error) {
      console.warn('Card search: one of two passes failed', prefixResult.error ?? wordResult.error);
    }

    const prefixRows = (prefixResult.data ?? []) as ScryfallCardRow[];
    const wordRows = (wordResult.data ?? []) as ScryfallCardRow[];
    const cards = this.dedupeRowsByName([...prefixRows, ...wordRows]).map((row) => this.rowToCard(row));
    return this.translateCards(cards);
  }

  /**
   * Every card printed in one set (e.g. "emn" -> every Eldritch Moon card),
   * for browsing/adding a whole set at once instead of searching by name.
   * Returns [] for anything that isn't actually a known set_code (the
   * caller falls back to a plain name search then) rather than throwing -
   * typing a short, real card name that happens to look like a set code
   * (shape-checked by SET_CODE_QUERY_PATTERN, not existence-checked) must
   * still behave like a normal search.
   */
  private async getCardsBySetCode(code: string, signal?: AbortSignal): Promise<Card[]> {
    const { data, error } = await withSignal(
      this.supabase.client
        .from('scryfall_cards')
        .select('*')
        .eq('set_code', code.toLowerCase())
        // One row per card per language (see 025_scryfall_cards_lang.sql) -
        // without this, browsing a set lists every card once per language
        // it was printed in.
        .eq('lang', 'en')
        .limit(SET_CARDS_LIMIT),
      signal,
    );
    if (error) throw error;

    const rows = (data ?? []) as ScryfallCardRow[];
    // collector_number is text ("1", "10", "280a", "★7", ...) - sorting it
    // as a plain string would put "10" before "2", scattering a set's own
    // printed order. Parsing the leading digits and falling back to a plain
    // string compare for anything after/without them (promos, foil-etched
    // suffixes) keeps the common case in actual checklist order.
    rows.sort((a, b) => {
      const numA = parseInt(a.collector_number, 10);
      const numB = parseInt(b.collector_number, 10);
      if (Number.isNaN(numA) || Number.isNaN(numB) || numA !== numB) {
        return (Number.isNaN(numA) ? Infinity : numA) - (Number.isNaN(numB) ? Infinity : numB);
      }
      return a.collector_number.localeCompare(b.collector_number);
    });
    return rows.map((row) => this.rowToCard(row));
  }

  async getCard(id: string): Promise<Card | null> {
    const { data, error } = await this.supabase.client.from('scryfall_cards').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [card] = await this.translateCards([this.rowToCard(data as ScryfallCardRow)]);
    return card;
  }

  /** Exact, language-independent lookup by set code + collector number (e.g. "iko"/"123"). Tries both the unpadded and zero-padded 4-digit form (see collectorNumberVariants) - Scryfall's own stored collector_number isn't consistently one or the other across sets. */
  async getCardBySetAndNumber(setCode: string, collectorNumber: string): Promise<Card | null> {
    for (const variant of this.collectorNumberVariants(collectorNumber)) {
      const row = await this.lookupScryfallCardRow(setCode.toLowerCase(), variant);
      if (row) {
        const [card] = await this.translateCards([this.rowToCard(row)]);
        return card;
      }
    }
    return null;
  }

  /**
   * One row per set+number, preferring the English printing - under all_cards
   * (see 025_scryfall_cards_lang.sql) every language a card was printed in is
   * its own row sharing the same set_code+collector_number, so an unfiltered
   * query here would return several rows instead of one. Falls back to
   * whatever language IS available (`.limit(1)`, no particular order beyond
   * that) for the rare card never printed in English at all - the same
   * "default_cards" fallback this table used to get for free from Scryfall's
   * own bulk file curation.
   */
  private async lookupScryfallCardRow(setCode: string, collectorNumber: string): Promise<ScryfallCardRow | null> {
    const { data: englishRow, error: englishError } = await this.supabase.client
      .from('scryfall_cards')
      .select('*')
      .eq('set_code', setCode)
      .eq('collector_number', collectorNumber)
      .eq('lang', 'en')
      .maybeSingle();
    if (englishError) throw englishError;
    if (englishRow) return englishRow as ScryfallCardRow;

    const { data: anyRows, error: anyError } = await this.supabase.client
      .from('scryfall_cards')
      .select('*')
      .eq('set_code', setCode)
      .eq('collector_number', collectorNumber)
      .limit(1);
    if (anyError) throw anyError;
    return (anyRows?.[0] as ScryfallCardRow | undefined) ?? null;
  }

  private categoryForMatch(match: { isToken: boolean; isHelper: boolean }): CardCategory {
    if (match.isToken) return 'token';
    if (match.isHelper) return 'special';
    return 'normal';
  }

  /**
   * Resolves an already-parsed set+number match (see parseGeminiMtgResult)
   * to an actual card. Token cards print a "T" marker next to the collector number, but
   * where they actually live on Scryfall varies by product: some print it
   * as a "T"-prefixed number inline in the parent set (e.g. "clb"/"T17"),
   * tried first per the newer convention; others instead keep tokens in a
   * wholly separate "t"-prefixed set with the plain number - "tmsh" (Marvel
   * Super Heroes Tokens), never "msh" card "T11" (verified against the live
   * API: the latter 404s, the former is a real card) - tried second as a
   * fallback covering that case.
   *
   * Both candidates are always tried, even when match.setCode itself already
   * starts with "t" - an earlier version skipped the "t"+setCode fallback in
   * that case on the assumption that setCode must already be a token set,
   * but plenty of real parent sets legitimately start with the letter T too
   * (e.g. "tla" - Avatar: The Last Airbender; token set "ttla" - verified
   * live: "tla/T6" 404s, "ttla/6" is a real card). Worst case the extra
   * candidate just 404s harmlessly.
   *
   * The "H" flag looks like a finish marker but isn't one - confirmed
   * against Scryfall that it marks a Reminder/"Helper" card (e.g. a
   * hideaway/disguise explainer), which - like a token - lives in the
   * set's token sheet ("tmkm"/"21" for "H 0021 MKM"), just under its plain
   * number rather than a "T"-prefixed one. Tried first for that reason;
   * falling back to an H-prefixed or plain number in the parent set covers
   * products that instead keep these inline.
   */
  private async resolveSetCodeMatch(match: SetCodeMatch): Promise<CroppedIdentification | null> {
    const finish = match.finish;
    const cardCategory = this.categoryForMatch(match);
    const language = match.language;

    const setCodesToTry: Array<{ setCode: string; number: string }> = match.isToken
      ? [
          { setCode: match.setCode, number: `T${match.collectorNumber}` },
          { setCode: `t${match.setCode}`, number: match.collectorNumber },
        ]
      : match.isHelper
        ? [
            { setCode: `t${match.setCode}`, number: match.collectorNumber },
            { setCode: match.setCode, number: `H${match.collectorNumber}` },
            { setCode: match.setCode, number: match.collectorNumber },
          ]
        : [{ setCode: match.setCode, number: match.collectorNumber }];

    for (const { setCode, number } of setCodesToTry) {
      const raw = await this.lookupBySetAndNumber(setCode, number);
      if (raw) return { card: this.toCard(raw), finish, cardCategory, language };
    }
    return null;
  }

  /**
   * Identifies a card from Gemini's already-normalized MTG answer (see
   * gemini-ocr's MTG_PROMPT - always "SET NUM" / "SET TNUM" / "SET HNUM",
   * unpadded, single line, covering every format actually printed on a
   * card: new 4-digit, old "X/Y" fraction, and both token/Helper-card flag
   * positions) - just a strict format check (parseGeminiMtgResult) before
   * reusing the exact same set+number lookup.
   */
  async identifyByGeminiResult(text: string): Promise<CroppedIdentification | null> {
    const match = parseGeminiMtgResult(text);
    if (!match) return null;

    return this.resolveSetCodeMatch(match);
  }

  private async fetchCardBySetAndNumber(setCode: string, collectorNumber: string): Promise<ScryfallRawCard | null> {
    const response = await this.scryfallFetch(`${CARD_ENDPOINT}/${setCode.toLowerCase()}/${collectorNumber}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
    }
    return response.json();
  }

  /** Both the unpadded number and a 4-digit zero-padded form - Scryfall's own stored collector_number isn't consistently one or the other across sets, so an OCR'd "82" should still hit a card actually stored as "0082" (or vice versa). Purely numeric only - a token's "T17" is never zero-padded, and padStart would otherwise mangle it into "0T17". */
  private collectorNumberVariants(collectorNumber: string): string[] {
    if (!/^\d+$/.test(collectorNumber)) return [collectorNumber];
    const padded = collectorNumber.padStart(4, '0');
    return collectorNumber === padded ? [collectorNumber] : [collectorNumber, padded];
  }

  /** Local cache first (see MtgBulkDataService), live API only on a local miss - used everywhere the scanner needs an exact set+number hit. Tries both collector-number formats before giving up (see collectorNumberVariants). */
  private async lookupBySetAndNumber(setCode: string, collectorNumber: string): Promise<ScryfallRawCard | null> {
    const variants = this.collectorNumberVariants(collectorNumber);

    for (const variant of variants) {
      const local = await this.bulkData.findBySetAndNumber(setCode, variant);
      if (local) return local;
    }
    for (const variant of variants) {
      const remote = await this.fetchCardBySetAndNumber(setCode, variant);
      if (remote) return remote;
    }
    return null;
  }

  /** Fuzzy, name-only lookup (e.g. for a deck-list import line with no set code) - tolerant of minor spelling/formatting differences. */
  async getCardByFuzzyName(name: string): Promise<Card | null> {
    const raw = await this.fetchCardByFuzzyName(name);
    return raw ? this.toCard(raw) : null;
  }

  /** Queries scryfall_cards directly - this is the method that used to matter most for reliability (Collection/Dashboard/Wishlist/Decks all resolve through here) and PostgREST has held up reliably where scryfall-proxy didn't. A batch that errors is skipped, not fatal - every caller here already looks results up by id and quietly drops whatever it doesn't find (see e.g. collection.service.ts). */
  async getCardsByIds(ids: string[]): Promise<Card[]> {
    const rows = await this.queryScryfallCards('id', ids);
    return this.translateCards(rows.map((row) => this.rowToCard(row)));
  }

  /**
   * `lowPriority` is accepted for source compatibility with existing call
   * sites (e.g. the dashboard's saltiest-cards widget) but is a no-op now -
   * it used to route around scryfall-proxy's rate-limited serial queue,
   * which doesn't apply to a Postgres query at all.
   */
  async getCardsByNames(names: string[], _lowPriority = false): Promise<Card[]> {
    const rows = await this.queryScryfallCardsByName(names);
    return this.translateCards(rows.map((row) => this.rowToCard(row)));
  }

  async getPrints(name: string): Promise<Card[]> {
    const { data, error } = await this.supabase.client
      .from('scryfall_cards')
      .select('*')
      .eq('name', name)
      // One row per printing per language (see 025_scryfall_cards_lang.sql) -
      // without this, every printing shows up once per language it was ever
      // printed in, instead of once per actual print to pick from.
      .eq('lang', 'en')
      .order('released_at', { ascending: false });
    if (error) throw error;
    const cards = ((data ?? []) as ScryfallCardRow[]).map((row) => this.rowToCard(row));
    return this.translateCards(cards);
  }

  /** Shared batching for an `.in(column, [...])` PostgREST query (see POSTGRES_BATCH_SIZE) - a failed batch is logged and skipped rather than failing the whole call, same degrade-gracefully philosophy as everywhere else card lookups are batched in this file. */
  /**
   * Every batch fires at once (Promise.allSettled), not one after another -
   * a single round trip to this project's PostgREST already costs a few
   * real seconds (confirmed live, not just a theoretical concern), so a
   * large collection's worth of sequential batches was the dominant cost in
   * a live-reported ~55s dashboard load. Each batch still fails
   * independently (same "skip and warn" semantics as before) rather than
   * one slow/failed batch taking the rest down with it.
   */
  private async queryScryfallCards(column: 'id' | 'name', values: string[]): Promise<ScryfallCardRow[]> {
    const batches: string[][] = [];
    for (let i = 0; i < values.length; i += POSTGRES_BATCH_SIZE) {
      batches.push(values.slice(i, i + POSTGRES_BATCH_SIZE));
    }

    const results = await Promise.allSettled(
      batches.map((batch) =>
        this.runBatchWithRetry(() => this.supabase.client.from('scryfall_cards').select('*').in(column, batch)),
      ),
    );

    const rows: ScryfallCardRow[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected' || result.value.error) {
        const error = result.status === 'rejected' ? result.reason : result.value.error;
        console.warn(`scryfall_cards ${column} batch failed, skipping ${batches[i].length} row(s):`, error);
        continue;
      }
      rows.push(...((result.value.data ?? []) as ScryfallCardRow[]));
    }
    return rows;
  }

  /**
   * Exact-name lookup, one row per name - unlike queryScryfallCards('name', ...),
   * which used to feed a plain `.in('name', batch)` matching *every printing*
   * of each name. A basic land alone (Plains: 900+ printings) blew straight
   * past PostgREST's 1000-row response cap on its own, silently truncating
   * whatever rarer names in the same batch sorted after it - live-confirmed
   * on a real deck's card list, where the exact set of names lost this way
   * changed from one call to the next. Calls the scryfall_cards_by_name SQL
   * function (021_scryfall_cards_by_name_fn.sql), which does the "one row
   * per name" reduction inside Postgres, so the result is bounded by the
   * number of names requested rather than by their combined printing count.
   */
  private async queryScryfallCardsByName(names: string[]): Promise<ScryfallCardRow[]> {
    const batches: string[][] = [];
    for (let i = 0; i < names.length; i += POSTGRES_BATCH_SIZE) {
      batches.push(names.slice(i, i + POSTGRES_BATCH_SIZE));
    }

    // All batches fire at once (see queryScryfallCards's doc comment for why).
    const results = await Promise.allSettled(
      batches.map((batch) =>
        this.runBatchWithRetry(() => this.supabase.client.rpc('scryfall_cards_by_name', { names: batch })),
      ),
    );

    const rows: ScryfallCardRow[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected' || result.value.error) {
        const error = result.status === 'rejected' ? result.reason : result.value.error;
        console.warn(`scryfall_cards_by_name batch failed, skipping ${batches[i].length} name(s):`, error);
        continue;
      }
      rows.push(...((result.value.data ?? []) as ScryfallCardRow[]));
    }
    return rows;
  }

  /** Many rows can share a name (every printing) - keeps the first row seen per name, case-insensitively. Order of `rows` decides which printing wins for name-only callers (none of which need a *specific* printing - EDHREC candidate images, saltiest-cards, demo-seed, searchCards's dedup). */
  private dedupeRowsByName(rows: ScryfallCardRow[]): ScryfallCardRow[] {
    const byName = new Map<string, ScryfallCardRow>();
    for (const row of rows) {
      const key = row.name.toLowerCase();
      if (!byName.has(key)) byName.set(key, row);
    }
    return [...byName.values()];
  }

  async identifyCard(rawText: string): Promise<CardIdentification | null> {
    const cleaned = cleanOcrText(rawText);
    if (!cleaned) return null;

    // Pass 1: German prints first - an exact quoted-name search scoped to
    // lang:de, so a noisy/partial name still resolves precisely rather than
    // matching unrelated cards via a loose full-text query.
    const escaped = cleaned.replace(/"/g, '\\"');
    const germanMatches = await this.runSearch(`lang:de "${escaped}"`, 'unique=cards');
    const germanBest = this.bestMatch(cleaned, germanMatches, (card) => card.printed_name ?? card.name);
    if (germanBest && germanBest.confidence >= IDENTIFY_CONFIDENCE_THRESHOLD) {
      return { card: this.toCard(germanBest.raw), confidence: germanBest.confidence };
    }

    // Pass 2: no German (or no confident) match - fall back to a fuzzy
    // named lookup against the canonical (English) name, tolerant of the
    // remaining OCR noise, no language filter this time.
    const raw = await this.fetchCardByFuzzyName(cleaned);
    if (!raw) return null;

    const confidence = similarity(cleaned, raw.name);
    if (confidence < IDENTIFY_CONFIDENCE_THRESHOLD) return null;

    return { card: this.toCard(raw), confidence };
  }

  /**
   * Multi-field scoring, with no "extract the name first" step at all - a
   * mangled OCR name used to be sent straight to Scryfall before any other
   * field was even considered, which is exactly what kept producing wrong
   * queries. Instead: pull every structural field out of the frame in one
   * pass, try the most reliable candidate source (exact set+number), and
   * only fall back to a bulk filter search (power/toughness, keywords,
   * coarse type flags) when that didn't produce one - never a name-based
   * lookup, and deliberately no CMC filter either (OCR too often confuses
   * an unrelated number on the card for the mana cost).
   * Every candidate that does turn up is scored against every extracted
   * field.
   *
   * An exact set+number hit is unambiguous by construction and always wins
   * outright. A filter-sourced top score is only ever a confidence signal,
   * never a hard gate - the caller is expected to require this to agree
   * across several consecutive frames, then either auto-confirm (>=70) or
   * offer a manual pick sized to how confident the guess is (5 options for
   * 50-69, the full 10 below that). Returns null only when no candidate was
   * found at all.
   */
  async identifyCardWithScoring(rawText: string, lines: OcrLineLike[]): Promise<MtgIdentificationResult | null> {
    const validSetCodes = await this.getValidSetCodes();
    const fields = extractFields(rawText, lines, validSetCodes);
    const candidates: ScryfallCandidate[] = [];

    if (fields.setCode && fields.collectorNumber !== null) {
      const bySetCode = await this.lookupBySetAndNumber(fields.setCode, String(fields.collectorNumber));
      if (bySetCode) candidates.push({ card: bySetCode, source: 'exact' });
    }

    // No readable set code, but "MARVEL" (printed on every Universes Beyond
    // Marvel card) plus a collector number is still enough to try the real
    // Marvel-line sets directly - stops at the first one that resolves.
    if (candidates.length === 0 && fields.collectorNumber !== null && rawText.includes('MARVEL')) {
      for (const setCode of MARVEL_FALLBACK_SET_CODES) {
        const card = await this.lookupBySetAndNumber(setCode, String(fields.collectorNumber));
        if (card) {
          candidates.push({ card, source: 'exact' });
          break;
        }
      }
    }

    // Still no set code, but a collector number was read - the local bulk
    // cache can cheaply check every printing at that number across every
    // set (no equivalent cheap query exists against the live API), letting
    // scoring pick the right one instead of guessing via a vague filter
    // search. Only ever contributes candidates when the cache is warm.
    if (candidates.length === 0 && fields.collectorNumber !== null && !fields.setCode) {
      const localByNumber = await this.bulkData.findAllByCollectorNumber(String(fields.collectorNumber));
      candidates.push(...localByNumber.map((card): ScryfallCandidate => ({ card, source: 'filter' })));
    }

    if (candidates.length === 0) {
      // Not worth even trying the vague filter/fuzzy fallback without at
      // least one strong signal - a query built from weak/absent fields
      // returns hundreds of irrelevant cards, the first few of which would
      // otherwise get offered in the picker as if they were real guesses.
      const hasStrongMatch =
        fields.powerToughness !== null ||
        (fields.setCode !== null && fields.collectorNumber !== null) ||
        (fields.name !== null && fields.name.length > 3);
      if (!hasStrongMatch) return null;

      const filters: string[] = [];
      if (fields.powerToughness) {
        const [power, toughness] = fields.powerToughness.split('/');
        filters.push(`power=${power}`, `toughness=${toughness}`);
      }
      if (fields.isLegendary) filters.push('is:legendary');
      if (fields.isCreature) filters.push('type:creature');
      if (fields.isInstant) filters.push('type:instant');
      if (fields.isSorcery) filters.push('type:sorcery');

      // Fuzzy name lookup runs alongside the filter search, not instead of
      // it - neither is trusted alone, both just feed the same scoring pool
      // (a cleaned-up name is still the OCR field most prone to noise).
      const [byName, filterResults] = await Promise.all([
        fields.name ? this.lookupByFuzzyName(fields.name) : Promise.resolve(null),
        filters.length >= MIN_FILTERS_FOR_SEARCH
          ? // unique=prints, not unique=cards: every printing/variant of a
            // card comes back separately (regular, extended art, showcase,
            // ...) rather than being collapsed to one - scoring (collector
            // number above all) then picks out the specific print scanned.
            this.runSearch(filters.join(' '), 'unique=prints')
          : Promise.resolve([]),
      ]);

      if (byName) candidates.push({ card: byName, source: 'name' });
      candidates.push(...filterResults.map((card): ScryfallCandidate => ({ card, source: 'filter' })));
    }

    if (candidates.length === 0) return null;

    const scored = candidates
      .map((candidate) => ({ candidate, score: this.scoreCandidate(candidate, fields) }))
      .filter((entry) => entry.score >= MIN_SCORE_FOR_CANDIDATE)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const top = scored[0];

    const toScoredCandidate = (entry: (typeof scored)[number]): ScoredCandidate => {
      const raw = entry.candidate.card;
      return {
        card: this.toCard(raw),
        confidence: entry.score,
        oracleId: raw.oracle_id,
        thumbnailUrl: raw.image_uris?.small ?? raw.card_faces?.[0]?.image_uris?.small ?? null,
      };
    };

    const topCandidate = toScoredCandidate(top);

    if (top.candidate.source === 'exact') {
      return { topCandidate, runners: [], confidence: topCandidate.confidence, source: 'exact' };
    }

    const runnerCount = top.score >= MEDIUM_CONFIDENCE_THRESHOLD ? TOP_N_MEDIUM_CONFIDENCE - 1 : TOP_N_LOW_CONFIDENCE - 1;
    const runners = scored
      .slice(1)
      .filter((entry) => entry.candidate.card.oracle_id !== top.candidate.card.oracle_id)
      .slice(0, runnerCount)
      .map(toScoredCandidate);

    return { topCandidate, runners, confidence: topCandidate.confidence, source: 'filter' };
  }

  private scoreCandidate(candidate: ScryfallCandidate, fields: ExtractedFields): number {
    const card = candidate.card;
    let score = 0;

    if (candidate.source === 'exact') score += SCORE_SET_CODE_SOURCE;
    if (candidate.source === 'name') score += SCORE_NAME_SOURCE;

    if (fields.powerToughness) {
      const [power, toughness] = fields.powerToughness.split('/');
      if (card.power === power) score += SCORE_POWER;
      if (card.toughness === toughness) score += SCORE_TOUGHNESS;
    }

    if (fields.collectorNumber !== null && parseInt(card.collector_number, 10) === fields.collectorNumber) {
      score += SCORE_COLLECTOR_NUMBER;
    }

    for (const [keyword, matched] of Object.entries(fields.hasKeyword)) {
      if (matched && card.keywords?.some((k) => k.toLowerCase().includes(keyword))) {
        score += SCORE_KEYWORD;
      }
    }

    if (fields.artist && card.artist?.toLowerCase().includes(fields.artist.toLowerCase())) {
      score += SCORE_ARTIST;
    }

    return score;
  }

  private async fetchCardByFuzzyName(name: string): Promise<ScryfallRawCard | null> {
    const response = await this.scryfallFetch(`${CARD_ENDPOINT}/named?fuzzy=${encodeURIComponent(name)}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
    }
    return response.json();
  }

  /** Local cache first (see MtgBulkDataService), live API only on a local miss - used by the scanner's name-based fallback. */
  private async lookupByFuzzyName(name: string): Promise<ScryfallRawCard | null> {
    const local = await this.bulkData.findBestFuzzyNameMatch(name);
    if (local) return local;
    return this.fetchCardByFuzzyName(name).catch(() => null);
  }

  private bestMatch(
    cleaned: string,
    candidates: ScryfallRawCard[],
    nameOf: (card: ScryfallRawCard) => string,
  ): { raw: ScryfallRawCard; confidence: number } | null {
    let best: { raw: ScryfallRawCard; confidence: number } | null = null;
    for (const raw of candidates) {
      const confidence = similarity(cleaned, nameOf(raw));
      if (!best || confidence > best.confidence) {
        best = { raw, confidence };
      }
    }
    return best;
  }

  private popularCardsCache: Promise<Card[]> | null = null;

  // Rows fetched from the local mirror before dedup - edhrec_rank ties
  // across every reprint of the same card (Scryfall assigns one rank per
  // oracle card, not per printing), so pulling exactly `limit` rows would
  // mostly return the same handful of staples' different printings. Generous
  // enough that even a heavily-reprinted staple (Sol Ring et al., 50+
  // printings) can't crowd out every other card within the window.
  private static readonly POPULAR_ROW_FETCH_MULTIPLIER = 25;

  /**
   * Most-played cards overall. Tries the local mirror's persisted
   * `edhrec_rank` first (see 034_scryfall_cards_recommendation_fields.sql) -
   * falls back to Scryfall's live `order=edhrec` search if that comes back
   * empty, which it will until the next daily sync run actually populates
   * the column. Once populated, this avoids a live Scryfall round-trip on
   * every dashboard load.
   */
  async getPopularCards(limit: number): Promise<Card[]> {
    if (!this.popularCardsCache) {
      this.popularCardsCache = this.getPopularCardsFromMirror(limit).then((cards) =>
        cards.length > 0 ? cards : this.getPopularCardsLive(),
      );
    }
    const cards = await this.popularCardsCache;
    return cards.slice(0, limit);
  }

  private async getPopularCardsFromMirror(limit: number): Promise<Card[]> {
    const { data, error } = await this.supabase.client
      .from('scryfall_cards')
      .select('*')
      .eq('lang', 'en')
      .not('edhrec_rank', 'is', null)
      // Matches the live query's "-t:basic" - basic lands have no
      // meaningful edhrec_rank signal and would otherwise dominate the top
      // of the ranking.
      .not('type_line', 'ilike', 'Basic Land%')
      .order('edhrec_rank', { ascending: true })
      .limit(limit * MtgApiService.POPULAR_ROW_FETCH_MULTIPLIER);
    if (error || !data) return [];

    const rows = this.dedupeRowsByName(data as ScryfallCardRow[]);
    return rows.slice(0, limit).map((row) => this.rowToCard(row));
  }

  private async getPopularCardsLive(): Promise<Card[]> {
    const raw = await this.runSearch('game:paper -t:basic', 'order=edhrec&unique=cards', this.decorativeQueue);
    return raw.map((card) => this.toCard(card));
  }

  private toCard(raw: ScryfallRawCard): MtgCard {
    const parsePrice = (value: string | null) => (value ? parseFloat(value) : null);
    return {
      game: 'mtg',
      id: raw.id,
      oracleId: raw.oracle_id,
      name: raw.printed_name ?? raw.name,
      oracleName: raw.name,
      localizedName: null,
      imageUrl: raw.image_uris?.normal ?? raw.card_faces?.[0]?.image_uris?.normal ?? null,
      imageUrlSmall: raw.image_uris?.small ?? raw.card_faces?.[0]?.image_uris?.small ?? null,
      setName: raw.set_name,
      rarity: raw.rarity,
      prices: {
        usd: parsePrice(raw.prices.usd),
        usdFoil: parsePrice(raw.prices.usd_foil),
        eur: parsePrice(raw.prices.eur),
        eurFoil: parsePrice(raw.prices.eur_foil),
      },
      colorIdentity: raw.color_identity,
      manaCost: raw.mana_cost ?? raw.card_faces?.[0]?.mana_cost ?? null,
      cmc: raw.cmc,
      typeLine: raw.type_line,
      cardmarketUrl: raw.purchase_uris?.cardmarket ?? null,
      setCode: raw.set,
      collectorNumber: raw.collector_number,
      legalities: raw.legalities ?? null,
    };
  }

  /** Same shape as toCard(), sourced from a scryfall_cards row instead of a raw Scryfall API response - see ScryfallCardRow's comment for why these two exist side by side. */
  private rowToCard(row: ScryfallCardRow): MtgCard {
    return {
      game: 'mtg',
      id: row.id,
      oracleId: row.oracle_id,
      name: row.printed_name ?? row.name,
      // row.name is always the canonical English/oracle name regardless of
      // this specific row's own lang (confirmed live: even a German-lang
      // row's `name` column holds the English name, with the German one
      // only in `printed_name`) - unlike `name` above, never overwritten by
      // translateCards.
      oracleName: row.name,
      // Only translateCards (when the display-language toggle is active)
      // ever has reason to fill this in - see its own doc comment.
      localizedName: null,
      imageUrl: row.image_url,
      imageUrlSmall: row.image_url_small,
      setName: row.set_name,
      rarity: row.rarity,
      prices: {
        usd: row.price_usd,
        usdFoil: row.price_usd_foil,
        eur: row.price_eur,
        eurFoil: row.price_eur_foil,
      },
      colorIdentity: row.color_identity,
      manaCost: row.mana_cost,
      cmc: Number(row.cmc),
      typeLine: row.type_line,
      cardmarketUrl: row.cardmarket_url,
      setCode: row.set_code,
      collectorNumber: row.collector_number,
      legalities: row.legalities,
    };
  }

  /**
   * Overrides `name`/`imageUrl`/`imageUrlSmall` on every given card with its
   * same-oracle_id printing in the app's current display language (see
   * CardDisplayLanguageService), when one exists - called at the end of
   * every public method here that returns Card data for display (search,
   * prints, collection lookups, deck-import), so no other file in the app
   * needs to know this toggle exists at all. A no-op for English (the
   * default) or when no card here has an oracle_id (Yu-Gi-Oh/Pokémon never
   * reach this service in the first place, but guards defensively anyway).
   *
   * Deliberately leaves prices/rarity/set/collector-number/mana-cost/type-
   * line untouched - those describe the specific (English/canonical)
   * printing this Card otherwise still is, not a property of display
   * language, and `collection_cards.language` (which printed-language copy a
   * user owns) is a wholly separate concern from this purely visual swap.
   */
  private async translateCards(cards: Card[]): Promise<Card[]> {
    const lang = this.displayLanguage.current();
    if (lang === 'en') return cards;

    // One request per distinct (oracle_id, set_code, collector_number)
    // actually present - a collection with several copies of the same
    // printing (or several printings sharing an oracle_id across the
    // visible cards) sends that combination only once, however many cards
    // it backs.
    const pairs = new Map<string, { oracleId: string; setCode: string; collectorNumber: string }>();
    for (const card of cards) {
      if (!card.oracleId || card.game !== 'mtg') continue;
      pairs.set(`${card.oracleId}:${card.setCode}:${card.collectorNumber}`, {
        oracleId: card.oracleId,
        setCode: card.setCode,
        collectorNumber: card.collectorNumber,
      });
    }
    if (pairs.size === 0) return cards;

    const localized = await this.getLocalizedCardDataByPairs([...pairs.values()], lang);
    if (localized.size === 0) return cards;

    // The best *genuinely translated* name seen for each oracle_id across
    // this whole batch - not every pair above necessarily got a real
    // printed_name back (see the map's own isTranslated flag), so this only
    // picks up the ones that did. Powers Card.localizedName (search-only,
    // see its own doc comment) - deliberately never used for *display* name/
    // art below, which stays exact-printing-only by design (see that
    // decision's own long-standing comment, kept as-is).
    const oracleLocalizedName = new Map<string, string>();
    for (const value of localized.values()) {
      if (value.isTranslated) oracleLocalizedName.set(value.oracleId, value.name);
    }

    return cards.map((card) => {
      if (!card.oracleId || card.game !== 'mtg') return card;
      const localizedName = oracleLocalizedName.get(card.oracleId) ?? null;
      const match = localized.get(`${card.oracleId}:${card.setCode}:${card.collectorNumber}`);
      if (!match) return { ...card, localizedName };

      // Only an exact same-printing match (set_code + collector_number,
      // resolved in Postgres - scryfall_cards_localized) is ever used for
      // *display* - a card genuinely never printed in the target language
      // (live-confirmed: several Fallout Commander-precon-exclusive cards
      // have no German printing at all) stays fully untranslated by design,
      // rather than "borrowing" a translated name from some other printing
      // of the same oracle card while keeping the original art - that mixed
      // DE-name/EN-art combination read as a bug even though it was
      // arguably correct, so full consistency won out (explicit choice).
      // localizedName above is the one place a borrowed name from a sibling
      // printing *is* wanted (search only, never shown as this card's name).
      return { ...card, name: match.name, imageUrl: match.imageUrl, imageUrlSmall: match.imageUrlSmall, localizedName };
    });
  }

  /** Batched (see POSTGRES_BATCH_SIZE) and resolved entirely in Postgres (scryfall_cards_localized, backed by the (oracle_id, lang) index) - exactly one row per requested printing comes back, and only for an exact set_code+collector_number match (anything else is simply absent from the result, left untranslated by the caller). All batches fire at once (see queryScryfallCards's doc comment for why), not one after another. */
  private async getLocalizedCardDataByPairs(
    pairs: Array<{ oracleId: string; setCode: string; collectorNumber: string }>,
    lang: string,
  ): Promise<
    Map<string, { oracleId: string; name: string; imageUrl: string | null; imageUrlSmall: string | null; isTranslated: boolean }>
  > {
    const batches: Array<Array<{ oracleId: string; setCode: string; collectorNumber: string }>> = [];
    for (let i = 0; i < pairs.length; i += POSTGRES_BATCH_SIZE) {
      batches.push(pairs.slice(i, i + POSTGRES_BATCH_SIZE));
    }

    const results = await Promise.allSettled(
      batches.map((batch) =>
        this.runBatchWithRetry(() =>
          this.supabase.client.rpc('scryfall_cards_localized', {
            oracle_ids: batch.map((pair) => pair.oracleId),
            set_codes: batch.map((pair) => pair.setCode),
            collector_numbers: batch.map((pair) => pair.collectorNumber),
            target_lang: lang,
          }),
        ),
      ),
    );

    const result = new Map<
      string,
      { oracleId: string; name: string; imageUrl: string | null; imageUrlSmall: string | null; isTranslated: boolean }
    >();
    for (const settled of results) {
      if (settled.status === 'rejected' || settled.value.error) {
        console.warn(
          'scryfall_cards_localized batch failed, skipping:',
          settled.status === 'rejected' ? settled.reason : settled.value.error,
        );
        continue;
      }
      for (const row of (settled.value.data ?? []) as Array<{
        oracle_id: string;
        set_code: string;
        collector_number: string;
        printed_name: string | null;
        name: string | null;
        image_url: string | null;
        image_url_small: string | null;
      }>) {
        if (!row.name) continue;
        result.set(`${row.oracle_id}:${row.set_code}:${row.collector_number}`, {
          oracleId: row.oracle_id,
          name: row.printed_name ?? row.name,
          imageUrl: row.image_url,
          imageUrlSmall: row.image_url_small,
          isTranslated: row.printed_name != null,
        });
      }
    }
    return result;
  }

  private async runSearch(scryfallQuery: string, params: string, queue?: ScryfallQueue): Promise<ScryfallRawCard[]> {
    // Scryfall expects '+' between query terms, not a literal %20 space.
    const encodedQuery = encodeURIComponent(scryfallQuery).replace(/%20/g, '+');
    const url = `${SEARCH_ENDPOINT}?q=${encodedQuery}&${params}`;
    const response = await this.scryfallFetch(url, undefined, queue);

    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw new Error(`Scryfall-Suche fehlgeschlagen (${response.status})`);
    }

    const body: { data: ScryfallRawCard[] } = await response.json();
    return body.data;
  }

}
