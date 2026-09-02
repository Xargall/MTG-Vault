import { Card } from '../models/card.model';

export interface CardIdentification {
  card: Card;
  confidence: number;
}

export interface CardApiService {
  searchCards(query: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  getCardsByIds(ids: string[]): Promise<Card[]>;
  getPrints(name: string): Promise<Card[]>;
  /** Best-guess match for raw OCR text (e.g. from the camera scanner), or null if nothing is confident enough. */
  identifyCard(rawText: string): Promise<CardIdentification | null>;
}
