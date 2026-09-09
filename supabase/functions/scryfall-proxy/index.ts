// Server-side proxy for the Scryfall API (api.scryfall.com) - the browser
// hits CORS errors calling it directly (most visibly the POST-based
// /cards/collection lookup, but true of every endpoint), so every call is
// routed through here and forwarded server-side. Mirrors Scryfall's own URL
// structure 1:1 - method, path, query string and body all pass through
// unchanged - so the client's request-building logic (see MtgApiService)
// doesn't need to change at all, only the base URL it targets.
//
// Deploy: supabase functions deploy scryfall-proxy

import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2.112.4/cors';

const SCRYFALL_BASE = 'https://api.scryfall.com';
// Bulk card-data files (the local scanner cache, see MtgBulkDataService)
// live on a separate host from the rest of the API and - unlike
// api.scryfall.com - serve every file with `Content-Disposition:
// attachment`. WebKit/Safari's fetch() has documented issues with
// attachment-disposition cross-origin responses (confirmed live: a direct
// browser download of the exact same URL always succeeds, while every
// fetch() attempt from the app fails instantly, on iOS only) - routed
// through here so that header never reaches the client's fetch() call.
// Strictly whitelisted to this one host and to GET - this function must
// never become an open proxy for arbitrary URLs.
const BULK_DATA_HOST = 'https://data.scryfall.io';
const BULK_FILE_PREFIX = '/bulk-file';
const BULK_FILE_TIMEOUT_MS = 60000;
// Was 15s. NB: this only bounds *this function's own* outbound call to
// Scryfall (Supabase's edge region to api.scryfall.com) - it has no effect
// on how long a client takes to reach Supabase in the first place, which a
// slow/degraded mobile connection is a separate, likely bigger factor in
// (a 504 seen consistently on mobile but not on a better connection could
// be either side). Widened as one cheap thing that can only help, not a
// confirmed fix for that report.
const SCRYFALL_TIMEOUT_MS = 25000;
// Scryfall's API guidelines require a real identifying User-Agent and an
// Accept header on every request (missing either risks a 403) - the client
// tried to set this itself, but browsers largely ignore a script-set
// 'User-Agent' on fetch(); set for real here instead.
const SCRYFALL_FETCH_HEADERS = {
  'User-Agent': 'TCGVault/1.0 (mathias-mayer.de)',
  Accept: 'application/json',
};

// Base headers from the SDK itself (@supabase/supabase-js/cors) rather than
// hand-maintained - see gemini-ocr's copy of this comment. Max-Age isn't
// part of that export: without it, browsers can't cache a preflight OPTIONS
// result at all (or only for a few seconds) and re-issue one before every
// single real request - on a network where OPTIONS itself is unreliable
// (confirmed: a user's connection could reach this function fine via a
// plain GET but not via an authenticated call, which is preflighted), that
// means every real call gets a fresh chance to hit the same flaky OPTIONS
// round trip. 86400s (24h) is the widest most browsers actually honor.
const corsHeaders = {
  ...sdkCorsHeaders,
  'Access-Control-Max-Age': '86400',
};

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * GET-only relay to data.scryfall.io, whitelisted to that one host (path is
 * whatever followed BULK_FILE_PREFIX, e.g. "/default-cards/xxx.jsonl.gz" -
 * never taken from anywhere else in the request, so this can't be used to
 * fetch arbitrary URLs). Streams the body straight through rather than
 * buffering it (unlike the JSON API responses below, this is a large binary
 * file) and, critically, does NOT forward Content-Disposition - see
 * BULK_DATA_HOST's comment for why that header is the whole point of this
 * existing separately from the plain API proxying above.
 */
async function proxyBulkFile(req: Request, path: string, search: string): Promise<Response> {
  if (req.method !== 'GET') return errorResponse('Methode nicht erlaubt', 405);

  const targetUrl = `${BULK_DATA_HOST}${path}${search}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BULK_FILE_TIMEOUT_MS);
  try {
    const response = await fetch(targetUrl, { headers: SCRYFALL_FETCH_HEADERS, signal: controller.signal });
    if (!response.ok || !response.body) {
      return errorResponse('Bulk-Data-Download fehlgeschlagen', response.status || 502);
    }

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', response.headers.get('content-type') ?? 'application/gzip');
    const contentLength = response.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return errorResponse(
      timedOut ? 'Bulk-Data-Anfrage hat zu lange gedauert' : 'Netzwerkfehler bei Bulk-Data-Anfrage',
      504,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req: Request) => {
  console.log('Request received:', req.method);
  console.log('Request URL:', req.url);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Supabase routes "/functions/v1/scryfall-proxy/<rest>" (and, invoked
  // directly, just "/scryfall-proxy/<rest>") to this function with <rest>
  // preserved in the URL - strip everything up to and including the
  // function's own name, forward the remainder untouched.
  const targetPath = url.pathname.replace(/^.*\/scryfall-proxy/, '') || '/';

  if (targetPath.startsWith(BULK_FILE_PREFIX)) {
    return proxyBulkFile(req, targetPath.slice(BULK_FILE_PREFIX.length), url.search);
  }

  const targetUrl = `${SCRYFALL_BASE}${targetPath}${url.search}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRYFALL_TIMEOUT_MS);
  try {
    console.log('Forwarding to Scryfall...');
    const isBodied = req.method !== 'GET' && req.method !== 'HEAD';
    // The client deliberately sends 'text/plain' instead of 'application/
    // json' (see MtgApiService.scryfallFetch) - 'application/json' isn't a
    // CORS-safelisted content-type, so it forces a preflight on every POST;
    // 'text/plain' doesn't. Scryfall itself still needs the real
    // content-type to parse the (always-JSON, see fetchCollection) body
    // correctly, so it's hardcoded here rather than forwarded verbatim from
    // the client's (deliberately misleading) header.
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { ...SCRYFALL_FETCH_HEADERS, ...(isBodied ? { 'Content-Type': 'application/json' } : {}) },
      body: isBodied ? await req.text() : undefined,
      signal: controller.signal,
    });

    console.log('Scryfall response status:', response.status);
    console.log('Scryfall response headers:', Object.fromEntries(response.headers));

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return errorResponse(
      timedOut ? 'Scryfall-Anfrage hat zu lange gedauert' : 'Netzwerkfehler bei Scryfall-Anfrage',
      504,
    );
  } finally {
    clearTimeout(timeoutId);
  }
});
