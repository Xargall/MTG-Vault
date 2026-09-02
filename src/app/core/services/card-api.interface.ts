import { Card } from '../models/card.model';

export interface CardIdentification {
  card: Card;
  confidence: number;
  /** Scryfall's printing-independent card id, when known - lets a caller check for the same underlying card across frames/printings. */
  oracleId?: string;
}

export interface ScoredCandidate {
  card: Card;
  /** Raw structural-match score (not normalized) - only comparable to other ScoredCandidates from the same identification call. */
  confidence: number;
  oracleId: string;
  /** Small Scryfall thumbnail for compact picker rows, when known. */
  thumbnailUrl: string | null;
}

export interface MtgIdentificationResult {
  topCandidate: ScoredCandidate;
  /** Next-best scored candidates - empty for an exact set+number lookup, up to 9 for a filter-search match, sized by confidence tier. */
  runners: ScoredCandidate[];
  /** Same value as topCandidate.confidence, surfaced at the top level for tier decisions. */
  confidence: number;
  source: 'exact' | 'filter';
}

export interface CardApiService {
  searchCards(query: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  getCardsByIds(ids: string[]): Promise<Card[]>;
  getPrints(name: string): Promise<Card[]>;
  /** Best-guess match for raw OCR text (e.g. from the camera scanner), or null if nothing is confident enough. */
  identifyCard(rawText: string): Promise<CardIdentification | null>;
}
