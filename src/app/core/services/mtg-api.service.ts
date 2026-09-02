import { Injectable } from '@angular/core';

import { Card, MtgCard } from '../models/card.model';
import { ExtractedFields, extractFields } from '../utils/card-field-extraction';
import { ScryfallQueue, ScryfallRateLimitError } from '../utils/scryfall-queue';
import { OcrLineLike, cleanOcrText, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification, MtgIdentificationResult, ScoredCandidate } from './card-api.interface';

interface ScryfallCardFace {
  image_uris?: { normal: string; small: string; art_crop: string };
  mana_cost?: string;
}

interface ScryfallRawCard {
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
  source: 'setCode' | 'filter';
}

const IDENTIFY_CONFIDENCE_THRESHOLD = 0.8;

// Multi-field scoring for the camera scanner: every recognizable structural
// field adds confidence, so a single noisy signal can't make or break a
// match on its own - and none of it depends on successfully OCR'ing the
// (often mangled) printed name. A set-code-sourced candidate is already an
// exact structural match, so it starts far ahead of one found via the
// looser filter search.
const SCORE_SET_CODE_SOURCE = 80;
const SCORE_POWER = 20;
const SCORE_TOUGHNESS = 20;
const SCORE_CMC = 15;
const SCORE_KEYWORD = 10;
const KEYWORD_COUNT = 7;
const SCORE_ARTIST = 15;
const MAX_POSSIBLE_SCORE = SCORE_SET_CODE_SOURCE + SCORE_POWER + SCORE_TOUGHNESS + SCORE_CMC + SCORE_KEYWORD * KEYWORD_COUNT + SCORE_ARTIST;
const MIN_SCORE_FOR_MATCH = 60;
// Only worth a bulk filter search once at least this many structural
// signals agree - any fewer and the filters are too loose to narrow down
// Scryfall's card pool meaningfully.
const MIN_FILTERS_FOR_SEARCH = 2;
// Filter-search candidates can tie or nearly tie on the same stat line
// (e.g. two different legendary 4/4s) with no name check to break the tie,
// so up to this many runners-up are offered as a manual pick instead of
// silently trusting the top score.
const MAX_ALTERNATIVES = 2;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CARD_ENDPOINT = 'https://api.scryfall.com/cards';
const COLLECTION_ENDPOINT = 'https://api.scryfall.com/cards/collection';
const SEARCH_ENDPOINT = 'https://api.scryfall.com/cards/search';
const BATCH_SIZE = 75;
const SCRYFALL_USER_AGENT = 'TCGVault/1.0 (mathias-mayer.de)';

@Injectable({ providedIn: 'root' })
export class MtgApiService implements CardApiService {
  // Every Scryfall call funnels through this queue (max 10 req/s, per
  // Scryfall's documented limit) and carries an identifying User-Agent -
  // both required to avoid the 403s a bursty, unidentified scanner triggers.
  private readonly queue = new ScryfallQueue();

