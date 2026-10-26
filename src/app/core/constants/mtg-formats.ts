// Every key Scryfall's own `legalities` object carries (confirmed live
// against a real card response) - not a curated subset like
// MOXFIELD_FORMATS (moxfield.service.ts), which only lists the 6 formats
// Moxfield's own deck-recommendation search covers. This is "every format
// Scryfall tracks legality for", used to render the full legality picture on
// a card, not to pick a format to search by.
export interface MtgFormatOption {
  /** Scryfall's own legalities-object key, e.g. card.legalities['standard']. */
  slug: string;
  /** Short badge label (fits a compact pill) - i18n key under `mtgFormats.*`. */
  abbrKey: string;
  /** Full format name - i18n key under `mtgFormats.*`, used for title/aria-label. */
  nameKey: string;
}

export const MTG_LEGALITY_FORMATS: MtgFormatOption[] = [
  { slug: 'standard', abbrKey: 'mtgFormats.abbrStandard', nameKey: 'mtgFormats.nameStandard' },
  { slug: 'pioneer', abbrKey: 'mtgFormats.abbrPioneer', nameKey: 'mtgFormats.namePioneer' },
  { slug: 'modern', abbrKey: 'mtgFormats.abbrModern', nameKey: 'mtgFormats.nameModern' },
  { slug: 'legacy', abbrKey: 'mtgFormats.abbrLegacy', nameKey: 'mtgFormats.nameLegacy' },
  { slug: 'vintage', abbrKey: 'mtgFormats.abbrVintage', nameKey: 'mtgFormats.nameVintage' },
  { slug: 'pauper', abbrKey: 'mtgFormats.abbrPauper', nameKey: 'mtgFormats.namePauper' },
  { slug: 'commander', abbrKey: 'mtgFormats.abbrCommander', nameKey: 'mtgFormats.nameCommander' },
  { slug: 'oathbreaker', abbrKey: 'mtgFormats.abbrOathbreaker', nameKey: 'mtgFormats.nameOathbreaker' },
  { slug: 'duel', abbrKey: 'mtgFormats.abbrDuel', nameKey: 'mtgFormats.nameDuel' },
  { slug: 'paupercommander', abbrKey: 'mtgFormats.abbrPauperCommander', nameKey: 'mtgFormats.namePauperCommander' },
  { slug: 'brawl', abbrKey: 'mtgFormats.abbrBrawl', nameKey: 'mtgFormats.nameBrawl' },
  { slug: 'standardbrawl', abbrKey: 'mtgFormats.abbrStandardBrawl', nameKey: 'mtgFormats.nameStandardBrawl' },
  { slug: 'competitivebrawl', abbrKey: 'mtgFormats.abbrCompetitiveBrawl', nameKey: 'mtgFormats.nameCompetitiveBrawl' },
  { slug: 'historic', abbrKey: 'mtgFormats.abbrHistoric', nameKey: 'mtgFormats.nameHistoric' },
  { slug: 'timeless', abbrKey: 'mtgFormats.abbrTimeless', nameKey: 'mtgFormats.nameTimeless' },
  { slug: 'alchemy', abbrKey: 'mtgFormats.abbrAlchemy', nameKey: 'mtgFormats.nameAlchemy' },
  { slug: 'gladiator', abbrKey: 'mtgFormats.abbrGladiator', nameKey: 'mtgFormats.nameGladiator' },
  { slug: 'future', abbrKey: 'mtgFormats.abbrFuture', nameKey: 'mtgFormats.nameFuture' },
  { slug: 'penny', abbrKey: 'mtgFormats.abbrPenny', nameKey: 'mtgFormats.namePenny' },
  { slug: 'oldschool', abbrKey: 'mtgFormats.abbrOldSchool', nameKey: 'mtgFormats.nameOldSchool' },
  { slug: 'premodern', abbrKey: 'mtgFormats.abbrPremodern', nameKey: 'mtgFormats.namePremodern' },
  { slug: 'predh', abbrKey: 'mtgFormats.abbrPredh', nameKey: 'mtgFormats.namePredh' },
  { slug: 'tlr', abbrKey: 'mtgFormats.abbrTheList', nameKey: 'mtgFormats.nameTheList' },
];
