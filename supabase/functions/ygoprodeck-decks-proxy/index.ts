// Server-side proxy for YGOPRODeck's own unofficial deck-browsing JSON API
// (ygoprodeck.com/api/decks/getDecks.php) - the same endpoint
// deck-search/?_sft_category=... on ygoprodeck.com itself calls to render
// its deck list, confirmed live via browser network inspection
// (2026-10-28). No official docs, no CORS header on the response, so a
// browser can't call it directly - same reasoning as moxfield-proxy/
// edhrec-proxy. Unlike those two, this needs no special User-Agent grant:
// a plain server-side fetch (no browser fingerprint) returns 200 with real
// data - confirmed live, not just assumed.
//
// Deploy: supabase functions deploy ygoprodeck-decks-proxy

import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2.112.4/cors';

const BASE_URL = 'https://ygoprodeck.com/api/decks/getDecks.php';
const FETCH_TIMEOUT_MS = 15000;
const FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; TCGVaultBot/1.0; +https://ygoprodeck.com)',
};

// Only the real `_sft_category` values the live `filter-format` <select> on
// ygoprodeck.com/deck-search/ offers (confirmed live, 2026-10-28 and
// re-confirmed non-empty one by one, same day, when the client picker grew
// to cover the full "Competitive"/"Alternative Formats" optgroups, then
// again to add Anime/Fun-Casual back on request) - never an open
// fetch-any-category proxy. 'Tournament Meta Decks (Genesys OCG)' is a
// real option in that <select> too but was left out here: it returned
// zero decks live.
const ALLOWED_CATEGORIES = new Set([
  'Tournament Meta Decks',
  'Tournament Meta Decks OCG',
  'Tournament Meta Decks Worlds',
  'Tournament Meta Decks (Genesys)',
  'meta decks',
  'non-meta decks',
  'theorycrafting decks',
  'master duel decks',
  'genesys decks',
  'speed duel decks',
  'goat format decks',
  'edison format decks',
  'domain format decks',
  'trinity format decks',
  'worlds format decks',
  'world championship decks',
  'anime decks',
  'fun/casual decks',
]);
const ALLOWED_SORTS = new Set(['Deck Views', 'Date', 'Comments', 'Updated']);
const MAX_LIMIT = 25;

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

// getDecks.php's main_deck/extra_deck/side_deck each come back as a JSON
// *string* of card-id strings, one entry per physical copy (duplicates
// repeated) - e.g. "[\"46986414\",\"46986414\",...]". Parsed and collapsed
// into {cardId, quantity} here so the client never has to do that parsing
// itself.
function toQuantities(raw: string | null | undefined): { cardId: string; quantity: number }[] {
  if (!raw) return [];
  let ids: unknown;
  try {
    ids = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(ids)) return [];

  const counts = new Map<string, number>();
  for (const id of ids) {
    const cardId = String(id);
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }
  return [...counts.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
}

interface RawDeck {
  deckNum: number;
  deck_name: string;
  format: string | null;
  deck_views: number | null;
  deck_price: string | null;
  pretty_url: string | null;
  main_deck?: string | null;
  extra_deck?: string | null;
  side_deck?: string | null;
  tournamentName?: string | null;
  tournamentPlacement?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      category?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    };

    if (!body.category || !ALLOWED_CATEGORIES.has(body.category)) {
      return jsonResponse({ error: 'Ungültige Kategorie' }, 400);
    }
    const sort = body.sort && ALLOWED_SORTS.has(body.sort) ? body.sort : 'Deck Views';
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(body.limit ?? MAX_LIMIT)));
    const offset = Math.max(0, Math.floor(body.offset ?? 0));

    const params = new URLSearchParams({
      _sft_category: body.category,
      sort,
      limit: String(limit),
      offset: String(offset),
    });
    const url = `${BASE_URL}?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal, headers: FETCH_HEADERS });
    } catch (fetchError) {
      const timedOut = fetchError instanceof Error && fetchError.name === 'AbortError';
      return jsonResponse(
        { error: timedOut ? 'YGOPRODeck-Anfrage hat zu lange gedauert' : 'Netzwerkfehler bei YGOPRODeck-Anfrage' },
        504,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return jsonResponse({ error: `YGOPRODeck-Anfrage fehlgeschlagen (${response.status})` }, response.status);
    }

    const rawDecks = (await response.json()) as RawDeck[];
    const decks = rawDecks.map((deck) => ({
      deckNum: deck.deckNum,
      name: deck.deck_name,
      format: deck.format,
      views: deck.deck_views,
      price: deck.deck_price,
      prettyUrl: deck.pretty_url,
      tournamentName: deck.tournamentName ?? null,
      tournamentPlacement: deck.tournamentPlacement ?? null,
      mainDeck: toQuantities(deck.main_deck),
      extraDeck: toQuantities(deck.extra_deck),
      sideDeck: toQuantities(deck.side_deck),
    }));

    return jsonResponse(decks);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }, 500);
  }
});
