// Server-side proxy for the Scryfall API (api.scryfall.com) - the browser
// hits CORS errors calling it directly (most visibly the POST-based
// /cards/collection lookup, but true of every endpoint), so every call is
// routed through here and forwarded server-side. Mirrors Scryfall's own URL
// structure 1:1 - method, path, query string and body all pass through
// unchanged - so the client's request-building logic (see MtgApiService)
// doesn't need to change at all, only the base URL it targets.
//
// Deploy: supabase functions deploy scryfall-proxy

const SCRYFALL_BASE = 'https://api.scryfall.com';
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  // Without this, browsers can't cache a preflight OPTIONS result at all
  // (or only for a few seconds) and re-issue one before every single real
  // request - on a network where OPTIONS itself is unreliable (confirmed:
  // a user's connection could reach this function fine via a plain GET but
  // not via an authenticated call, which is preflighted), that means every
  // real call gets a fresh chance to hit the same flaky OPTIONS round trip.
  // 86400s (24h) is the widest most browsers actually honor.
  'Access-Control-Max-Age': '86400',
};

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Supabase routes "/functions/v1/scryfall-proxy/<rest>" (and, invoked
  // directly, just "/scryfall-proxy/<rest>") to this function with <rest>
  // preserved in the URL - strip everything up to and including the
  // function's own name, forward the remainder untouched.
  const targetPath = url.pathname.replace(/^.*\/scryfall-proxy/, '') || '/';
  const targetUrl = `${SCRYFALL_BASE}${targetPath}${url.search}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRYFALL_TIMEOUT_MS);
  try {
    const contentType = req.headers.get('content-type');
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { ...SCRYFALL_FETCH_HEADERS, ...(contentType ? { 'Content-Type': contentType } : {}) },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
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
