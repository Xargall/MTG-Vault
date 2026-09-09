// Server-side proxy for Gemini Vision. Keeps every Gemini API key out of the
// Angular client bundle entirely - a key only ever lives in Supabase Vault
// (per-user, set via the Settings page -> set_user_secret RPC, see
// supabase/sql/012_user_secrets.sql) or in this function's own environment
// (the shared fallback key, set via `supabase secrets set
// GEMINI_API_KEY=...` or the Dashboard's Edge Functions -> Secrets UI) -
// never in any file shipped to the browser.
//
// Deploy: supabase functions deploy gemini-ocr
// Secret (optional shared fallback): supabase secrets set GEMINI_API_KEY=<your-real-key>
//
// `verify_jwt` is left at its default (enabled) - Supabase's edge runtime
// rejects requests without a valid session JWT before this code even runs,
// so any logged-in or guest Supabase session already gates access. The
// caller's JWT is also decoded below (via SUPABASE_SERVICE_ROLE_KEY, which
// every edge function gets injected automatically) to resolve which user's
// Vault secret to look up - service_role is required since
// get_user_secret_for_service is deliberately not grantable to a plain
// user's own JWT (see the SQL file).
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2.112.4/cors';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
// Bounded well under Supabase's own platform-level request timeout (150s) -
// if Gemini itself hangs or is slow, the PLATFORM's timeout response carries
// no CORS headers at all, which the browser reports as a misleading "CORS
// policy" error instead of the real timeout. Failing fast here guarantees
// the client always gets an actual, CORS-safe response instead. 25s (rather
// than the earlier 15s) gives real camera images - much larger than a tiny
// test payload - realistic headroom for Gemini's actual vision processing time.
const GEMINI_TIMEOUT_MS = 25000;
// Chosen per-request by `game` (see below) - each prompt only ever mentions
// the one card format actually relevant, rather than asking Gemini to also
// figure out which TCG it's looking at. Keeps the already-tuned MTG prompt
// untouched.
const MTG_PROMPT = `Du siehst einen eng zugeschnittenen Bildausschnitt einer Magic: The Gathering Karte mit der Set-Code/Sammelnummer-Zeile.

Lies NUR den Set-Code (3 Großbuchstaben) und die Collector Number unten links dieser Karte.

Formate die vorkommen können:
- Normal neu:   "0082"        → Ausgabe: "MSH 82"
- Normal alt:   "082/350"     → Ausgabe: "MSH 82"
- Token neu:    "T 0003"      → Ausgabe: "MSH T3"
- Token alt:    "016/017 T"   → Ausgabe: "MSH T16"
- Token alt:    "017/017T"    → Ausgabe: "MSH T17"
- Halo neu:     "H 0020"      → Ausgabe: "MSH H20"
- Halo alt:     "020/020 H"   → Ausgabe: "MSH H20"
- Mit Rarität:  "U 0003"      → Ausgabe: "MSH 3"   (siehe unten - U ist KEIN Flag!)

Wichtig bei X/Y Format: IMMER nur X nehmen, nie Y!
Das einzige echte Flag ist T (Token) oder H (Halo/Reminder-Karte) - steht vor oder nach der Nummer.
Ein einzelner Buchstabe C, U, R oder M direkt vor/nach der Nummer ist KEIN Flag, sondern die Raritätsangabe
(Common/Uncommon/Rare/Mythic) - diesen Buchstaben komplett ignorieren, nicht mit T/H verwechseln.

Antworte NUR in diesem Format:
- Normale Karte: "MSH 82"
- Token-Karte:   "MSH T3"
- Halo-Karte:    "MSH H20"

Antworte NUR mit "UNKNOWN", wenn du dir nicht sicher bist oder nichts lesbares erkennst.
Keine weiteren Erklärungen, kein zusätzlicher Text.`;

const YUGIOH_PROMPT = `Du siehst einen eng zugeschnittenen Bildausschnitt einer Yu-Gi-Oh! Karte mit dem Karten-Code unten links oder unten rechts.
Der Code hat das Format "SETCODE-SPRACHE-NUMMER", z.B. "SDAZ-DE001" oder "LOB-EN001".

Lies NUR diesen Code, exakt wie aufgedruckt (Bindestrich, Sprachkürzel und führende Nullen der Nummer beibehalten).

Antworte NUR mit dem Code, z.B.: "SDAZ-DE001"

Antworte NUR mit "UNKNOWN", wenn du dir nicht sicher bist oder nichts lesbares erkennst.
Keine weiteren Erklärungen, kein zusätzlicher Text.`;

