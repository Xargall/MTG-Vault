// Tracks which printed-language copy a user physically owns, independent of
// the app's own UI language (ngx-translate) - e.g. a German MTG print bought
// locally vs. an English one from a box opening. Pure collection metadata,
// never a card-data lookup key: the local scryfall_cards mirror only carries
// English-majority prints (see supabase/sql/016_scryfall_cards.sql), so
// there's no real per-language Scryfall record to join against here.
export const DEFAULT_CARD_LANGUAGE = 'en';

export interface CardLanguageOption {
  /** Stored value (collection_cards.language) and the key this list is keyed by. */
  code: string;
  /** i18n key under `language.*` - see de.ts/en.ts. */
  labelKey: string;
}

export const CARD_LANGUAGE_OPTIONS: CardLanguageOption[] = [
  { code: 'en', labelKey: 'language.en' },
  { code: 'de', labelKey: 'language.de' },
  { code: 'fr', labelKey: 'language.fr' },
  { code: 'it', labelKey: 'language.it' },
  { code: 'es', labelKey: 'language.es' },
  { code: 'pt', labelKey: 'language.pt' },
  { code: 'ja', labelKey: 'language.ja' },
  { code: 'ko', labelKey: 'language.ko' },
  { code: 'ru', labelKey: 'language.ru' },
  { code: 'zhs', labelKey: 'language.zhs' },
  { code: 'zht', labelKey: 'language.zht' },
];

// Maps the 2-letter abbreviation actually printed on a physical card (MTG's
// collector-number line, Yu-Gi-Oh's print code) to the stored code above -
// these differ from Scryfall's own internal `lang` field for several
// languages (confirmed live: Spanish prints "SP" not "es", Japanese "JP" not
// "ja", Korean "KR" not "ko", Chinese Simplified/Traditional "CS"/"CT" not
// "zhs"/"zht"). Both the real printed form and the ISO-ish internal form are
// accepted as input here, since OCR/Gemini output isn't always one or the
// other consistently.
export const PRINTED_LANGUAGE_CODES: Record<string, string> = {
  EN: 'en',
  DE: 'de',
  FR: 'fr',
  IT: 'it',
  ES: 'es',
  SP: 'es',
  PT: 'pt',
  JP: 'ja',
  JA: 'ja',
  KR: 'ko',
  KO: 'ko',
  RU: 'ru',
  CS: 'zhs',
  ZHS: 'zhs',
  CT: 'zht',
  ZHT: 'zht',
};
