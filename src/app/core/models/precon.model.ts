export interface PreconListEntry {
  fileName: string;
  name: string;
  type: string;
  releaseDate: string;
  bannerImageUrl: string | null;
}

export interface PreconResolvedCard {
  cardId: string;
  quantity: number;
}

export interface PreconDetail {
  heroCardId: string | null;
  // Only ever non-null for a genuine Commander-type MTG precon - null for
  // every Yu-Gi-Oh! precon (no commander concept) and for any non-Commander
  // MTG precon (Challenger Deck, Planeswalker Deck, ...). See
  // 036_decks_commander_card_id.sql.
  commanderCardId: string | null;
  cards: PreconResolvedCard[];
  skippedCount: number;
}

export interface PreconIndexData extends PreconDetail {
  names: string[];
}

export interface PreconDeckProvider {
  getDeckList(): Promise<PreconListEntry[]>;
  getDeckDetail(fileName: string): Promise<PreconDetail>;
  getDeckIndexData(fileName: string): Promise<PreconIndexData>;
}