// Unlike MTG/Yu-Gi-Oh, Pokémon has no compact printed code to read (its
// card number, e.g. "025/198", isn't enough on its own to identify a card
// without also reading a set symbol icon) - so this reads the card's
// printed name instead, resolved client-side via the same fuzzy-name
// identifyCard() path used by the Tesseract-based automatic loop.
const POKEMON_PROMPT = `Du siehst ein Foto einer Pokémon-Sammelkarte.
Lies NUR den Namen des Pokémon (oder Trainer-/Energiekarten-Namen), so wie er oben auf der Karte aufgedruckt ist.

Antworte NUR mit dem Namen, z.B.: "Glurak" oder "Professor Eichs Forschung"

Antworte NUR mit "UNKNOWN", wenn du dir nicht sicher bist oder nichts lesbares erkennst.
Keine weiteren Erklärungen, kein zusätzlicher Text.`;

// Base headers from the SDK itself (@supabase/supabase-js/cors) rather than
// hand-maintained - stays in sync with whatever headers/methods the SDK
// actually sends, so a future SDK update can't silently start sending a
// header this function doesn't allow and break preflight again. Max-Age
// isn't part of that export, so it's added on top - see scryfall-proxy's
// copy of this comment for why it matters on a flaky connection.
const corsHeaders = {
  ...sdkCorsHeaders,
  'Access-Control-Max-Age': '86400',
};

/** The calling user's own Vault-stored key, via a service-role client that resolves their id from the request's own JWT (get_user_secret_for_service is only grantable to service_role, never to the user's own JWT - see supabase/sql/012_user_secrets.sql). Returns null on any failure (no session, no key on file, RPC/migration not applied yet) so the caller can fall through to the shared app key. */
async function resolveUserGeminiKey(req: Request): Promise<string | null> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!jwt) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData } = await adminClient.auth.getUser(jwt);
    const userId = userData?.user?.id;
    if (!userId) return null;

    const { data } = await adminClient.rpc('get_user_secret_for_service', {
      p_user_id: userId,
      p_secret_name: 'gemini_api_key',
    });
    return typeof data === 'string' && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

/** "Key testen" in Settings: validates a not-yet-saved key by listing models - cheap (no vision payload/cost) and gives an immediate valid/invalid answer before the user commits to saving it. */
async function testApiKey(apiKey: string): Promise<Response> {
  try {
    const response = await fetch(`${GEMINI_API_BASE}/v1beta/models?key=${apiKey}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ valid: false, error: 'Ungültiger API Key' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ valid: false, error: 'Gemini konnte nicht erreicht werden' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as { imageBase64?: string; game?: string; testApiKey?: string };

    if (body.testApiKey) {
      return await testApiKey(body.testApiKey);
    }

    const { imageBase64, game } = body;
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 fehlt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const prompt = game === 'yugioh' ? YUGIOH_PROMPT : game === 'pokemon' ? POKEMON_PROMPT : MTG_PROMPT;

    const apiKey = (await resolveUserGeminiKey(req)) ?? Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'NO_API_KEY',
          message: 'Bitte hinterlege deinen Gemini API Key in den Einstellungen',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(
        `${GEMINI_API_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }, { text: prompt }],
              },
            ],
          }),
          signal: controller.signal,
        },
      );
    } catch (fetchError) {
      const timedOut = fetchError instanceof Error && fetchError.name === 'AbortError';
      return new Response(
        JSON.stringify({
          error: timedOut ? 'Gemini-Anfrage hat zu lange gedauert' : 'Netzwerkfehler bei Gemini-Anfrage',
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text();
      return new Response(JSON.stringify({ error: 'Gemini-Anfrage fehlgeschlagen', detail }), {
        status: geminiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await geminiResponse.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return new Response(JSON.stringify({ text: text?.trim() ?? 'UNKNOWN' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
