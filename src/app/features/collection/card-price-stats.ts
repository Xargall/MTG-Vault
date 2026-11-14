import { CollectionEntry } from './collection.service';

export function getEntryPrice(entry: CollectionEntry, currency: 'usd' | 'eur' = 'usd'): number {
  const { row, card } = entry;
  const regular = currency === 'usd' ? card.prices.usd : card.prices.eur;
  const foilPrice = currency === 'usd' ? card.prices.usdFoil : card.prices.eurFoil;
  return (row.foil ? foilPrice : regular) ?? regular ?? foilPrice ?? 0;
}

/** The `limit` most expensive cards by unit price (EUR), priciest first; cards without a price are left out. */
export function getTopValuedEntries(entries: CollectionEntry[], limit: number): CollectionEntry[] {
  return entries
    .map((entry) => ({ entry, price: getEntryPrice(entry, 'eur') }))
    .filter(({ price }) => price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function getTotalValue(entries: CollectionEntry[]): number {
  return entries.reduce((sum, entry) => sum + getEntryPrice(entry, 'eur') * entry.row.quantity, 0);
}