  private scryfallFetch(url: string, init?: RequestInit): Promise<Response> {
    return this.queue.add(async () => {
      const response = await fetch(url, {
        ...init,
        headers: { ...init?.headers, 'User-Agent': SCRYFALL_USER_AGENT },
      });
      if (response.status === 403) throw new ScryfallRateLimitError();
      return response;
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

  private async fetchCardBySetAndNumber(setCode: string, collectorNumber: string): Promise<ScryfallRawCard | null> {
    const response = await this.scryfallFetch(`${CARD_ENDPOINT}/${setCode.toLowerCase()}/${collectorNumber}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
    }
    return response.json();
  }

  async getCardsByIds(ids: string[]): Promise<Card[]> {
    const raw = await this.fetchCollection(ids.map((id) => ({ id })));
    return raw.map((card) => this.toCard(card));
  }

  async getCardsByNames(names: string[]): Promise<Card[]> {
    const raw = await this.fetchCollection(names.map((name) => ({ name })));
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
    const raw = await this.getCardByFuzzyName(cleaned);
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
   * only fall back to a bulk filter search (power/toughness, cmc, coarse
   * type flags) when that didn't produce one - never a name-based lookup.
   * Every candidate that does turn up is scored against every extracted
   * field. Returns a match only above MIN_SCORE_FOR_MATCH - the caller is
   * expected to still require this to agree across several consecutive
   * frames before treating it as confirmed.
   */
  async identifyCardWithScoring(rawText: string, lines: OcrLineLike[]): Promise<MtgIdentificationResult | null> {
    const fields = extractFields(rawText, lines);
    const candidates: ScryfallCandidate[] = [];

    if (fields.setCode && fields.collectorNumber !== null) {
      const bySetCode = await this.fetchCardBySetAndNumber(fields.setCode, String(fields.collectorNumber));
      if (bySetCode) candidates.push({ card: bySetCode, source: 'setCode' });
    }

    if (candidates.length === 0) {
      const filters: string[] = [];
      if (fields.powerToughness) {
        const [power, toughness] = fields.powerToughness.split('/');
        filters.push(`power=${power}`, `toughness=${toughness}`);
      }
      if (fields.cmc !== null) filters.push(`cmc=${fields.cmc}`);
      if (fields.isLegendary) filters.push('is:legendary');
      if (fields.isCreature) filters.push('type:creature');
      if (fields.isInstant) filters.push('type:instant');
      if (fields.isSorcery) filters.push('type:sorcery');

      if (filters.length >= MIN_FILTERS_FOR_SEARCH) {
        const results = await this.runSearch(filters.join(' '), 'unique=cards');
        candidates.push(...results.map((card): ScryfallCandidate => ({ card, source: 'filter' })));
      }
    }

    if (candidates.length === 0) return null;

    const scored = candidates
      .map((candidate) => ({ candidate, score: this.scoreCandidate(candidate, fields) }))
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    if (top.score < MIN_SCORE_FOR_MATCH) return null;

    const toScoredCandidate = (entry: (typeof scored)[number]): ScoredCandidate => ({
      card: this.toCard(entry.candidate.card),
      confidence: Math.min(1, entry.score / MAX_POSSIBLE_SCORE),
      oracleId: entry.candidate.card.oracle_id,
    });

    // The exact set+number lookup is unambiguous by construction (one
    // request, one card) - alternatives only make sense for the looser
    // filter search, where a similar real card can score close behind.
    const alternatives =
      top.candidate.source === 'filter'
        ? scored
            .slice(1)
            .filter((entry) => entry.candidate.card.oracle_id !== top.candidate.card.oracle_id)
            .slice(0, MAX_ALTERNATIVES)
            .map(toScoredCandidate)
        : [];

    return { best: toScoredCandidate(top), source: top.candidate.source, alternatives };
  }

  private scoreCandidate(candidate: ScryfallCandidate, fields: ExtractedFields): number {
    const card = candidate.card;
    let score = 0;

    if (candidate.source === 'setCode') score += SCORE_SET_CODE_SOURCE;

    if (fields.powerToughness) {
      const [power, toughness] = fields.powerToughness.split('/');
      if (card.power === power) score += SCORE_POWER;
      if (card.toughness === toughness) score += SCORE_TOUGHNESS;
    }

    if (fields.cmc !== null && card.cmc === fields.cmc) {
      score += SCORE_CMC;
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

  private async getCardByFuzzyName(name: string): Promise<ScryfallRawCard | null> {
    const response = await this.scryfallFetch(`${CARD_ENDPOINT}/named?fuzzy=${encodeURIComponent(name)}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
    }
    return response.json();
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
      this.popularCardsCache = this.runSearch('game:paper -t:basic', 'order=edhrec&unique=cards').then(
        (raw) => raw.map((card) => this.toCard(card)),
      );
    }
    const cards = await this.popularCardsCache;
    return cards.slice(0, limit);
  }

  private toCard(raw: ScryfallRawCard): MtgCard {
    const parsePrice = (value: string | null) => (value ? parseFloat(value) : null);
    return {
      game: 'mtg',
      id: raw.id,
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

  private async runSearch(scryfallQuery: string, params: string): Promise<ScryfallRawCard[]> {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(scryfallQuery)}&${params}`;
    const response = await this.scryfallFetch(url);

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
  ): Promise<ScryfallRawCard[]> {
    const cards: ScryfallRawCard[] = [];

    for (let i = 0; i < identifiers.length; i += BATCH_SIZE) {
      const batch = identifiers.slice(i, i + BATCH_SIZE);
      const response = await this.scryfallFetch(COLLECTION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers: batch }),
      });

      if (!response.ok) {
        throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
      }

      const body: { data: ScryfallRawCard[] } = await response.json();
      cards.push(...body.data);
    }

    return cards;
  }
}
