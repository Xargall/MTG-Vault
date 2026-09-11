// Server-side proxy for Moxfield's unofficial deck-search JSON API
// (api2.moxfield.com) - same shape/reasoning as edhrec-proxy: a bare
// server-to-server request gets Cloudflare-blocked, so this attaches a real
// browser's User-Agent/Accept/Referer/Origin, matching what a visit to
// moxfield.com itself would send.
//
// Deploy: supabase functions deploy moxfield-proxy
//
// SPIKE NOTE: this endpoint and its response shape are reverse-engineered
// (no official Moxfield API/docs exist) - see
// ~/.claude/plans/crispy-gathering-wand.md. Only wired up far enough to
// verify the real response shape live; MoxfieldService and everything
// downstream of it comes next, once that's confirmed.

import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2.112.4/cors';

const MOXFIELD_BASE = 'https://api2.moxfield.com';
const MOXFIELD_TIMEOUT_MS = 15000;
const MOXFIELD_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://www.moxfield.com/',
  Origin: 'https://www.moxfield.com',
};

// Only two Moxfield endpoints, and only with a small whitelisted set of
// params - never an open fetch-any-url-on-our-behalf proxy.
//
// Deck search's real query params are sortType/sortDirection, not a single
// "sort" convenience (confirmed against the moxfield-api TS library's own
// SORT_MAP, since Moxfield has no official docs) - mirrored here rather
// than reinvented.
const SORT_MAP: Record<string, { sortType: string; sortDirection: string }> = {
  mostLiked: { sortType: 'likes', sortDirection: 'descending' },
  mostViewed: { sortType: 'views', sortDirection: 'descending' },
  recent: { sortType: 'updated', sortDirection: 'descending' },
};
const FORMAT_PATTERN = /^[a-z0-9]{1,30}$/;
const HUB_NAME_PATTERN = /^[a-zA-Z0-9 '-]{1,60}$/;
const MAX_PAGE_SIZE = 20;
// A Moxfield publicId as it appears in a deck's own publicUrl - opaque
// alphanumeric token, not a UUID.
const DECK_ID_PATTERN = /^[a-zA-Z0-9_-]{1,40}$/;

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      // 'search': deck-search.  'deck': one full deck by id (mainboard etc.)
      mode?: 'search' | 'deck';
      fmt?: string;
      hubName?: string;
      sort?: keyof typeof SORT_MAP;
      pageSize?: number;
      pageNumber?: number;
      deckId?: string;
    };

    let moxfieldUrl: string;
    if (body.mode === 'deck') {
      if (!body.deckId || !DECK_ID_PATTERN.test(body.deckId)) {
        return jsonResponse({ error: 'Ungültige Deck-ID' }, 400);
      }
      moxfieldUrl = `${MOXFIELD_BASE}/v3/decks/all/${body.deckId}`;
    } else {
      if (!body.fmt || !FORMAT_PATTERN.test(body.fmt)) {
        return jsonResponse({ error: 'Ungültiges Format' }, 400);
      }
      if (body.hubName !== undefined && !HUB_NAME_PATTERN.test(body.hubName)) {
        return jsonResponse({ error: 'Ungültiger Hub-Name' }, 400);
      }

      const { sortType, sortDirection } = SORT_MAP[body.sort ?? 'mostLiked'] ?? SORT_MAP.mostLiked;
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(body.pageSize ?? 20)));
      const pageNumber = Math.max(1, Math.floor(body.pageNumber ?? 1));

      const params = new URLSearchParams({
        fmt: body.fmt,
        sortType,
        sortDirection,
        pageSize: String(pageSize),
        pageNumber: String(pageNumber),
      });
      if (body.hubName) params.set('hubName', body.hubName);
      moxfieldUrl = `${MOXFIELD_BASE}/v2/decks/search?${params.toString()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MOXFIELD_TIMEOUT_MS);
    let moxfieldResponse: Response;
    try {
      moxfieldResponse = await fetch(moxfieldUrl, {
        signal: controller.signal,
        headers: MOXFIELD_FETCH_HEADERS,
      });
    } catch (fetchError) {
      const timedOut = fetchError instanceof Error && fetchError.name === 'AbortError';
      return jsonResponse(
        { error: timedOut ? 'Moxfield-Anfrage hat zu lange gedauert' : 'Netzwerkfehler bei Moxfield-Anfrage' },
        504,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!moxfieldResponse.ok) {
      return jsonResponse(
        { error: `Moxfield-Anfrage fehlgeschlagen (${moxfieldResponse.status})` },
        moxfieldResponse.status,
      );
    }

    const data = await moxfieldResponse.json();
    return jsonResponse(data);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }, 500);
  }
});
