import { Card } from '../models/card.model';

export interface CardIdentification {
  card: Card;
  confidence: number;
  /** Scryfall's printing-independent card id, when known - lets a caller check for the same underlying card across frames/printings. */
  oracleId?: string;
}

export interface ScoredCandidate {
  card: Card;
  confidence: number;
  oracleId: string;
}

export interface MtgIdentificationResult {
  best: ScoredCandidate;
  source: 'setCode' | 'filter';
  /** Next-best scored candidates when the source isn't the exact set+number lookup - lets the caller offer a manual pick instead of trusting a structural match that a similar real card could tie on. */
  alternatives: ScoredCandidate[];
}

export interface CardApiService {
  searchCards(query: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  getCardsByIds(ids: string[]): Promise<Card[]>;
  getPrints(name: string): Promise<Card[]>;
  /** Best-guess match for raw OCR text (e.g. from the camera scanner), or null if nothing is confident enough. */
  identifyCard(rawText: string): Promise<CardIdentification | null>;
}
