// Server-side proxy that scrapes MTGO's own public decklist pages
// (mtgo.com/decklists, mtgo.com/decklist/{slug}). MTGO support confirmed by
// email (2026-09-15) that scraping these published pages is within their
// terms of service - there's no additional data feed beyond what's already
// public there, and no permission step needed beyond that. Same shape as
// edhrec-proxy/moxfield-proxy (CORS headers, OPTIONS handling, hard
// timeout) - see those for the pattern this follows.
//
// Two modes:
//  'events' - the format's most recent Challenge-tier events, parsed from
//             the current month's /decklists listing page.
//  'event'  - one event's full decklists (every player's mainboard +
//             sideboard), parsed from that event's own page.
//
// Deploy: supabase functions deploy mtgo-proxy

import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2.112.4/cors';
import { parse } from 'npm:node-html-parser@6.1.13';

const MTGO_BASE = 'https://www.mtgo.com';
const MTGO_TIMEOUT_MS = 15000;
// A plain server-to-server fetch with no browser-like headers risks a
// trivial bot-detection block regardless of MTGO's confirmation that
// scraping itself is fine - same reasoning as edhrec-proxy's own headers.
const MTGO_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html',
};

const FORMAT_PATTERN = /^[a-z]{1,20}$/;
// A real event slug as it appears in mtgo.com's own decklist links, e.g.
// "standard-challenge-32-2026-09-1412854105" - opaque, not parsed further.
const EVENT_SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;
// How many of a format's most recent Challenge events to hand back - a
// single Challenge event already lists every entrant's full decklist
// (confirmed live: 32 decks in one "Standard Challenge 32"), so this is
// mostly a freshness/redundancy margin, not a volume need.
const MAX_EVENTS = 8;

