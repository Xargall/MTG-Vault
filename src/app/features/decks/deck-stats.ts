import { CollectionEntry } from '../collection/collection.service';
import { DeckCardEntry, DeckEntry } from './deck.service';

export function getDeckMatch(deckEntry: DeckEntry, collectionEntries: CollectionEntry[]): number {
  const owned = new Map<string, number>();
  for (const { row } of collectionEntries) {
    owned.set(row.scryfall_id, (owned.get(row.scryfall_id) ?? 0) + row.quantity);
  }

  let needed = 0;
  let matched = 0;
  for (const { row } of deckEntry.cards) {
    needed += row.quantity;
    matched += Math.min(row.quantity, owned.get(row.scryfall_id) ?? 0);
  }

  return needed > 0 ? Math.round((matched / needed) * 100) : 0;
}

export function getDeckShowcase(deckEntry: DeckEntry): DeckCardEntry | null {
  return deckEntry.cards.reduce<DeckCardEntry | null>((best, entry) => {
    const price = parseFloat(entry.card.prices?.eur ?? entry.card.prices?.usd ?? '0') || 0;
    const bestPrice = best
      ? parseFloat(best.card.prices?.eur ?? best.card.prices?.usd ?? '0') || 0
      : -1;
    return price > bestPrice ? entry : best;
  }, null);
}
