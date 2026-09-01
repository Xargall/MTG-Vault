import { Injectable } from '@angular/core';

export interface EdhrecCard {
  name: string;
  quantity: number;
}

interface EdhrecCardviewRaw {
  name: string;
  label?: string;
}

interface EdhrecCardlistRaw {
  header: string;
  cardviews: EdhrecCardviewRaw[];
}

interface EdhrecAverageDeckResponse {
  container?: { json_dict?: { cardlists?: EdhrecCardlistRaw[] } };
}

const AVERAGE_DECK_ENDPOINT = 'https://json.edhrec.com/pages/average-decks';
const DIACRITICS_PATTERN = /[̀-ͯ]/g;

/**
 * EDHREC's "average deck" for a commander is a static, precomputed JSON file
 * served with wildcard CORS (confirmed: no auth/proxy needed for a
 * browser-only app), keyed by a slug derived from the commander's name.
 */
export function slugifyCommanderName(name: string): string {
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
  private readonly cache = new Map<string, Promise<EdhrecCard[]>>();

  getAverageDeck(commanderName: string): Promise<EdhrecCard[]> {
    const slug = slugifyCommanderName(commanderName);
    let cached = this.cache.get(slug);
    if (!cached) {
      cached = this.fetchAverageDeck(slug);
      this.cache.set(slug, cached);
    }
    return cached;
  }

  private async fetchAverageDeck(slug: string): Promise<EdhrecCard[]> {
    const response = await fetch(`${AVERAGE_DECK_ENDPOINT}/${slug}.json`);

    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw new Error(`EDHREC-Anfrage fehlgeschlagen (${response.status})`);
    }

    const body: EdhrecAverageDeckResponse = await response.json();
    const cardlists = body.container?.json_dict?.cardlists ?? [];

    return cardlists.flatMap((list) =>
      list.cardviews.map((card) => ({ name: card.name, quantity: parseQuantity(card) })),
    );
  }
}
