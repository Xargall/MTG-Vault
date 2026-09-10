import { WishlistEntry } from './wishlist.service';

function getEntryUnitPrice(entry: WishlistEntry): number {
  return entry.card.prices.eur ?? entry.card.prices.usd ?? 0;
}

/** Line price for this entry - unit price times how many copies are wanted (see WishlistRow.quantity), same "unit x quantity" convention as the collection's getTotalValue. */
export function getEntryPrice(entry: WishlistEntry): number {
  return getEntryUnitPrice(entry) * entry.row.quantity;
}

export function getWishlistTotalValue(entries: WishlistEntry[]): number {
  return entries.reduce((sum, entry) => sum + getEntryPrice(entry), 0);
}
