import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { GameService } from './game.service';
import { MtgApiService } from './mtg-api.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

const BATCH_SIZE = 50;
// Extra pacing on top of MtgApiService's own rate-limited queue - this runs
// entirely unattended in the background, so there's no reason to push the
// per-request rate any harder than the scanner itself would.
const PER_ROW_DELAY_MS = 150;
const BATCH_PAUSE_MS = 5000;

interface LegacyRow {
  id: string;
  card_id: string;
}

/**
 * Background migration for collection_cards rows added before the
 * oracle_id column existed (see 015_oracle_id_and_deck_binding.sql) -
 * fills them in a few at a time so deck-matching/substitution (see
 * deck-stats.ts) stops missing them, without the user having to re-scan or
 * re-add every card by hand. Kicked off once from App's constructor;
 * entirely non-blocking, batch by batch until nothing is left, then quiet
 * until the next full page load.
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

    if (error || !data || data.length === 0) {
      this.finish();
      return;
    }

    for (const row of data) {
      try {
        // scryfall_id (Scryfall's own print id) is what collection_cards
        // stores as card_id for MTG - getCard resolves it to a full Card,
        // oracleId included, already retried on a mobile 504 internally.
        const card = await this.mtgApi.getCard(row.card_id);
        if (card?.oracleId) {
          const { error: updateError } = await this.supabase.client
            .from('collection_cards')
            .update({ oracle_id: card.oracleId })
            .eq('id', row.id);
          if (!updateError) this.backfilledAny = true;
        }
      } catch (e) {
        // A single row failing (deleted/renamed card, transient network
        // issue) shouldn't stop the rest of the batch - just log and move
        // on; it stays null and gets retried on the next app start.
        console.error('Oracle-ID-Backfill fehlgeschlagen für Zeile', row.id, e);
      }
      await new Promise((r) => setTimeout(r, PER_ROW_DELAY_MS));
    }

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
