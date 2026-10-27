export type GameSlug = 'mtg' | 'yugioh' | 'pokemon';

export const SUPPORTED_GAME_SLUGS: GameSlug[] = ['mtg', 'yugioh', 'pokemon'];

export interface CardPrice {
  eur: number | null;
  eurFoil: number | null;
  usd: number | null;
  usdFoil: number | null;
}

interface CardBase {
  id: string;
  name: string;
  imageUrl: string | null;
  // Small thumbnail variant, for grid contexts (see card-tile.html) - a full
  // "normal"-size image decodes to ~1.3MB in memory each, which adds up fast
  // across a collection grid of hundreds/thousands of cards rendered at
  // ~100-150px wide. Null for a card/print this wasn't resolved for yet
  // (falls back to imageUrl in card-tile.html) - never assume non-null.
  imageUrlSmall: string | null;
  setName: string | null;
  rarity: string | null;
  prices: CardPrice;
  // Scryfall's oracle_id - the same across every printing of a card (unlike
  // `id`, which is per-printing) - null for Yu-Gi-Oh/Pokémon, which have no
  // such concept. Lets deck-matching and collection ownership recognize a
  // different print (or a basic land from a different set) of the same card
  // as a valid substitute, instead of requiring an exact print match.
  oracleId: string | null;
  // The canonical English/oracle name - unlike `name` (which the card
  // display-language toggle may have swapped to a translated printed name,
  // see MtgApiService.translateCards), this never changes with display
  // language. Equal to `name` for Yu-Gi-Oh/Pokémon (no translation feature
  // there) and for an MTG card before any translation has been applied.
  // Lets a search match a card by its English name even while its own
  // display name is shown translated.
  oracleName: string;
  // The best *known* translated name for this card's oracle across every
  // printing of it the current collection load actually resolved a
  // translation for - not necessarily *this* exact printing's own
  // translation (see translateCards's own doc comment on why a printing
  // with no release in the target language is never shown with a
  // "borrowed" translated name). Null when the display language is English,
  // or no printing of this oracle card resolved a translation at all. Lets
  // a search in the display language find a printing that's itself only
  // ever been released in English (e.g. an English-only Commander-deck
  // exclusive printing of an otherwise-translated card), by matching
  // against a sibling printing's known translation instead of this one's.
  localizedName: string | null;
}

export interface MtgCard extends CardBase {
  game: 'mtg';
  colorIdentity: string[];
  manaCost: string | null;
  cmc: number;
  typeLine: string;
  cardmarketUrl: string | null;
  setCode: string;
  collectorNumber: string;
  // Scryfall's own per-format legality map (e.g. { standard: 'legal',
  // modern: 'legal', pauper: 'not_legal', ... } - see MTG_LEGALITY_FORMATS
  // for every key it can carry). Null when unresolved (e.g. a card that
  // never went through rowToCard/toCard, or synced before migration 034).
  legalities: Record<string, string> | null;
  // Scryfall's own keyword abilities (e.g. ["Flying", "Haste"]) - empty, not
  // null, for a card with none (most vanilla creatures/instants/sorceries),
  // since "no keywords" is itself meaningful here (deck-stats.ts's synergy
  // aggregation), not an unresolved state the way a null legalities is.
  keywords: string[];
  // Scryfall's own `is:gamechanger` flag (migration 035) - one ingredient of
  // the Commander-bracket estimate (see commander-bracket.ts), never shown
  // as a fact on its own.
  gameChanger: boolean;
}

export type YugiohBanlistStatus = 'Forbidden' | 'Limited' | 'Semi-Limited';

export interface YugiohCard extends CardBase {
  game: 'yugioh';
  attribute: string | null;
  cardType: string;
  atk: number | null;
  def: number | null;
  banlistStatus: YugiohBanlistStatus | null;
  // The specific printing's own set code (e.g. "TN19-EN007"), when this
  // Card is known to be one exact printing rather than the card's generic
  // "representative" set/rarity (see YugiohApiService.withPrintInfo) - null
  // for the plain id/name lookups that only ever know the generic values.
  // Persisted on the collection row (040_collection_set_code.sql) so the
  // actually-owned printing's set/rarity survives being re-read later,
  // instead of silently reverting to the generic one on every reload.
  printCode: string | null;
}

// Matches TCGdex's own German-locale `category` values verbatim (confirmed
// live: "Pokémon", "Trainer", "Energie" - German, not English "Energy") so
// mapping raw API data needs no extra normalization step.
export type PokemonSupertype = 'Pokémon' | 'Trainer' | 'Energie';

export interface PokemonCard extends CardBase {
  game: 'pokemon';
  supertype: PokemonSupertype;
  /** Energy types (e.g. ["Fire"]) - empty for Trainer/Energy cards. */
  types: string[];
  hp: number | null;
  evolvesFrom: string | null;
}

export type Card = MtgCard | YugiohCard | PokemonCard;
