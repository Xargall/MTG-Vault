import { Injectable, inject } from '@angular/core';

import { Card, YugiohBanlistStatus, YugiohCard } from '../models/card.model';
import { cleanOcrText, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification } from './card-api.interface';
import { SupabaseService } from './supabase.service';

const IDENTIFY_CONFIDENCE_THRESHOLD = 0.8;

interface YgoCardSet {
  set_name: string;
  set_rarity: string;
  set_price: string;
}

interface YgoCardImage {
  image_url: string;
  image_url_small: string;
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

/**
 * Row shape of the `ygoprodeck_cards` table (supabase/sql/022_ygoprodeck_cards.sql),
 * synced from YGOPRODeck's full card database by scripts/sync-ygoprodeck-cards.mjs.
 * Queried directly via PostgREST - same reasoning as MtgApiService's
 * ScryfallCardRow: avoids hitting the live YGOPRODeck API on every read.
 * One row per card (YGOPRODeck's own numeric id is already the client's
 * Card.id here - unlike MTG there's no per-printing id/foil concept), unlike
 * ygoprodeck_print_codes below which fans out one row per print code.
 */
interface YgoprodeckCardRow {
  id: number;
  name: string;
  card_type: string;
  attribute: string | null;
  atk: number | null;
  def: number | null;
  image_url: string | null;
  image_url_small: string | null;
  price_eur: number | null;
  price_usd: number | null;
  set_name: string | null;
  rarity: string | null;
  banlist_status: YugiohBanlistStatus | null;
}

/** Row shape of `ygoprodeck_print_codes` - backs identifyByPrintCode's exact scanner lookup. */
interface YgoprodeckPrintCodeRow {
  set_code: string;
  card_id: number;
}

const CARD_INFO_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const ARCHETYPES_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/archetypes.php';
// Dedicated endpoint for an exact print-code lookup (e.g. "SDAZ-DE001") -
// cardinfo.php itself has no such parameter (confirmed: it 400s on
// "setcode"/"cardsets", its actual param list has neither). Only used as a
// fallback now - see identifyByPrintCode.
const CARD_SETS_INFO_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardsetsinfo.php';
// Batches an .in(column, [...]) PostgREST filter - same reasoning as
// MtgApiService's POSTGRES_BATCH_SIZE (keeps the query string comfortably
// under typical URL-length limits).
const POSTGRES_BATCH_SIZE = 200;
const SEARCH_ROW_LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class YugiohApiService implements CardApiService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Prefix match first (so e.g. "Dark Mag" ranks "Dark Magician" ahead of
   * anything merely containing the words), then a contains pass to fill in
   * the rest - deduped by id since a card can appear in both passes. Unlike
   * MTG's scryfall_cards there's no per-printing duplication to also collapse
   * (one row per card here), so this is simpler than MtgApiService's
   * equivalent. Falls back to the live API only when the local cache has
   * nothing at all (not yet synced, or a genuinely brand-new card).
   */
  async searchCards(query: string): Promise<Card[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const escaped = trimmed.replace(/[%_]/g, '\\$&');
    const [prefixResult, containsResult] = await Promise.all([
      this.supabase.client
        .from('ygoprodeck_cards')
        .select('*')
        .ilike('name', `${escaped}%`)
        .order('name')
        .limit(SEARCH_ROW_LIMIT),
      this.supabase.client
        .from('ygoprodeck_cards')
        .select('*')
        .ilike('name', `%${escaped}%`)
        .order('name')
        .limit(SEARCH_ROW_LIMIT),
    ]);

    const prefixRows = (prefixResult.data ?? []) as YgoprodeckCardRow[];
    const containsRows = (containsResult.data ?? []) as YgoprodeckCardRow[];
    const seen = new Set<number>();
    const rows: YgoprodeckCardRow[] = [];
    for (const row of [...prefixRows, ...containsRows]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }

    if (rows.length > 0) return rows.map((row) => this.rowToCard(row));

    const raw = await this.fetchCardInfo({ fname: trimmed });
    return raw.map((card) => this.toCard(card));
  }

  async getCard(id: string): Promise<Card | null> {
    const idNum = Number(id);
    if (Number.isFinite(idNum)) {
      const { data } = await this.supabase.client
        .from('ygoprodeck_cards')
        .select('*')
        .eq('id', idNum)
        .maybeSingle();
      if (data) return this.rowToCard(data as YgoprodeckCardRow);
    }

    const raw = await this.fetchCardInfo({ id });
    return raw.length > 0 ? this.toCard(raw[0]) : null;
  }

  async getCardsByIds(ids: string[]): Promise<Card[]> {
    if (ids.length === 0) return [];

    const idNums = ids.map(Number).filter((n) => Number.isFinite(n));
    const rows = await this.queryByColumn('id', idNums);
    if (rows.length > 0) return rows.map((row) => this.rowToCard(row));

    const raw = await this.fetchCardInfo({ id: ids.join(',') });
    return raw.map((card) => this.toCard(card));
  }

  async getPrints(name: string): Promise<Card[]> {
    // YGOPRODeck has no per-printing artwork/id like Scryfall - a card has
    // one canonical entry, so there's nothing meaningful to pick between.
    const { data } = await this.supabase.client
      .from('ygoprodeck_cards')
      .select('*')
      .eq('name', name)
      .maybeSingle();
    if (data) return [this.rowToCard(data as YgoprodeckCardRow)];

    const raw = await this.fetchCardInfo({ name });
    return raw.length > 0 ? [this.toCard(raw[0])] : [];
  }