const corsHeaders = {
  ...sdkCorsHeaders,
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchHtml(url: string): Promise<{ html: string } | { error: string; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MTGO_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: MTGO_FETCH_HEADERS });
    if (!response.ok) {
      return { error: `MTGO-Anfrage fehlgeschlagen (${response.status})`, status: response.status };
    }
    return { html: await response.text() };
  } catch (fetchError) {
    const timedOut = fetchError instanceof Error && fetchError.name === 'AbortError';
    return {
      error: timedOut ? 'MTGO-Anfrage hat zu lange gedauert' : 'Netzwerkfehler bei MTGO-Anfrage',
      status: 504,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

interface MtgoEvent {
  slug: string;
  title: string;
}

function parseEvents(html: string, format: string): MtgoEvent[] {
  const root = parse(html);
  const links = root.querySelectorAll(`a[href^="/decklist/${format}-challenge-"]`);
  const seen = new Set<string>();
  const events: MtgoEvent[] = [];
  for (const link of links) {
    const href = link.getAttribute('href') ?? '';
    const slug = href.replace(/^\/decklist\//, '');
    if (!slug || seen.has(slug) || !EVENT_SLUG_PATTERN.test(slug)) continue;
    seen.add(slug);
    events.push({ slug, title: link.text.trim().replace(/\s+/g, ' ') });
    if (events.length >= MAX_EVENTS) break;
  }
  return events;
}

interface MtgoDeckCard {
  name: string;
  quantity: number;
}

interface MtgoDeck {
  player: string;
  // Sortable placement: the final playoff rank when the player made the
  // playoff bracket (rankType 'final', typically the top 8), otherwise
  // their swiss-stage standing (rankType 'swiss') - never both, since a
  // Challenge event's own JSON only lists non-playoff finishers in
  // "standings". null for either when the event has no rank data at all.
  rank: number | null;
  rankType: 'final' | 'swiss' | null;
  mainboard: MtgoDeckCard[];
  sideboard: MtgoDeckCard[];
}

// The event page itself doesn't render its decklists server-side - it ships
// the full tournament as one inline JSON blob (`window.MTGO.decklists.data`)
// that a client-side Underscore.js template then renders into the DOM
// (confirmed live: the raw HTML only contains unrendered `<%- data.x %>`
// template tags, not real content). Parsing that JSON directly is both
// simpler and far more robust than scraping the rendered-DOM class
// structure, which this function did at first before that was discovered.
function extractEmbeddedData(html: string): Record<string, unknown> | null {
  const marker = 'window.MTGO.decklists.data = ';
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const jsonStart = markerIndex + marker.length;
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let jsonEnd = -1;
  for (let i = jsonStart; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === stringChar) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      continue;
    }
    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }
  if (jsonEnd === -1) return null;

  try {
    return JSON.parse(html.slice(jsonStart, jsonEnd));
  } catch {
    return null;
  }
}

function toCards(entries: unknown): MtgoDeckCard[] {
  if (!Array.isArray(entries)) return [];
  const cards: MtgoDeckCard[] = [];
  for (const entry of entries) {
    const record = entry as { qty?: unknown; card_attributes?: { card_name?: unknown } };
    const name = String(record.card_attributes?.card_name ?? '').trim();
    const quantity = Number(record.qty ?? 0);
    if (name && quantity > 0) cards.push({ name, quantity });
  }
  return cards;
}

function parseEventDecks(html: string): { title: string; decks: MtgoDeck[] } {
  const data = extractEmbeddedData(html);
  if (!data) return { title: '', decks: [] };

  // final_rank only lists playoff participants (typically the top 8) -
  // everyone else's placement comes from the swiss-stage standings' own
  // rank field instead.
  const finalRankByLogin = new Map<string, number>();
  for (const entry of (data.final_rank as unknown[]) ?? []) {
    const record = entry as { loginid?: unknown; rank?: unknown };
    if (record.loginid != null) finalRankByLogin.set(String(record.loginid), Number(record.rank));
  }
  const swissRankByLogin = new Map<string, number>();
  for (const entry of (data.standings as unknown[]) ?? []) {
    const record = entry as { loginid?: unknown; rank?: unknown };
    if (record.loginid != null) swissRankByLogin.set(String(record.loginid), Number(record.rank));
  }

  const decks: MtgoDeck[] = [];
  for (const entry of (data.decklists as unknown[]) ?? []) {
    const record = entry as { loginid?: unknown; player?: unknown; main_deck?: unknown; sideboard_deck?: unknown };
    const player = String(record.player ?? '').trim();
    const mainboard = toCards(record.main_deck);
    if (!player || mainboard.length === 0) continue;

    const loginId = String(record.loginid ?? '');
    const finalRank = finalRankByLogin.get(loginId);
    const swissRank = swissRankByLogin.get(loginId);
    const [rank, rankType]: [number | null, MtgoDeck['rankType']] =
      finalRank !== undefined ? [finalRank, 'final'] : swissRank !== undefined ? [swissRank, 'swiss'] : [null, null];

    decks.push({ player, rank, rankType, mainboard, sideboard: toCards(record.sideboard_deck) });
  }

  return { title: String(data.description ?? ''), decks };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      mode?: 'events' | 'event';
      format?: string;
      slug?: string;
    };

    if (body.mode === 'event') {
      if (!body.slug || !EVENT_SLUG_PATTERN.test(body.slug)) {
        return jsonResponse({ error: 'Ungültiger Event-Slug' }, 400);
      }
      const result = await fetchHtml(`${MTGO_BASE}/decklist/${body.slug}`);
      if ('error' in result) return jsonResponse({ error: result.error }, result.status);
      return jsonResponse(parseEventDecks(result.html));
    }

    if (!body.format || !FORMAT_PATTERN.test(body.format)) {
      return jsonResponse({ error: 'Ungültiges Format' }, 400);
    }
    const result = await fetchHtml(`${MTGO_BASE}/decklists`);
    if ('error' in result) return jsonResponse({ error: result.error }, result.status);
    return jsonResponse({ events: parseEvents(result.html, body.format) });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }, 500);
  }
});
