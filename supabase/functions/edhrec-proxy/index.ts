// Server-side proxy for EDHREC's unofficial JSON API (json.edhrec.com) -
// EDHREC now blocks direct browser requests (403 Forbidden, presumably
// bot/hotlink protection keyed on the request's origin), so this fetches
// the same static JSON files server-side, on EDHREC's behalf, and hands
// them back unchanged. Same shape as gemini-ocr's proxy (see that file) -
// CORS headers, OPTIONS handling, a hard timeout so a hung upstream never
// produces a CORS-less platform timeout response.
//
// Deploy: supabase functions deploy edhrec-proxy

const EDHREC_BASE = 'https://json.edhrec.com';
const EDHREC_TIMEOUT_MS = 15000;
// Only ever these two page types are proxied - see EdhrecService
// (average-decks/{slug}.json, cards/{slug}.json) - rejecting anything else
// keeps this from becoming an open fetch-any-url-on-our-behalf proxy.
const ALLOWED_PATH_PATTERN = /^pages\/(average-decks|cards)\/[a-z0-9-]+\.json$/;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const { path } = (await req.json()) as { path?: string };
    if (!path || !ALLOWED_PATH_PATTERN.test(path)) {
      return jsonResponse({ error: 'Ungültiger EDHREC-Pfad' }, 400);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EDHREC_TIMEOUT_MS);
    let edhrecResponse: Response;
    try {
      edhrecResponse = await fetch(`${EDHREC_BASE}/${path}`, { signal: controller.signal });
    } catch (fetchError) {
      const timedOut = fetchError instanceof Error && fetchError.name === 'AbortError';
      return jsonResponse(
        { error: timedOut ? 'EDHREC-Anfrage hat zu lange gedauert' : 'Netzwerkfehler bei EDHREC-Anfrage' },
        504,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // EDHREC 404s for a card/commander with no page - forwarded as-is (an
    // empty cardlists array, same shape a real "nothing here" page returns)
    // rather than an error, so the client's existing 404-tolerant handling
    // (see EdhrecService.fetchPage) doesn't need to change.
    if (edhrecResponse.status === 404) {
      return jsonResponse({ container: { json_dict: { cardlists: [] } } }, 200);
    }
    if (!edhrecResponse.ok) {
      return jsonResponse({ error: `EDHREC-Anfrage fehlgeschlagen (${edhrecResponse.status})` }, edhrecResponse.status);
    }

    const data = await edhrecResponse.json();
    return jsonResponse(data);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }, 500);
  }
});
