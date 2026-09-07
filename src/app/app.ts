import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { MtgBulkDataService } from './core/services/mtg-bulk-data.service';
import { OracleIdBackfillService } from './core/services/oracle-id-backfill.service';
import { LANG_STORAGE_KEY } from './core/utils/language.util';
import { GlobalToast } from './shared/layout/global-toast/global-toast';

@Component({
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
  }
}
