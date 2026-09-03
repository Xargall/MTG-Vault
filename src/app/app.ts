import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { MtgBulkDataService } from './core/services/mtg-bulk-data.service';

const LANG_STORAGE_KEY = 'mtg-vault-lang';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
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
  }
}
