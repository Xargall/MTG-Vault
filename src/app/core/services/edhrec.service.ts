import { Injectable } from '@angular/core';

export interface EdhrecCard {
  name: string;
  quantity: number;
}

export interface EdhrecCommanderHit {
  name: string;
}

interface EdhrecCardviewRaw {
  name: string;
  label?: string;
}

interface EdhrecCardlistRaw {
  header: string;
  tag: string;
  cardviews: EdhrecCardviewRaw[];
}

interface EdhrecPageResponse {
  container?: { json_dict?: { cardlists?: EdhrecCardlistRaw[] } };
}

const AVERAGE_DECK_ENDPOINT = 'https://json.edhrec.com/pages/average-decks';
const CARD_ENDPOINT = 'https://json.edhrec.com/pages/cards';
const DIACRITICS_PATTERN = /[̀-ͯ]/g;

/**
 * EDHREC serves static, precomputed JSON files for both commander pages and
 * individual card pages, with wildcard CORS (confirmed: no auth/proxy needed
 * for a browser-only app), keyed by a slug derived from the card's name.
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
  private readonly averageDeckCache = new Map<string, Promise<EdhrecCard[]>>();
  private readonly cardCommandersCache = new Map<string, Promise<EdhrecCommanderHit[]>>();

  getAverageDeck(commanderName: string): Promise<EdhrecCard[]> {
    const slug = slugifyMtgName(commanderName);
    let cached = this.averageDeckCache.get(slug);
    if (!cached) {
      cached = this.fetchPage<EdhrecCard>(`${AVERAGE_DECK_ENDPOINT}/${slug}.json`, (cardlists) =>
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
    const slug = slugifyMtgName(cardName);
    let cached = this.cardCommandersCache.get(slug);
    if (!cached) {
      cached = this.fetchPage<EdhrecCommanderHit>(`${CARD_ENDPOINT}/${slug}.json`, (cardlists) => {
        const topCommanders = cardlists.find((list) => list.tag === 'topcommanders');
        return (topCommanders?.cardviews ?? []).map((view) => ({ name: view.name }));
      });
      this.cardCommandersCache.set(slug, cached);
    }
    return cached;
  }

  private async fetchPage<T>(
    url: string,
    extract: (cardlists: EdhrecCardlistRaw[]) => T[],
  ): Promise<T[]> {
    const response = await fetch(url);

    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw new Error(`EDHREC-Anfrage fehlgeschlagen (${response.status})`);
    }

    const body: EdhrecPageResponse = await response.json();
    return extract(body.container?.json_dict?.cardlists ?? []);
  }
}
