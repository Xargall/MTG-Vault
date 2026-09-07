import { TranslateService } from '@ngx-translate/core';

// Shared between AppShell's header switch and the Settings hub's language
// section, so both actually persist to (and read from) the same key.
export const LANG_STORAGE_KEY = 'mtg-vault-lang';

export function setAppLanguage(translate: TranslateService, lang: 'de' | 'en'): void {
  translate.use(lang);
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}
