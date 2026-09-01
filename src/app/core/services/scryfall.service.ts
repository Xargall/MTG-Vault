import { Injectable } from '@angular/core';

export interface ScryfallCardFace {
  image_uris?: { normal: string; small: string; art_crop: string };
  mana_cost?: string;
}

export interface ScryfallCard {
  id: string;
  name: string;
  type_line: string;
  cmc: number;
  color_identity: string[];
  mana_cost?: string;
  set_name: string;
  rarity: string;
  released_at: string;
  image_uris?: { normal: string; small: string; art_crop: string };
  card_faces?: ScryfallCardFace[];
  prices: { usd: string | null; usd_foil: string | null; eur: string | null; eur_foil: string | null };
  purchase_uris?: { cardmarket?: string };
}

export function getCardImageUrl(card: ScryfallCard): string | null {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COLLECTION_ENDPOINT = 'https://api.scryfall.com/cards/collection';
const SEARCH_ENDPOINT = 'https://api.scryfall.com/cards/search';
const BATCH_SIZE = 75;

@Injectable({ providedIn: 'root' })
export class ScryfallService {
  async getCardsByIds(scryfallIds: string[]): Promise<ScryfallCard[]> {
    return this.fetchCollection(scryfallIds.map((id) => ({ id })));
  }

  async getCardsByNames(names: string[]): Promise<ScryfallCard[]> {
    return this.fetchCollection(names.map((name) => ({ name })));
  }

  async searchCards(query: string): Promise<ScryfallCard[]> {
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
    return [...prefixMatches, ...rest];
  }

  async getPrintsByName(name: string): Promise<ScryfallCard[]> {
    const escaped = name.replace(/"/g, '\\"');
    return this.runSearch(`!"${escaped}"`, 'order=released&dir=desc&unique=prints');
  }

  private popularCardsCache: Promise<ScryfallCard[]> | null = null;

  /** Most-played cards overall, via Scryfall's `edhrec_rank` sort (rank 1 = most popular). */
  async getPopularCards(limit: number): Promise<ScryfallCard[]> {
    if (!this.popularCardsCache) {
      this.popularCardsCache = this.runSearch('game:paper -t:basic', 'order=edhrec&unique=cards');
    }
    const cards = await this.popularCardsCache;
    return cards.slice(0, limit);
  }

  private async runSearch(scryfallQuery: string, params: string): Promise<ScryfallCard[]> {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(scryfallQuery)}&${params}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw new Error(`Scryfall-Suche fehlgeschlagen (${response.status})`);
    }

    const body: { data: ScryfallCard[] } = await response.json();
    return body.data;
  }

  private async fetchCollection(
    identifiers: Array<{ id: string } | { name: string }>,
  ): Promise<ScryfallCard[]> {
    const cards: ScryfallCard[] = [];

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

      const body: { data: ScryfallCard[] } = await response.json();
      cards.push(...body.data);
    }

    return cards;
  }
}