  /**
   * Resolves an exact print code read off a physical card (e.g. from the
   * camera scanner's Gemini/Tesseract path - "SDAZ-DE001") straight to its
   * card. Local ygoprodeck_print_codes lookup first, live cardsetsinfo.php
   * fallback only on a local miss (not yet synced, or a genuinely new
   * print) - unlike identifyCard's fuzzy name search, a print code either
   * matches exactly or it doesn't, so there's no confidence score to weigh.
   */
  async identifyByPrintCode(code: string): Promise<Card | null> {
    const { data } = await this.supabase.client
      .from('ygoprodeck_print_codes')
      .select('card_id')
      .eq('set_code', code)
      .maybeSingle();
    if (data) return this.getCard(String((data as YgoprodeckPrintCodeRow).card_id));

    const response = await fetch(`${CARD_SETS_INFO_ENDPOINT}?setcode=${encodeURIComponent(code)}`);
    if (!response.ok) return null;

    const body: { id: number; name: string } | { error: string } = await response.json();
    if ('error' in body) return null;

    return this.getCard(String(body.id));
  }

  async identifyCard(rawText: string): Promise<CardIdentification | null> {
    const cleaned = cleanOcrText(rawText);
    if (!cleaned) return null;

    const localRows = await this.queryByColumn(
      'name',
      [],
      // A plain ilike scan (bounded, since ygoprodeck_cards is only ~13k
      // rows total - nowhere near scryfall_cards' size) rather than an
      // .in() batch - identifyCard's whole point is fuzzy OCR text that
      // won't equal any name exactly.
      `%${cleaned.replace(/[%_]/g, '\\$&')}%`,
    );

    let best: { row: YgoprodeckCardRow; confidence: number } | null = null;
    for (const row of localRows) {
      const confidence = similarity(cleaned, row.name);
      if (!best || confidence > best.confidence) best = { row, confidence };
    }
    if (best && best.confidence >= IDENTIFY_CONFIDENCE_THRESHOLD) {
      return { card: this.rowToCard(best.row), confidence: best.confidence };
    }

    const raw = await this.fetchCardInfo({ fname: cleaned });
    let bestRaw: { card: YgoRawCard; confidence: number } | null = null;
    for (const card of raw) {
      const confidence = similarity(cleaned, card.name);
      if (!bestRaw || confidence > bestRaw.confidence) bestRaw = { card, confidence };
    }

    if (!bestRaw || bestRaw.confidence < IDENTIFY_CONFIDENCE_THRESHOLD) return null;
    return { card: this.toCard(bestRaw.card), confidence: bestRaw.confidence };
  }

  async getCardsByNames(names: string[]): Promise<Card[]> {
    if (names.length === 0) return [];

    const rows = await this.queryByColumn('name', names);
    if (rows.length > 0) return rows.map((row) => this.rowToCard(row));

    const raw = await this.fetchCardInfo({ name: names.join('|') });
    return raw.map((card) => this.toCard(card));
  }

  private archetypesCache: Promise<string[]> | null = null;

  /** All known archetype/theme names - used to power theme-based browsing (Yu-Gi-Oh has no community-decklist API to draw on). Stays on the live API - a separate, low-traffic endpoint already cached client-side, not part of the card-data cache above. */
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

  /** Shared batching for an `.in(column, [...])` PostgREST query, or a single `.ilike(column, likePattern)` scan when likePattern is given - a failed batch is logged and skipped rather than failing the whole call. */
  private async queryByColumn(
    column: 'id' | 'name',
    values: (string | number)[],
    likePattern?: string,
  ): Promise<YgoprodeckCardRow[]> {
    if (likePattern) {
      const { data, error } = await this.supabase.client.from('ygoprodeck_cards').select('*').ilike(column, likePattern);
      if (error) {
        console.warn(`ygoprodeck_cards ${column} ilike failed:`, error);
        return [];
      }
      return (data ?? []) as YgoprodeckCardRow[];
    }

    const rows: YgoprodeckCardRow[] = [];
    for (let i = 0; i < values.length; i += POSTGRES_BATCH_SIZE) {
      const batch = values.slice(i, i + POSTGRES_BATCH_SIZE);
      const { data, error } = await this.supabase.client.from('ygoprodeck_cards').select('*').in(column, batch);
      if (error) {
        console.warn(`ygoprodeck_cards ${column} batch failed, skipping ${batch.length} row(s):`, error);
        continue;
      }
      rows.push(...((data ?? []) as YgoprodeckCardRow[]));
    }
    return rows;
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
      oracleId: null,
      name: raw.name,
      imageUrl: raw.card_images?.[0]?.image_url ?? null,
      imageUrlSmall: raw.card_images?.[0]?.image_url_small ?? null,
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

  /** Same shape as toCard(), sourced from a ygoprodeck_cards row instead of a raw YGOPRODeck API response. */
  private rowToCard(row: YgoprodeckCardRow): YugiohCard {
    return {
      game: 'yugioh',
      id: String(row.id),
      oracleId: null,
      name: row.name,
      imageUrl: row.image_url,
      imageUrlSmall: row.image_url_small,
      setName: row.set_name,
      rarity: row.rarity,
      prices: {
        eur: row.price_eur,
        eurFoil: null,
        usd: row.price_usd,
        usdFoil: null,
      },
      attribute: row.attribute,
      cardType: row.card_type,
      atk: row.atk,
      def: row.def,
      banlistStatus: row.banlist_status,
    };
  }
}
