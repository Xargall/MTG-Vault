import { WishlistEntry } from './wishlist.service';

export function getEntryPrice(entry: WishlistEntry): number {
  return entry.card.prices.eur ?? entry.card.prices.usd ?? 0;
}

export function getWishlistTotalValue(entries: WishlistEntry[]): number {
  return entries.reduce((sum, entry) => sum + getEntryPrice(entry), 0);
}
