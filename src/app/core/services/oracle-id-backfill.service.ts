import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { GameService } from './game.service';
import { MtgBulkDataService } from './mtg-bulk-data.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

const BATCH_SIZE = 50;
// A short breather between batches - not a rate-limit concern (every
// lookup here is local, see MtgBulkDataService.findById), just a courtesy
// so a huge backlog on first run doesn't fire hundreds of Supabase writes
// back-to-back in one tight loop.
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
 * re-add every card by hand. Resolves each row's oracle_id from the local
 * bulk-data cache (117k+ printings, already downloaded for the scanner) -
 * no Scryfall API call at all, so no rate limit to pace around. Kicked off
 * once from App's constructor; entirely non-blocking, batch by batch until
 * nothing is left, then quiet until the next full page load.
 */
@Injectable({ providedIn: 'root' })
export class OracleIdBackfillService {
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

    await Promise.all([this.supabase.ready, this.gameService.ready, this.mtgBulkData.ensureLoaded()]);
    // Nothing to backfill for a signed-out visitor (RLS would just return
    // nothing anyway) - and oracle_id is a Scryfall/MTG-only concept (see
    // card.model.ts), so this is scoped to the MTG game id specifically,
    // never Yu-Gi-Oh/Pokémon rows (which would never resolve one).
    if (!this.supabase.session()) return;
    // Without a warm local cache every lookup below would just return null -
    // rather than burn through the whole backlog doing nothing, wait for a
    // session where the cache actually loaded (see MtgBulkDataService;
    // App's constructor already kicks its own load off independently).
    if (!this.mtgBulkData.ready()) return;

    const mtgGameId = this.gameService.games().find((game) => game.slug === 'mtg')?.id;
    if (!mtgGameId) return;

    void this.runBatch(mtgGameId);
  }

  private async runBatch(mtgGameId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('collection_cards')
      .select('id, card_id')
      .eq('game_id', mtgGameId)
      .is('oracle_id', null)
      .limit(BATCH_SIZE)
      .returns<LegacyRow[]>();

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

    await Promise.all(
      data.map(async (row) => {
        try {
          // card_id is Scryfall's own print id (scryfall_id) for MTG rows -
          // findById is a plain local IndexedDB lookup by that same key,
          // no network call.
          const card = await this.mtgBulkData.findById(row.card_id);
          if (!card?.oracle_id) return;

          const { error: updateError } = await this.supabase.client
            .from('collection_cards')
            .update({ oracle_id: card.oracle_id })
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

    if (data.length === BATCH_SIZE) {
      setTimeout(() => void this.runBatch(mtgGameId), BATCH_PAUSE_MS);
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
