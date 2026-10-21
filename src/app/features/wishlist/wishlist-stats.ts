import { WishlistEntry } from './wishlist.service';

/**
 * EUR only, like the collection's own totals. Falling back to the USD price
 * (as this used to) showed dollar amounts with a € sign and summed them into
 * the euro total; an unknown price is null now, never a silent 0.
 */
function getEntryUnitPrice(entry: WishlistEntry): number | null {
  return entry.card.prices.eur ?? entry.card.prices.eurFoil ?? null;
}

/** Line price for this entry - unit price times how many copies are wanted (see WishlistRow.quantity), same "unit x quantity" convention as the collection's getTotalValue. Null when the card has no EUR price. */
export function getEntryPrice(entry: WishlistEntry): number | null {
  const unit = getEntryUnitPrice(entry);
  return unit === null ? null : unit * entry.row.quantity;
}

/** Sum of every known line price; entries without a EUR price are counted separately so the UI can say the total is incomplete. */
export function getWishlistTotals(entries: WishlistEntry[]): { value: number; unpricedCount: number } {
  let value = 0;
  let unpricedCount = 0;
  for (const entry of entries) {
    const price = getEntryPrice(entry);
    if (price === null) unpricedCount++;
    else value += price;
  }
  return { value, unpricedCount };
}

export type WishlistSort = 'priority' | 'price';

/** Shopping order: what's wanted most (or costs most) first; ties fall back to the other key, then name. */
export function sortWishlist(entries: WishlistEntry[], sort: WishlistSort): WishlistEntry[] {
  const price = (e: WishlistEntry) => getEntryPrice(e) ?? -1;
  return [...entries].sort((a, b) => {
    const primary =
      sort === 'priority' ? b.row.priority - a.row.priority : price(b) - price(a);
    if (primary !== 0) return primary;
    const secondary =
      sort === 'priority' ? price(b) - price(a) : b.row.priority - a.row.priority;
    return secondary !== 0 ? secondary : a.card.name.localeCompare(b.card.name);
  });
}
