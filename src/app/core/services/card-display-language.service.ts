import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { LANG_STORAGE_KEY } from '../utils/language.util';

/**
 * Mirrors the app's own UI language (the DE/EN header switch, see
 * language.util.ts's setAppLanguage) as a signal other services/components
 * can read reactively. The same switch that drives ngx-translate's UI chrome
 * text also decides which language MTG card names/images are shown in (see
 * MtgApiService.translateCards) - this is purely about *display*, never
 * about which language a collection row's own physical copy is in (see
 * card-languages.ts's DEFAULT_CARD_LANGUAGE for that, unrelated concern).
 *
 * Reads the same localStorage key App's constructor already seeds
 * TranslateService from, rather than TranslateService.currentLang - that
 * property isn't guaranteed synchronously set yet at this service's own
 * construction time (it depends on injection order), while the storage
 * write already happened by the time any switch occurred.
 */
@Injectable({ providedIn: 'root' })
export class CardDisplayLanguageService {
  private readonly translate = inject(TranslateService);

  readonly current = signal(this.readStored() ?? 'de');

  constructor() {
    this.translate.onLangChange.subscribe(({ lang }) => this.current.set(lang));
  }

  private readStored(): string | null {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'de' || saved === 'en' ? saved : null;
  }
}
