import { Injectable } from '@angular/core';

import { Card, MtgCard } from '../models/card.model';
import { cleanOcrText, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification } from './card-api.interface';

interface ScryfallCardFace {
  image_uris?: { normal: string; small: string; art_crop: string };
  mana_cost?: string;
}

interface ScryfallRawCard {
  id: string;
  name: string;
  printed_name?: string;
  type_line: string;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CARD_ENDPOINT = 'https://api.scryfall.com/cards';
const COLLECTION_ENDPOINT = 'https://api.scryfall.com/cards/collection';
const SEARCH_ENDPOINT = 'https://api.scryfall.com/cards/search';
const BATCH_SIZE = 75;

@Injectable({ providedIn: 'root' })
export class MtgApiService implements CardApiService {
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
    const response = await fetch(`${CARD_ENDPOINT}/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
    }
    const raw: ScryfallRawCard = await response.json();
    return this.toCard(raw);
  }

  /** Exact, language-independent lookup by set code + collector number (e.g. "iko"/"123") - the primary path for the camera scanner. */
  async getCardBySetAndNumber(setCode: string, collectorNumber: string): Promise<Card | null> {
    const response = await fetch(`${CARD_ENDPOINT}/${setCode.toLowerCase()}/${collectorNumber}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Scryfall-Anfrage fehlgeschlagen (${response.status})`);
    }
    const raw: ScryfallRawCard = await response.json();
    return this.toCard(raw);
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

    // Pass 1: German prints first - a physical card in the collection may be
    // a German printing, whose printed_name won't match the canonical
    // (English) name field at all.
    const germanMatches = await this.runSearch(`${cleaned} lang:de`, 'unique=cards');
    const germanBest = this.bestMatch(cleaned, germanMatches, (card) => card.printed_name ?? card.name);
    if (germanBest && germanBest.confidence >= IDENTIFY_CONFIDENCE_THRESHOLD) {
      return { card: this.toCard(germanBest.raw), confidence: germanBest.confidence };
    }

    // Pass 2: fall back to the canonical (English) name via autocomplete,
    // which tolerates noisy/partial OCR text far better than a literal
    // search query - but only trust it when it converges on a single
    // suggestion, then confirm that suggestion with a fuzzy named lookup.
    const suggestions = await this.autocompleteSuggestions(cleaned);
    if (suggestions.length !== 1) return null;

    const raw = await this.getCardByFuzzyName(suggestions[0]);
    if (!raw) return null;

    const confidence = similarity(cleaned, raw.name);
    if (confidence < IDENTIFY_CONFIDENCE_THRESHOLD) return null;

    return { card: this.toCard(raw), confidence };
  }

  private async autocompleteSuggestions(query: string): Promise<string[]> {
    const response = await fetch(`${CARD_ENDPOINT}/autocomplete?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const body: { data: string[] } = await response.json();
    return body.data;
  }

  private async getCardByFuzzyName(name: string): Promise<ScryfallRawCard | null> {
    const response = await fetch(`${CARD_ENDPOINT}/named?fuzzy=${encodeURIComponent(name)}`);
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
    const response = await fetch(url);

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
      const response = await fetch(COLLECTION_ENDPOINT, {
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
