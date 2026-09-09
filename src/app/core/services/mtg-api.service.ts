import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Card, MtgCard } from '../models/card.model';
import { ExtractedFields, extractFields } from '../utils/card-field-extraction';
import { ScryfallQueue, ScryfallRateLimitError } from '../utils/scryfall-queue';
import {
  CollectorFinish,
  SetCodeMatch,
  parseCollectorNumber,
  parseGeminiMtgResult,
  parseSetCode,
} from '../utils/set-code-parser';
import { OcrLineLike, cleanOcrText, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification, MtgIdentificationResult, ScoredCandidate } from './card-api.interface';
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
// cross-origin (most visibly the POST-based /cards/collection lookup, but
// true of every endpoint here). The proxy mirrors Scryfall's URL structure
// 1:1, so only these base URLs change - every path/query/method built from
// them below is unchanged.
const SCRYFALL_PROXY_BASE = `${environment.supabaseUrl}/functions/v1/scryfall-proxy`;
const CARD_ENDPOINT = `${SCRYFALL_PROXY_BASE}/cards`;
const COLLECTION_ENDPOINT = `${SCRYFALL_PROXY_BASE}/cards/collection`;
const SEARCH_ENDPOINT = `${SCRYFALL_PROXY_BASE}/cards/search`;
const SETS_ENDPOINT = `${SCRYFALL_PROXY_BASE}/sets`;
const BATCH_SIZE = 75;
const SCRYFALL_USER_AGENT = 'TCGVault/1.0 (mathias-mayer.de)';
// Mobile networks hit Scryfall 504s (gateway timeout) far more often than
// desktop - retried with exponential backoff (1s, 2s, 4s) rather than
// surfacing the failure immediately. A thrown network error (offline blip,
// DNS hiccup) gets the same treatment, on the same retry budget.
const FETCH_RETRY_ATTEMPTS = 3;
const FETCH_RETRY_BASE_DELAY_MS = 1000;

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

  private scryfallFetch(url: string, init?: RequestInit, queue: ScryfallQueue = this.queue): Promise<Response> {
    console.log('scryfall-proxy URL:', url);
    return queue.add(async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await fetch(url, {
            ...init,
            // Every Supabase Edge Function requires a valid Authorization
            // bearer (verify_jwt, left at its default). Supabase's newer
            // "sb_publishable_..." key format isn't itself a JWT, so sending
            // it verbatim as the bearer (as this used to) fails verify_jwt's
            // signature check with 401 Unauthorized - the Supabase JS SDK's
            // own functions.invoke() (used elsewhere, e.g. GeminiVisionService)
            // already knows this and sends the real session token instead;
            // this raw fetch() call has to do the same thing by hand. Every
            // session - including a guest's - is a real anonymous-auth JWT
            // (see SupabaseService), so this is available whenever a user
            // could actually be browsing cards. Falls back to the publishable
            // key only for the (normally unreachable) case of no session yet.
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

  async searchCards(query: string): Promise<Card[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const pattern = escapeRegExp(trimmed).replace(/\//g, '\\/');

    // Two passes, one card per name (unique=cards) so an exact-ish match
    // (name starts with the query, e.g. "Sol" -> "Sol Ring") always ranks
    // first - a plain word-boundary search alone sorts alphabetically across
    // ALL word-start matches ("Sol" also matches "Agrus Kos, Eternal
    // Soldier"), which can bury the obvious card behind less relevant ones.
    const params = 'order=name&unique=cards';
    const [prefixMatches, wordMatches] = await Promise.all([
      this.runSearch(`name:/^${pattern}/`, params),
      this.runSearch(`name:/\\b${pattern}/`, params),
    ]);

    const seen = new Set(prefixMatches.map((card) => card.id));
    const rest = wordMatches.filter((card) => !seen.has(card.id));
    return [...prefixMatches, ...rest].map((raw) => this.toCard(raw));
  }

  async getCard(id: string): Promise<Card | null> {
    const response = await this.scryfallFetch(`${CARD_ENDPOINT}/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
    }
    const raw: ScryfallRawCard = await response.json();
    return this.toCard(raw);
  }

  /** Exact, language-independent lookup by set code + collector number (e.g. "iko"/"123"). */
  async getCardBySetAndNumber(setCode: string, collectorNumber: string): Promise<Card | null> {
    const raw = await this.fetchCardBySetAndNumber(setCode, collectorNumber);
    return raw ? this.toCard(raw) : null;
  }

  private categoryForMatch(match: { isToken: boolean; isHelper: boolean }): CardCategory {
    if (match.isToken) return 'token';
    if (match.isHelper) return 'special';
    return 'normal';
  }

  /**
   * Resolves an already-parsed set+number match (see parseSetCode /
   * parseGeminiMtgResult) to an actual card, shared by identifyByCroppedText
   * and identifyByGeminiResult so both parsing paths feed the exact same
   * lookup. Token cards print a "T" marker next to the collector number, but
   * where they actually live on Scryfall varies by product: some print it
   * as a "T"-prefixed number inline in the parent set (e.g. "clb"/"T17"),
   * tried first per the newer convention; others instead keep tokens in a
   * wholly separate "t"-prefixed set with the plain number - "tmsh" (Marvel
   * Super Heroes Tokens), never "msh" card "T11" (verified against the live
   * API: the latter 404s, the former is a real card) - tried second as a
   * fallback covering that case.
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

    const setCodesToTry: Array<{ setCode: string; number: string }> = match.isToken
      ? [
          { setCode: match.setCode, number: `T${match.collectorNumber}` },
          ...(match.setCode.startsWith('t') ? [] : [{ setCode: `t${match.setCode}`, number: match.collectorNumber }]),
        ]
      : match.isHelper
        ? [
            ...(match.setCode.startsWith('t') ? [] : [{ setCode: `t${match.setCode}`, number: match.collectorNumber }]),
            { setCode: match.setCode, number: `H${match.collectorNumber}` },
            { setCode: match.setCode, number: match.collectorNumber },
          ]
        : [{ setCode: match.setCode, number: match.collectorNumber }];

    for (const { setCode, number } of setCodesToTry) {
      const raw = await this.lookupBySetAndNumber(setCode, number);
      if (raw) return { card: this.toCard(raw), finish, cardCategory };
    }
    return null;
  }

  /**
   * Identifies a card from OCR text scoped to just the card's bottom-left
   * set-code/collector-number corner (see Scanner's crop-based capture) -
   * an exact set+number hit only, no name/power-toughness/keyword fallback,
   * since a tight crop of that corner never has those fields in it anyway.
   * Also reports the finish and card category (token vs. special/Helper
   * card vs. normal) parsed off the same collector-number flags, so the
   * caller can store them on the collection row (see collection.service.ts).
   */
  async identifyByCroppedText(text: string): Promise<CroppedIdentification | null> {
    const validSetCodes = await this.getValidSetCodes();
    const match = parseSetCode(text, validSetCodes);

    if (match) {
      const resolved = await this.resolveSetCodeMatch(match);
      if (resolved) return resolved;
    }

    // The crop is tight enough that the set code sometimes falls just
    // outside it (it often prints on the line just below/above the rarity
    // + collector number) while the number itself still reads cleanly -
    // fall back to every locally-known printing at that number, but only
    // when there's exactly one. With no other field left to score against,
    // a tie can't be resolved safely, so it's treated as no match rather
    // than guessing. When a token or Helper-card marker was read, narrow
    // that search to token sets only first - both live there (see
    // resolveSetCodeMatch) - the plain fallback is otherwise hopeless for
    // either specifically (a bare number recurs across hundreds of sets,
    // but far fewer token sets share it).
    const bareMatch = parseCollectorNumber(text);
    if (!bareMatch) return null;

    const allMatches = await this.bulkData.findAllByCollectorNumber(bareMatch.number);
    const candidates =
      bareMatch.isToken || bareMatch.isHelper ? allMatches.filter((card) => card.set.startsWith('t')) : allMatches;
    return candidates.length === 1
      ? { card: this.toCard(candidates[0]), finish: bareMatch.finish, cardCategory: this.categoryForMatch(bareMatch) }
      : null;
  }

  /**
   * Identifies a card from Gemini's already-normalized MTG answer (see
   * gemini-ocr's MTG_PROMPT - always "SET NUM" / "SET TNUM" / "SET HNUM",
   * unpadded, single line, covering every format actually printed on a
   * card: new 4-digit, old "X/Y" fraction, and both token/Helper-card flag
   * positions). Unlike identifyByCroppedText, Gemini's answer needs no
   * fuzzy OCR recovery - just a strict format check (parseGeminiMtgResult)
   * - before reusing the exact same set+number lookup.
   */
  async identifyByGeminiResult(text: string): Promise<CroppedIdentification | null> {
    console.log('[Gemini MTG] raw result:', text);
    const match = parseGeminiMtgResult(text);
    console.log('[Gemini MTG] parsed:', match);
    if (!match) return null;

    const resolved = await this.resolveSetCodeMatch(match);
    console.log('[Gemini MTG] Scryfall result:', resolved?.card.name ?? null);
    return resolved;
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

  /**
   * Live cards/collection first, same as ever - prices must stay
   * network-fresh (never cached, see CLAUDE.md), so the local bulk cache
   * (see MtgBulkDataService) only ever fills in ids a batch skipped (see
   * fetchCollection's batch-skip handling), never replaces a successful
   * fetch. Those filled-in cards carry whatever price the bulk cache last
   * saw (up to 24h stale) - an acceptable tradeoff only because the
   * alternative for them is no data at all, not because it's preferred.
   */
  async getCardsByIds(ids: string[]): Promise<Card[]> {
    const raw = await this.fetchCollection(ids.map((id) => ({ id })));

    const foundIds = new Set(raw.map((card) => card.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      const fallback = await Promise.all(missingIds.map((id) => this.bulkData.findById(id)));
      raw.push(...fallback.filter((card): card is ScryfallRawCard => card !== null));
    }

    return raw.map((card) => this.toCard(card));
  }

  /**
   * `lowPriority` routes the batch through `decorativeQueue` instead of the
   * main `queue` - for a call whose result is nice-to-have, not load-bearing
   * (e.g. the dashboard's saltiest-cards widget), so it isn't stuck waiting
   * behind whatever large, unrelated fetch (e.g. the user's full collection)
   * happens to already be queued up on the main queue.
   */
  async getCardsByNames(names: string[], lowPriority = false): Promise<Card[]> {
    const raw = await this.fetchCollection(
      names.map((name) => ({ name })),
      lowPriority ? this.decorativeQueue : undefined,
    );
    return raw.map((card) => this.toCard(card));
  }

  async getPrints(name: string): Promise<Card[]> {
    const escaped = name.replace(/"/g, '\\"');
    const raw = await this.runSearch(`!"${escaped}"`, 'order=released&dir=desc&unique=prints');
    return raw.map((card) => this.toCard(card));
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

  /** Most-played cards overall, via Scryfall's `edhrec_rank` sort (rank 1 = most popular). */
  async getPopularCards(limit: number): Promise<Card[]> {
    if (!this.popularCardsCache) {
      this.popularCardsCache = this.runSearch(
        'game:paper -t:basic',
        'order=edhrec&unique=cards',
        this.decorativeQueue,
      ).then((raw) => raw.map((card) => this.toCard(card)));
    }
    const cards = await this.popularCardsCache;
    return cards.slice(0, limit);
  }

  private toCard(raw: ScryfallRawCard): MtgCard {
    const parsePrice = (value: string | null) => (value ? parseFloat(value) : null);
    return {
      game: 'mtg',
      id: raw.id,
      oracleId: raw.oracle_id,
      name: raw.printed_name ?? raw.name,
      imageUrl: raw.image_uris?.normal ?? raw.card_faces?.[0]?.image_uris?.normal ?? null,
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
    };
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

  private async fetchCollection(
    identifiers: Array<{ id: string } | { name: string }>,
    queue?: ScryfallQueue,
  ): Promise<ScryfallRawCard[]> {
    const cards: ScryfallRawCard[] = [];

    for (let i = 0; i < identifiers.length; i += BATCH_SIZE) {
      const batch = identifiers.slice(i, i + BATCH_SIZE);
      const requestBody = { identifiers: batch };
      console.log('cards/collection request body:', JSON.stringify(requestBody));
      const response = await this.scryfallFetch(
        COLLECTION_ENDPOINT,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
        queue,
      );

      // A single stuck batch (retries exhausted, still 504/non-ok) no
      // longer takes down the whole collection/wishlist/deck view - every
      // caller here already looks results up by id/name and quietly drops
      // whatever it doesn't find (see e.g. collection.service.ts), so
      // skipping just this batch's cards degrades gracefully instead of
      // surfacing a hard error for what both here and on iOS has shown to
      // be an intermittent single-batch failure, not a systemic one.
      if (!response.ok) {
        console.warn(`cards/collection batch failed (${response.status}), skipping ${batch.length} card(s)`);
        continue;
      }

      const body: { data: ScryfallRawCard[] } = await response.json();
      cards.push(...body.data);
    }

    return cards;
  }
}
