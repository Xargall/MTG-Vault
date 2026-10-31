// Shared by sync-scryfall-cards.mjs and sync-ygoprodeck-cards.mjs - both
// push rows into a Supabase table in batches of 500 via PostgREST's
// upsert-on-conflict ("resolution=merge-duplicates"), with the same 3-
// attempt retry: a batch that fails outright used to fail the whole run,
// confirmed live on a run where the actual cause was a transient 504 from
// PostgREST, not bad data, and the exact same batch would very likely have
// gone through a few seconds later.

export const BATCH_SIZE = 500;
export const MAX_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 2000;

export async function upsertBatch(table, batch) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(batch),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`upsert into ${table} failed (${response.status}): ${body}`);
  }
}

export async function upsertBatchWithRetry(table, batch) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await upsertBatch(table, batch);
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      console.error(`Batch of ${batch.length} into ${table} failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
}
