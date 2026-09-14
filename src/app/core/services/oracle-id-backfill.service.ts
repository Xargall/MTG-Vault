import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { GameService } from './game.service';
import { MtgApiService } from './mtg-api.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

const BATCH_SIZE = 50;
// A short breather between batches - not a rate-limit concern (every lookup
// here is a single batched scryfall_cards query, see MtgApiService.
// getCardsByIds), just a courtesy so a huge backlog on first run doesn't
// fire hundreds of Supabase writes back-to-back in one tight loop.
const BATCH_PAUSE_MS = 1000;

interface LegacyRow {
  id: string;
  card_id: string;
}

/**
 * Background migration for collection_cards rows added before the
 * oracle_id column existed (see 015_oracle_id_and_deck_binding.sql) -
 * fills them in a few at a time so deck-matching/substitution (see
 * deck-stats.ts) stops missing them, without the user having to re-scan or
 * re-add every card by hand. Resolves each row's oracle_id via
 * MtgApiService.getCardsByIds (scryfall_cards, kept fully synced server-side
 * by the daily sync workflow) - this used to go through MtgBulkDataService's
 * local IndexedDB cache instead (~600MB, built for the offline scanner),
 * which returns nothing for a card it hasn't downloaded/refreshed yet.
 * Live-confirmed: a recently-released set's cards came back unresolved that
 * way, and the cursor-paginated batching below (see runBatch's own comment)
 * treats a miss as permanent for the rest of this pass - a legacy row whose
 * only problem was cache staleness never got a second chance. Kicked off
 * once from App's constructor; entirely non-blocking, batch by batch until
 * nothing is left, then quiet until the next full page load.
 */
@Injectable({ providedIn: 'root' })
export class OracleIdBackfillService {
  private readonly supabase = inject(SupabaseService);
  private readonly gameService = inject(GameService);
  private readonly mtgApi = inject(MtgApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  private started = false;
  private backfilledAny = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await Promise.all([this.supabase.ready, this.gameService.ready]);
    // Nothing to backfill for a signed-out visitor (RLS would just return
    // nothing anyway) - and oracle_id is a Scryfall/MTG-only concept (see
    // card.model.ts), so this is scoped to the MTG game id specifically,
    // never Yu-Gi-Oh/Pokémon rows (which would never resolve one).
    if (!this.supabase.session()) return;

    const mtgGameId = this.gameService.games().find((game) => game.slug === 'mtg')?.id;
    if (!mtgGameId) return;

    void this.runBatch(mtgGameId, null);
  }

  /**
   * Pages by `id` (keyset pagination) rather than repeatedly re-querying
   * `oracle_id IS NULL` from the top - a resolved row leaves that filtered
   * set, but a row whose card_id isn't in scryfall_cards (e.g. a
   * retired/removed print) never does. Without a cursor, once 50+ such
   * permanently-unresolvable rows exist, every batch re-fetches the exact
   * same stuck rows, resolves none of them, stays at a full BATCH_SIZE
   * forever, and this loops every BATCH_PAUSE_MS indefinitely (the real
   * cause of a since-reported runaway request loop). Ordering + a `cursor`
   * argument guarantees a full forward pass over every row that was
   * unresolved at scan time, stuck ones included, and lets it actually
   * finish.
   */
  private async runBatch(mtgGameId: string, cursor: string | null): Promise<void> {
    let query = this.supabase.client
      .from('collection_cards')
      .select('id, card_id')
      .eq('game_id', mtgGameId)
      .is('oracle_id', null)
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);
    if (cursor) query = query.gt('id', cursor);

    const { data, error } = await query.returns<LegacyRow[]>();

    if (error) {
      // 42703 = PostgreSQL's "undefined_column" - almost certainly means
      // 015_oracle_id_and_deck_binding.sql hasn't been run against this
      // Supabase project yet (oracle_id/is_assigned don't exist there
      // yet). Logged once per app load rather than thrown, so a
      // not-yet-migrated project doesn't break anything else - this
      // service just quietly has nothing to do until the migration runs.
      if (error.code === '42703') {
        console.warn(
          'Oracle-ID-Backfill: Spalte fehlt noch in collection_cards - wurde supabase/sql/015_oracle_id_and_deck_binding.sql schon ausgeführt?',
          error,
        );
      } else {
        console.error('Oracle-ID-Backfill: Batch-Abfrage fehlgeschlagen', error);
      }
      this.finish();
      return;
    }
    if (!data || data.length === 0) {
      this.finish();
      return;
    }

    const resolved = await this.mtgApi.getCardsByIds(data.map((row) => row.card_id));
    const oracleIdByCardId = new Map(resolved.map((card) => [card.id, card.oracleId]));

    await Promise.all(
      data.map(async (row) => {
        try {
          const oracleId = oracleIdByCardId.get(row.card_id);
          if (!oracleId) return;

          const { error: updateError } = await this.supabase.client
            .from('collection_cards')
            .update({ oracle_id: oracleId })
            .eq('id', row.id);
          if (!updateError) this.backfilledAny = true;
        } catch (e) {
          // A single row failing shouldn't stop the rest of the batch -
          // just log and move on; it stays null and gets retried on the
          // next app start.
          console.error('Oracle-ID-Backfill fehlgeschlagen für Zeile', row.id, e);
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
    if (this.backfilledAny) {
      this.toast.show(this.translate.instant('collection.oracleBackfillDone'));
    }
  }
}
