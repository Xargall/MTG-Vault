import { Injectable } from '@angular/core';

export interface ScryfallCardFace {
  image_uris?: { normal: string; small: string; art_crop: string };
}

export interface ScryfallCard {
  id: string;
  name: string;
  cmc: number;
  color_identity: string[];
  image_uris?: { normal: string; small: string; art_crop: string };
  card_faces?: ScryfallCardFace[];
  prices: { usd: string | null; usd_foil: string | null };
}

export function getCardImageUrl(card: ScryfallCard): string | null {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

const COLLECTION_ENDPOINT = 'https://api.scryfall.com/cards/collection';
const BATCH_SIZE = 75;

@Injectable({ providedIn: 'root' })
export class ScryfallService {
  async getCardsByIds(scryfallIds: string[]): Promise<ScryfallCard[]> {
    return this.fetchCollection(scryfallIds.map((id) => ({ id })));
  }

  async getCardsByNames(names: string[]): Promise<ScryfallCard[]> {
    return this.fetchCollection(names.map((name) => ({ name })));
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
