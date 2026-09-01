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
