import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const LOCALES: Record<string, string> = { de: 'de-DE', en: 'en-GB' };
const formatters = new Map<string, Intl.NumberFormat>();

/** Euro amount in the given UI language's number format ("1.234,50 €" in German, "€1,234.50" in English). */
export function formatEuro(value: number, lang: string | null | undefined): string {
  const locale = LOCALES[lang ?? 'de'] ?? 'de-DE';
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
    formatters.set(locale, formatter);
  }
  return formatter.format(value);
}

/**
 * Euro amount in the UI language's number format (see formatEuro). A null
 * price renders the localized "unknown" label instead of a misleading
 * "0,00 €".
 *
 * Impure because the output depends on the current UI language, not only
 * on the input - formatters are cached per locale, so re-running is cheap.
 */
@Pipe({ name: 'price', pure: false })
export class PricePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return this.translate.instant('common.priceUnknown');
    return formatEuro(value, this.translate.currentLang());
  }
}
