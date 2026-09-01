export type GameSlug = 'mtg' | 'yugioh' | 'pokemon';

export const SUPPORTED_GAME_SLUGS: GameSlug[] = ['mtg', 'yugioh'];

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

export type Card = MtgCard | YugiohCard;
