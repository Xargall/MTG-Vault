import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';

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

const DIACRITICS_PATTERN = /[̀-ͯ]/g;

/**
 * EDHREC serves static, precomputed JSON files for both commander pages and
 * individual card pages, keyed by a slug derived from the card's name.
 * Direct cross-origin browser requests are now blocked (403) - see
 * fetchPage's edhrec-proxy Edge Function call below.
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
  private readonly supabase = inject(SupabaseService);

  private readonly averageDeckCache = new Map<string, Promise<EdhrecCard[]>>();
  private readonly cardCommandersCache = new Map<string, Promise<EdhrecCommanderHit[]>>();

  getAverageDeck(commanderName: string): Promise<EdhrecCard[]> {
    const slug = slugifyMtgName(commanderName);
    let cached = this.averageDeckCache.get(slug);
    if (!cached) {
      cached = this.fetchPage<EdhrecCard>(`pages/average-decks/${slug}.json`, (cardlists) =>
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
      cached = this.fetchPage<EdhrecCommanderHit>(`pages/cards/${slug}.json`, (cardlists) => {
        const topCommanders = cardlists.find((list) => list.tag === 'topcommanders');
        return (topCommanders?.cardviews ?? []).map((view) => ({ name: view.name }));
      });
      this.cardCommandersCache.set(slug, cached);
    }
    return cached;
  }

  /** Routed through the edhrec-proxy Supabase Edge Function, not a direct browser fetch - EDHREC now returns 403 for direct cross-origin requests (bot/hotlink protection), so this fetches server-side on the app's behalf, same as gemini-ocr does for Gemini Vision. `path` is EDHREC's own relative page path (e.g. "pages/average-decks/atraxa-praetors-voice.json"). */
  private async fetchPage<T>(
    path: string,
    extract: (cardlists: EdhrecCardlistRaw[]) => T[],
  ): Promise<T[]> {
    const { data, error } = await this.supabase.client.functions.invoke<EdhrecPageResponse & { error?: string }>(
      'edhrec-proxy',
      { body: { path } },
    );
    if (error) throw error;
    if (data?.error) throw new Error(`EDHREC-Anfrage fehlgeschlagen: ${data.error}`);

    return extract(data?.container?.json_dict?.cardlists ?? []);
  }
}
