// Server-side proxy for Commander Spellbook's public `/estimate-bracket`
// API (backend.commanderspellbook.com) - confirmed live that the endpoint
// itself needs no auth despite its OpenAPI schema listing security schemes,
// but its preflight response carries no Access-Control-Allow-Origin header
// at all, so a direct browser call is blocked by CORS the same way EDHREC's
// and Moxfield's are (see edhrec-proxy/moxfield-proxy's own doc comments).
// Only ever forwards a plain {main, commanders} decklist - this app computes
// its own WotC bracket 1-5 classification from the response's per-card
// gameChanger/massLandDenial/extraTurn flags and its combos list (see
// commander-bracket.ts); Commander Spellbook's own bracketTag field is
// ignored, it's a different, unofficial classification.
//
// Deploy: supabase functions deploy commanderspellbook-proxy

import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2.112.4/cors';

const CS_BASE = 'https://backend.commanderspellbook.com';
const CS_TIMEOUT_MS = 15000;
// Mirrors the real API's own DeckRequest limits (see its OpenAPI schema) -
// rejecting an oversized payload here before it ever reaches Commander
// Spellbook, not just relying on its own validation.
const MAX_MAIN_CARDS = 600;
const MAX_COMMANDERS = 12;
const MAX_CARD_NAME_LENGTH = 256;

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

interface CardInDeck {
  card: string;
  quantity: number;
}

function isValidCardList(value: unknown, maxItems: number): value is CardInDeck[] {
  if (!Array.isArray(value) || value.length > maxItems) return false;
  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as CardInDeck).card === 'string' &&
      (item as CardInDeck).card.length > 0 &&
      (item as CardInDeck).card.length <= MAX_CARD_NAME_LENGTH &&
      Number.isInteger((item as CardInDeck).quantity) &&
      (item as CardInDeck).quantity >= 1,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as { main?: unknown; commanders?: unknown };

    if (!isValidCardList(body.main, MAX_MAIN_CARDS)) {
      return jsonResponse({ error: 'Ungültige Hauptdeck-Kartenliste' }, 400);
    }
    if (!isValidCardList(body.commanders, MAX_COMMANDERS)) {
      return jsonResponse({ error: 'Ungültige Commander-Liste' }, 400);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CS_TIMEOUT_MS);
    let csResponse: Response;
    try {
      csResponse = await fetch(`${CS_BASE}/estimate-bracket`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ main: body.main, commanders: body.commanders }),
      });
    } catch (fetchError) {
      const timedOut = fetchError instanceof Error && fetchError.name === 'AbortError';
      return jsonResponse(
        {
          error: timedOut
            ? 'Commander-Spellbook-Anfrage hat zu lange gedauert'
            : 'Netzwerkfehler bei Commander-Spellbook-Anfrage',
        },
        504,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!csResponse.ok) {
      return jsonResponse(
        { error: `Commander-Spellbook-Anfrage fehlgeschlagen (${csResponse.status})` },
        csResponse.status,
      );
    }

    const data = await csResponse.json();
    return jsonResponse(data);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }, 500);
  }
});
