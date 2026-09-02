import { Injectable } from '@angular/core';

import { Card, MtgCard } from '../models/card.model';
import { ExtractedFields, extractFields } from '../utils/card-field-extraction';
import { ScryfallQueue, ScryfallRateLimitError } from '../utils/scryfall-queue';
import { OcrLineLike, cleanOcrText, isCloseMatch, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification } from './card-api.interface';

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

const IDENTIFY_CONFIDENCE_THRESHOLD = 0.8;

// Multi-field scoring for the camera scanner: every recognizable field adds
// confidence, so a single noisy field can't make or break a match on its
// own. Weights mirror how reliable each signal is (set+number is a near-
// exact structural match; artist/mana cost are the weakest, easily
// coincidental signals).
const NAME_MATCH_MAX_DISTANCE = 2;
const SCORE_NAME = 40;
const SCORE_SET_CODE = 35;
const SCORE_COLLECTOR_NUMBER = 35;
const SCORE_TYPE_LINE = 20;
const SCORE_POWER_TOUGHNESS = 20;
const SCORE_MANA_COST = 15;
const SCORE_ARTIST = 15;
const MAX_POSSIBLE_SCORE =
  SCORE_NAME * 2 + SCORE_SET_CODE + SCORE_COLLECTOR_NUMBER + SCORE_TYPE_LINE + SCORE_POWER_TOUGHNESS + SCORE_MANA_COST + SCORE_ARTIST;
const MIN_SCORE_FOR_MATCH = 60;

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
   * Multi-field scoring: extracts every recognizable field from one frame's
   * OCR output, then tries candidates sequentially rather than firing every
   * query at once - set+number first (cheapest, most exact), only making a
   * second Scryfall call for a fuzzy name lookup if that didn't already
   * score high enough. Halves the worst-case request count per frame.
   * Each candidate is scored against every extracted field rather than
   * trusting whichever single field found it. Returns the candidate only if
   * it clears MIN_SCORE_FOR_MATCH - the caller is expected to still require
   * this to agree across several consecutive frames before treating it as
   * confirmed.
   */
  async identifyCardWithScoring(rawText: string, lines: OcrLineLike[]): Promise<CardIdentification | null> {
    const fields = extractFields(rawText, lines);
    const hasSetCodeAndNumber = fields.setCode !== null && fields.collectorNumber !== null;
    if (!fields.name && !hasSetCodeAndNumber) return null;

    if (hasSetCodeAndNumber) {
      const bySetCode = await this.fetchCardBySetAndNumber(fields.setCode!, String(fields.collectorNumber));
      if (bySetCode) {
        const scored = this.toIdentification(bySetCode, fields);
        if (scored) return scored;
      }
    }

    if (!fields.name) return null;

    const byName = await this.getCardByFuzzyName(fields.name);
    if (!byName) return null;

    return this.toIdentification(byName, fields);
  }

  private toIdentification(candidate: ScryfallRawCard, fields: ExtractedFields): CardIdentification | null {
    const score = this.scoreCard(candidate, fields);
    if (score < MIN_SCORE_FOR_MATCH) return null;

    return {
      card: this.toCard(candidate),
      confidence: Math.min(1, score / MAX_POSSIBLE_SCORE),
      oracleId: candidate.oracle_id,
    };
  }

  private scoreCard(candidate: ScryfallRawCard, fields: ExtractedFields): number {
    let score = 0;

    if (fields.name) {
      if (isCloseMatch(candidate.name, fields.name, NAME_MATCH_MAX_DISTANCE)) score += SCORE_NAME;
      if (candidate.printed_name && isCloseMatch(candidate.printed_name, fields.name, NAME_MATCH_MAX_DISTANCE)) {
        score += SCORE_NAME;
      }
    }

    if (fields.setCode && candidate.set.toUpperCase() === fields.setCode.toUpperCase()) {
      score += SCORE_SET_CODE;
    }
    if (fields.collectorNumber !== null && parseInt(candidate.collector_number, 10) === fields.collectorNumber) {
      score += SCORE_COLLECTOR_NUMBER;
    }

    if (
      fields.typeLine &&
      (candidate.type_line?.includes(fields.typeLine) || candidate.printed_type_line?.includes(fields.typeLine))
    ) {
      score += SCORE_TYPE_LINE;
    }

    if (fields.powerToughness) {
      const [power, toughness] = fields.powerToughness.split('/');
      if (candidate.power === power && candidate.toughness === toughness) score += SCORE_POWER_TOUGHNESS;
    }

    if (fields.manaCost && candidate.cmc === fields.manaCost.number) {
      score += SCORE_MANA_COST;
    }

    if (fields.artist && candidate.artist?.toLowerCase().includes(fields.artist.toLowerCase())) {
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
