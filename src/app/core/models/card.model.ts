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
  setName: string | null;
  rarity: string | null;
  prices: CardPrice;
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
}

export type YugiohBanlistStatus = 'Forbidden' | 'Limited' | 'Semi-Limited';

export interface YugiohCard extends CardBase {
  game: 'yugioh';
  attribute: string | null;
  cardType: string;
  atk: number | null;
  def: number | null;
  banlistStatus: YugiohBanlistStatus | null;
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
