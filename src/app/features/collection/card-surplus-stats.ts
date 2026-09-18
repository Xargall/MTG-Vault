import { Card } from '../../core/models/card.model';
import { DeckEntry } from '../decks/deck.service';
import { CollectionCardRow, CollectionEntry } from './collection.service';

/** Groups collection/deck rows into one "same card" bucket regardless of exact printing - oracle_id when recorded (any printing counts together, matching how the deck-matching code treats ownership everywhere else), or the exact card_id otherwise (legacy collection rows with no backfilled oracle_id, and non-MTG games, which never have one - see card.model.ts). */
function cardIdentity(row: { card_id: string; oracle_id: string | null }): string {
  return row.oracle_id ? `oracle:${row.oracle_id}` : `card:${row.card_id}`;
}

function ownedIdentity(row: CollectionCardRow): string {
  return cardIdentity({ card_id: row.card_id, oracle_id: row.oracle_id });
}

/** How many copies the user's decks *together* actually call for, per card - a card needed by three decks at 1x each rightfully wants 3 copies, so "surplus" only ever means "owned beyond every deck's combined need", never beyond any single deck. Skips a deck_cards row once its `is_assigned` flag has been manually released ("Freigeben" - see DeckService.releaseAssignment) - a deck that no longer counts that card as its own commitment shouldn't make an otherwise-idle copy look needed. */
function buildDeckNeedTotals(allDecks: DeckEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const deckEntry of allDecks) {
    for (const { row, card } of deckEntry.cards) {
      if (!row.is_assigned) continue;
      const key = cardIdentity({ card_id: row.card_id, oracle_id: card.oracleId });
      totals.set(key, (totals.get(key) ?? 0) + row.quantity);
    }
  }
  return totals;
}

/**
 * Every card the collection owns *more* of than every deck combined needs -
 * e.g. a deck's own auto-grant on import (DeckService.grantMissingCards)
 * plus a separate wishlist->collection add for the same already-covered
 * card, live-confirmed as a real way to end up with 3 copies of a 1x
 * precon-exclusive card with nothing else to explain the extra 2. Keyed the
 * same way as buildDeckNeedTotals so the two sides compare like for like.
 * Cards with no deck at all needing them aren't flagged - owning extra
 * copies of something no deck currently wants is completely ordinary
 * collecting, not a leftover duplicate.
 */
export function getSurplusMap(entries: CollectionEntry[], allDecks: DeckEntry[]): Map<string, number> {
  const needed = buildDeckNeedTotals(allDecks);
  const owned = new Map<string, number>();
  for (const { row } of entries) {
    const key = ownedIdentity(row);
    owned.set(key, (owned.get(key) ?? 0) + row.quantity);
  }

  const surplus = new Map<string, number>();
  for (const [key, neededQty] of needed) {
    const ownedQty = owned.get(key) ?? 0;
    const extra = ownedQty - neededQty;
    if (extra > 0) surplus.set(key, extra);
  }
  return surplus;
}

/** How much of `entry`'s card is surplus, per getSurplusMap - 0 for a card no deck needs at all or one that's owned no more than decks call for. */
export function getEntrySurplus(entry: CollectionEntry, surplusMap: Map<string, number>): number {
  return surplusMap.get(ownedIdentity(entry.row)) ?? 0;
}

/** Every deck that lists a card, per identity - unlike buildDeckNeedTotals this deliberately includes released (`is_assigned=false`) rows too, since the point here is "which decks should I go look at to clear this surplus", not the arithmetic. Feeds both the surplus badge's deck names and letting the collection search match a deck name directly - going deck by deck is a lot faster than eyeballing which of several same-named cards actually belongs where. */
export function buildDeckNamesByCard(allDecks: DeckEntry[]): Map<string, string[]> {
  const names = new Map<string, Set<string>>();
  for (const deckEntry of allDecks) {
    for (const { row, card } of deckEntry.cards) {
      const key = cardIdentity({ card_id: row.card_id, oracle_id: card.oracleId });
      const set = names.get(key);
      if (set) set.add(deckEntry.deck.name);
      else names.set(key, new Set([deckEntry.deck.name]));
    }
  }
  const result = new Map<string, string[]>();
  for (const [key, set] of names) result.set(key, [...set].sort());
  return result;
}

/** Which decks (if any) list `entry`'s card - see buildDeckNamesByCard. */
export function getEntryDeckNames(entry: CollectionEntry, deckNamesByCard: Map<string, string[]>): string[] {
  return deckNamesByCard.get(ownedIdentity(entry.row)) ?? [];
}

/** Whether a card is any kind of land, basic or not (MTG-only - always false for other games, which have no type_line concept). Lands routinely dominate the surplus view with large, uninteresting counts - decks pull them from a shared, fungible pile of basics far more freely than nonland cards, so a big "surplus" of Forests rarely means anything worth cleaning up the way a leftover promo duplicate does. Exposed so the surplus filter can offer hiding them separately. */
export function isLandCard(card: Card): boolean {
  return card.game === 'mtg' && card.typeLine.includes('Land');
}
