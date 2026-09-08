import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { GameService } from './game.service';
import { MtgBulkDataService } from './mtg-bulk-data.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

const BATCH_SIZE = 50;
// Same courtesy pause as OracleIdBackfillService - every lookup here is
// local (see MtgBulkDataService.findById), just spacing out the Supabase
// writes for a large backlog.
const BATCH_PAUSE_MS = 1000;
// Unlike OracleIdBackfillService's `oracle_id IS NULL` filter, a genuinely
// normal card's card_category never stops matching `= 'normal'` - there's
// no column state that naturally shrinks the candidate set to zero once
// done. This flag is the substitute: once a full pass has run, skip
// re-scanning the same confirmed-normal cards on every later app start.
// Per-browser rather than per-account, but idempotent either way (a
// second run just finds nothing left to fix), so that's fine.
const DONE_STORAGE_KEY = 'mtg-vault-card-category-backfill-done';

interface LegacyRow {
  id: string;
  card_id: string;
}

/**
 * One-time background migration for collection_cards rows added while
 * token detection was broken (see MtgApiService.identifyByGeminiResult's
 * history) - they were saved with card_category = 'normal' instead of
 * 'token', which excludes them from the collection's "✨ Specials" bucket
 * (see card-category-stats.ts). Resolves each row's actual type_line from
 * the local bulk-data cache (same as OracleIdBackfillService - no Scryfall
 * API call at all) and corrects card_category when it says otherwise.
 * Kicked off once from App's constructor; entirely non-blocking, batch by
 * batch until nothing is left to check, then marks itself done.
 */
@Injectable({ providedIn: 'root' })
export class CardCategoryBackfillService {
  private readonly supabase = inject(SupabaseService);
  private readonly gameService = inject(GameService);
  private readonly mtgBulkData = inject(MtgBulkDataService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  private started = false;
  private backfilledAny = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (localStorage.getItem(DONE_STORAGE_KEY) === '1') return;

    await Promise.all([this.supabase.ready, this.gameService.ready, this.mtgBulkData.ensureLoaded()]);
    // Nothing to backfill for a signed-out visitor (RLS would just return
    // nothing anyway) - and card_category/type_line are MTG-only concepts
    // here (Yu-Gi-Oh/Pokémon cards are never tagged 'token' this way), so
    // this is scoped to the MTG game id specifically.
    if (!this.supabase.session()) return;
    // Without a warm local cache every lookup below would just return
    // null - rather than burn through the whole backlog doing nothing,
    // wait for a session where the cache actually loaded (see
    // MtgBulkDataService; App's constructor already kicks its own load
    // off independently).
    if (!this.mtgBulkData.ready()) return;

    const mtgGameId = this.gameService.games().find((game) => game.slug === 'mtg')?.id;
    if (!mtgGameId) return;

    void this.runBatch(mtgGameId, null);
  }

  /**
   * Pages by `id` (keyset pagination) rather than repeatedly re-querying
   * `card_category = 'normal'` from the top: a fixed row leaves that
   * filtered set, but a genuinely-normal one never does, so a plain
   * `.limit()` with no cursor would keep re-fetching the same still-normal
   * rows and (if none of a given page happen to be mis-tagged tokens)
   * stop dead before ever reaching further, still-unchecked legacy rows
   * beyond that first page. Ordering + a `cursor` argument guarantees a
   * full forward pass over every row that was 'normal' at scan time,
   * regardless of how many of them get fixed along the way.
   */
  private async runBatch(mtgGameId: string, cursor: string | null): Promise<void> {
    let query = this.supabase.client
      .from('collection_cards')
      .select('id, card_id')
      .eq('game_id', mtgGameId)
      .eq('card_category', 'normal')
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);
    if (cursor) query = query.gt('id', cursor);

    const { data, error } = await query.returns<LegacyRow[]>();

    if (error) {
      console.error('Card-Category-Backfill: Batch-Abfrage fehlgeschlagen', error);
      this.finish();
      return;
    }
    if (!data || data.length === 0) {
      this.finish();
      return;
    }

    await Promise.all(
      data.map(async (row) => {
        try {
          const card = await this.mtgBulkData.findById(row.card_id);
          if (!card?.type_line?.toLowerCase().includes('token')) return;

          const { error: updateError } = await this.supabase.client
            .from('collection_cards')
            .update({ card_category: 'token' })
            .eq('id', row.id);
          if (!updateError) this.backfilledAny = true;
        } catch (e) {
          console.error('Card-Category-Backfill fehlgeschlagen für Zeile', row.id, e);
        }
      }),
    );

    const nextCursor = data[data.length - 1].id;
    if (data.length === BATCH_SIZE) {
      setTimeout(() => void this.runBatch(mtgGameId, nextCursor), BATCH_PAUSE_MS);
    } else {
      this.finish();
    }
  }

  private finish() {
    localStorage.setItem(DONE_STORAGE_KEY, '1');
    if (this.backfilledAny) {
      this.toast.show(this.translate.instant('collection.oracleBackfillDone'));
    }
  }
}
