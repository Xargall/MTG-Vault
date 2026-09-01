import { Card } from '../models/card.model';

export interface CardApiService {
  searchCards(query: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  getCardsByIds(ids: string[]): Promise<Card[]>;
  getPrints(name: string): Promise<Card[]>;
}
