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
  /** `signal`, when given, lets a caller abort a stale search (e.g. the user kept typing) - without it, an in-flight request from an earlier keystroke can still resolve after a later one and overwrite its results. */
  searchCards(query: string, signal?: AbortSignal): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  getCardsByIds(ids: string[]): Promise<Card[]>;
  /** Best-effort lookup by exact display name (e.g. the Help/Lexikon's example-card thumbnails) - every implementation has one already, just not previously part of this shared interface. */
  getCardsByNames(names: string[]): Promise<Card[]>;
  getPrints(name: string): Promise<Card[]>;
  /** Best-guess match for raw OCR text (e.g. from the camera scanner), or null if nothing is confident enough. */
  identifyCard(rawText: string): Promise<CardIdentification | null>;
}
