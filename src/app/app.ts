import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { TranslateService } from '@ngx-translate/core';

import { CardCategoryBackfillService } from './core/services/card-category-backfill.service';
import { MtgBulkDataService } from './core/services/mtg-bulk-data.service';
import { OracleIdBackfillService } from './core/services/oracle-id-backfill.service';
import { ToastService } from './core/services/toast.service';
import { LANG_STORAGE_KEY } from './core/utils/language.util';
import { GlobalToast } from './shared/layout/global-toast/global-toast';

// Gives someone mid-action (filling a form, scanning a card) a moment to
// notice before the page reloads out from under them, rather than reloading
// the instant an update is detected.
const UPDATE_RELOAD_DELAY_MS = 8000;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, GlobalToast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    const translate = inject(TranslateService);
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'de' || saved === 'en') {
      translate.use(saved);
    }

    // Kicked off once here regardless of which game is currently active -
    // by the time a user switches to MTG and opens the scanner, the local
    // card cache is either already warm or well on its way. Runs entirely
    // in the background; every scanner/lookup path already works against
    // the live API on its own if this hasn't finished (or failed).
    void inject(MtgBulkDataService).ensureLoaded();

    // Same idea: fills in oracle_id on any collection row added before that
    // column existed, batch by batch, entirely in the background - see
    // OracleIdBackfillService for why this needs to wait for login/the MTG
    // game id rather than firing immediately like the two above.
    void inject(OracleIdBackfillService).start();

    // Same idea again: corrects card_category on any collection row added
    // while token detection was broken (card_category = 'normal' instead
    // of 'token') - see CardCategoryBackfillService.
    void inject(CardCategoryBackfillService).start();

    // Without this, the service worker (see ngsw-config.json) keeps serving
    // an already-open tab's old cached bundle indefinitely after a new
    // deploy - it only fetches the update in the background and never
    // activates it on its own. Live-confirmed: several real fixes (the
    // card-display-language feature among them) shipped and deployed
    // successfully but never reached an already-open session at all.
    const swUpdate = inject(SwUpdate);
    const toast = inject(ToastService);
    if (swUpdate.isEnabled) {
      swUpdate.versionUpdates.subscribe((event) => {
        if (event.type !== 'VERSION_READY') return;
        toast.show('Update verfügbar – die Seite lädt sich gleich neu…', 'success', UPDATE_RELOAD_DELAY_MS);
        // A "ready" update is only installed alongside the currently active
        // one, not yet in control of this page - without explicitly
        // activating it, the old service worker keeps serving every request
        // (including this very reload) regardless of how many times the
        // page reloads. Confirmed live: the first version of this fix
        // reloaded unconditionally and never actually picked up a new
        // version on its own, exactly the "only works after a manual hard
        // reload" symptom it was meant to fix in the first place.
        setTimeout(() => {
          void swUpdate.activateUpdate().finally(() => document.location.reload());
        }, UPDATE_RELOAD_DELAY_MS);
      });
    }
  }
}
