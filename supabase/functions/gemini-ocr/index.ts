// Server-side proxy for Gemini Vision. Keeps the Gemini API key out of the
// Angular client bundle entirely - the key only ever lives in this
// function's environment (set via `supabase secrets set GEMINI_API_KEY=...`
// or the Dashboard's Edge Functions -> Secrets UI), never in any file that
// ends up shipped to the browser.
//
// Deploy: supabase functions deploy gemini-ocr
// Secret: supabase secrets set GEMINI_API_KEY=<your-real-key>
//
// `verify_jwt` is left at its default (enabled) - Supabase's edge runtime
// rejects requests without a valid session JWT before this code even runs,
// so any logged-in or guest Supabase session already gates access; there is
// no need to re-check auth manually here.

const GEMINI_MODEL = 'gemini-3.5-flash';
// Bounded well under Supabase's own platform-level request timeout (150s) -
// if Gemini itself hangs or is slow, the PLATFORM's timeout response carries
// no CORS headers at all, which the browser reports as a misleading "CORS
// policy" error instead of the real timeout. Failing fast here guarantees
// the client always gets an actual, CORS-safe response instead. 25s (rather
// than the earlier 15s) gives real camera images - much larger than a tiny
// test payload - realistic headroom for Gemini's actual vision processing time.
const GEMINI_TIMEOUT_MS = 25000;
const PROMPT = `Du siehst einen eng zugeschnittenen Bildausschnitt einer Magic: The Gathering Karte mit der Set-Code/Sammlenummer-Zeile.
Antworte NUR mit "SETCODE NUMMER" (z.B. "MSH 82"), wenn du beides klar erkennen kannst.
Antworte NUR mit "UNKNOWN", wenn du dir nicht sicher bist oder nichts lesbares erkennst.
Keine weiteren Erklärungen, kein zusätzlicher Text.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = (await req.json()) as { imageBase64?: string };
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 fehlt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY ist nicht gesetzt' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Testing connectivity...');
    try {
      const testResponse = await fetch('https://generativelanguage.googleapis.com', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      console.log('Connectivity test status:', testResponse.status);
    } catch (connectivityError) {
      console.log('Connectivity test failed:', connectivityError);
    }

    console.log('Calling Gemini with model:', GEMINI_MODEL);
    console.log('API Key present:', !!apiKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }, { text: PROMPT }],
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
    console.log('Gemini raw response:', JSON.stringify(data));
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
