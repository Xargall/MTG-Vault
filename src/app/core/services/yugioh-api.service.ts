import { Injectable } from '@angular/core';

import { Card, YugiohBanlistStatus, YugiohCard } from '../models/card.model';
import { cleanOcrText, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification } from './card-api.interface';

const IDENTIFY_CONFIDENCE_THRESHOLD = 0.8;

interface YgoCardSet {
  set_name: string;
  set_rarity: string;
  set_price: string;
}

interface YgoCardImage {
  image_url: string;
}

interface YgoCardPrice {
  cardmarket_price: string;
  tcgplayer_price: string;
}

interface YgoRawCard {
  id: number;
  name: string;
  type: string;
  attribute?: string;
  atk?: number;
  def?: number;
  card_images: YgoCardImage[];
  card_prices: YgoCardPrice[];
  card_sets?: YgoCardSet[];
  banlist_info?: { ban_tcg?: YugiohBanlistStatus };
}

const CARD_INFO_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const ARCHETYPES_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/archetypes.php';

@Injectable({ providedIn: 'root' })
export class YugiohApiService implements CardApiService {
  async searchCards(query: string): Promise<Card[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const raw = await this.fetchCardInfo({ fname: trimmed });
    return raw.map((card) => this.toCard(card));
  }

  async getCard(id: string): Promise<Card | null> {
    const raw = await this.fetchCardInfo({ id });
    return raw.length > 0 ? this.toCard(raw[0]) : null;
  }

  async getCardsByIds(ids: string[]): Promise<Card[]> {
    if (ids.length === 0) return [];
    const raw = await this.fetchCardInfo({ id: ids.join(',') });
    return raw.map((card) => this.toCard(card));
  }

  async getPrints(name: string): Promise<Card[]> {
    // YGOPRODeck has no per-printing artwork/id like Scryfall - a card has
    // one canonical entry, so there's nothing meaningful to pick between.
    const raw = await this.fetchCardInfo({ name });
    return raw.length > 0 ? [this.toCard(raw[0])] : [];
  }

  async identifyCard(rawText: string): Promise<CardIdentification | null> {
    const cleaned = cleanOcrText(rawText);
    if (!cleaned) return null;

    const raw = await this.fetchCardInfo({ fname: cleaned });
    let best: { card: YgoRawCard; confidence: number } | null = null;
    for (const card of raw) {
      const confidence = similarity(cleaned, card.name);
      if (!best || confidence > best.confidence) {
        best = { card, confidence };
      }
    }

    if (!best || best.confidence < IDENTIFY_CONFIDENCE_THRESHOLD) return null;
    return { card: this.toCard(best.card), confidence: best.confidence };
  }

  async getCardsByNames(names: string[]): Promise<Card[]> {
    if (names.length === 0) return [];
    const raw = await this.fetchCardInfo({ name: names.join('|') });
    return raw.map((card) => this.toCard(card));
  }

  private archetypesCache: Promise<string[]> | null = null;

  /** All known archetype/theme names - used to power theme-based browsing (Yu-Gi-Oh has no community-decklist API to draw on). */
  getArchetypes(): Promise<string[]> {
    if (!this.archetypesCache) {
      this.archetypesCache = this.fetchArchetypes();
    }
    return this.archetypesCache;
  }

  private async fetchArchetypes(): Promise<string[]> {
    const response = await fetch(ARCHETYPES_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Archetyp-Liste konnte nicht geladen werden (${response.status})`);
    }
    const body: Array<{ archetype_name: string }> = await response.json();
    return body.map((entry) => entry.archetype_name).sort((a, b) => a.localeCompare(b));
  }

  async getCardsByArchetype(archetype: string): Promise<Card[]> {
    const raw = await this.fetchCardInfo({ archetype });
    return raw.map((card) => this.toCard(card));
  }

  private async fetchCardInfo(params: Record<string, string>): Promise<YgoRawCard[]> {
    const url = `${CARD_INFO_ENDPOINT}?${new URLSearchParams(params).toString()}`;
    const response = await fetch(url);

    if (response.status === 400) {
      // YGOPRODeck returns 400 (not an empty list) when nothing matches.
      return [];
    }
    if (!response.ok) {
      throw new Error(`YGOPRODeck-Anfrage fehlgeschlagen (${response.status})`);
    }

    const body: { data: YgoRawCard[] } = await response.json();
    return body.data;
  }

  private toCard(raw: YgoRawCard): YugiohCard {
    const price = raw.card_prices?.[0];
    const parsePrice = (value: string | undefined) => {
      const parsed = value ? parseFloat(value) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    return {
      game: 'yugioh',
      id: String(raw.id),
      name: raw.name,
      imageUrl: raw.card_images?.[0]?.image_url ?? null,
      setName: raw.card_sets?.[0]?.set_name ?? null,
      rarity: raw.card_sets?.[0]?.set_rarity ?? null,
      prices: {
        eur: parsePrice(price?.cardmarket_price),
        eurFoil: null,
        usd: parsePrice(price?.tcgplayer_price),
        usdFoil: null,
      },
      attribute: raw.attribute ?? null,
      cardType: raw.type,
      atk: raw.atk ?? null,
      def: raw.def ?? null,
      banlistStatus: raw.banlist_info?.ban_tcg ?? null,
    };
  }
}
