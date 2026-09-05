import { PreconResolvedCard } from '../../core/models/precon.model';
import { CardOwnedStatus } from '../../shared/cards/card-tile/card-tile';
import { CollectionEntry } from '../collection/collection.service';
import { DeckCardEntry, DeckEntry } from './deck.service';

export function buildOwnedMap(collectionEntries: CollectionEntry[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const { row } of collectionEntries) {
    owned.set(row.card_id, (owned.get(row.card_id) ?? 0) + row.quantity);
  }
  return owned;
}

function matchPercent(required: Array<{ cardId: string; quantity: number }>, owned: Map<string, number>): number {
  let needed = 0;
  let matched = 0;
  for (const { cardId, quantity } of required) {
    needed += quantity;
    matched += Math.min(quantity, owned.get(cardId) ?? 0);
  }
  return needed > 0 ? Math.round((matched / needed) * 100) : 0;
}

export function getDeckMatch(deckEntry: DeckEntry, collectionEntries: CollectionEntry[]): number {
  const owned = buildOwnedMap(collectionEntries);
  const required = deckEntry.cards.map(({ row }) => ({ cardId: row.card_id, quantity: row.quantity }));
  return matchPercent(required, owned);
}

export function getPreconMatch(cards: PreconResolvedCard[], owned: Map<string, number>): number {
  return matchPercent(cards, owned);
}

/** Shared by the precon preview (BrowseDecksDialog) and the commander preview (CommanderRecommendationsDialog) - same three-way split regardless of whether cards are keyed by id or by name. */
export function getCardOwnedStatus(neededQty: number, ownedQty: number): CardOwnedStatus {
  if (ownedQty >= neededQty) return 'owned';
  if (ownedQty > 0) return 'partial';
  return 'missing';
}

export function getDeckShowcase(deckEntry: DeckEntry): DeckCardEntry | null {
  return deckEntry.cards.reduce<DeckCardEntry | null>((best, entry) => {
    const price = entry.card.prices.eur ?? entry.card.prices.usd ?? 0;
    const bestPrice = best ? (best.card.prices.eur ?? best.card.prices.usd ?? 0) : -1;
    return price > bestPrice ? entry : best;
  }, null);
}

export function getDeckCardCount(deckEntry: DeckEntry): number {
  return deckEntry.cards.reduce((sum, { row }) => sum + row.quantity, 0);
}

export function getDeckTotalValue(deckEntry: DeckEntry): number {
  return deckEntry.cards.reduce((sum, { row, card }) => {
    const price = card.prices.eur ?? card.prices.usd ?? 0;
    return sum + price * row.quantity;
  }, 0);
}
