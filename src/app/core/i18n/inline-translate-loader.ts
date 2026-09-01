import { Observable, of } from 'rxjs';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';

import { de } from './de';
import { en } from './en';

const DICTIONARIES: Record<string, TranslationObject> = { de, en };

/**
 * Translations are bundled directly (no JSON assets over HTTP) so the app
 * stays fully usable offline, consistent with this PWA's offline-first goal
 * - no extra network round-trip or service-worker asset-group entry needed.
 */
export class InlineTranslateLoader extends TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    return of(DICTIONARIES[lang] ?? {});
  }
}
