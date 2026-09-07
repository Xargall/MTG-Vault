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

/** Same idea as buildOwnedMap, keyed by oracle_id instead - so a different printing of the same card (any Mountain, any Sol Ring) counts too, not just an exact print match. Only rows with a recorded oracle_id contribute (see collection.service.ts's oracle_id backfill) - a legacy row without one simply isn't here, so callers combine this with buildOwnedMap's exact card_id match to still cover it. */
export function buildOwnedOracleMap(collectionEntries: CollectionEntry[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const { row } of collectionEntries) {
    if (!row.oracle_id) continue;
    owned.set(row.oracle_id, (owned.get(row.oracle_id) ?? 0) + row.quantity);
  }
  return owned;
}

export interface RequiredCard {
  cardId: string;
  oracleId?: string | null;
  quantity: number;
}

/** How many copies of one required card are owned, combining an oracle_id match (any printing) with the exact card_id match (covers legacy collection rows with no recorded oracle_id) - never double-counted, since one collection row only ever contributes to one of buildOwnedMap/buildOwnedOracleMap's buckets (see their own docs). */
export function getOwnedQuantity(
  card: { cardId: string; oracleId?: string | null },
  owned: Map<string, number>,
  ownedByOracle?: Map<string, number>,
): number {
  const oracleQty = card.oracleId && ownedByOracle ? (ownedByOracle.get(card.oracleId) ?? 0) : 0;
  return oracleQty + (owned.get(card.cardId) ?? 0);
}

function matchPercent(required: RequiredCard[], owned: Map<string, number>, ownedByOracle?: Map<string, number>): number {
  let needed = 0;
  let matched = 0;
  for (const item of required) {
    needed += item.quantity;
    matched += Math.min(item.quantity, getOwnedQuantity(item, owned, ownedByOracle));
  }
  return needed > 0 ? Math.round((matched / needed) * 100) : 0;
}

/** `ownedByOracle` is optional - callers with only cardId+quantity pairs (no resolved Card, e.g. the precon-recommendations list, which never fetches full cards for perf reasons) still get a correct card_id-only match; callers that already resolved full cards (browse-decks-dialog's preview) pass richer RequiredCard entries (with oracleId) plus this map to get the same any-printing matching. A "My Deck"'s own match badge uses getAvailabilityMatch instead (see decks.ts) - it accounts for cards already committed to other decks, which plain ownership here does not. */
export function getPreconMatch(cards: RequiredCard[], owned: Map<string, number>, ownedByOracle?: Map<string, number>): number {
  return matchPercent(cards, owned, ownedByOracle);
}

/** Shared by the precon preview (BrowseDecksDialog) and the commander preview (CommanderRecommendationsDialog) - same three-way split regardless of whether cards are keyed by id or by name. */
export function getCardOwnedStatus(neededQty: number, ownedQty: number): CardOwnedStatus {
  if (ownedQty >= neededQty) return 'owned';
  if (ownedQty > 0) return 'partial';
  return 'missing';
}

/** How many more copies of this card are needed - 0 for a fully-owned card. This is the number that belongs in any "N cards missing" display or wishlist quantity, never a count of missing card *types*. */
export function getMissingQuantity(neededQty: number, ownedQty: number): number {
  return Math.max(0, neededQty - ownedQty);
}

// --- Deck binding (Feature 2): which of a card's owned copies are already
// committed to the user's *other* decks, and how that shrinks what's really
// available for the deck currently being viewed/browsed. ---

export type MatchMode = 'strict' | 'flexible';

export type CardAvailabilityStatus = 'available' | 'partial' | 'unavailable';

export interface CardAvailability {
  status: CardAvailabilityStatus;
  totalOwned: number;
  assignedElsewhere: number;
  available: number;
}

/** Sums quantity across every *other* deck's is_assigned deck_cards, keyed by card_id and by oracle_id - the "committed elsewhere" half of the availability calculation. Deck cards are always freshly resolved via the card API (see DeckService.getMyDecks), so oracleId is never missing the way a legacy collection row's can be - no card_id-only fallback bucket needed here the way buildOwnedOracleMap needs one. */
export function buildAssignedElsewhereMaps(
  allDecks: DeckEntry[],
  // null for a deck that doesn't exist yet (the precon-browsing preview) -
  // every existing deck's claims count then, since none of them can be it.
  currentDeckId: string | null,
): { byCardId: Map<string, number>; byOracleId: Map<string, number> } {
  const byCardId = new Map<string, number>();
  const byOracleId = new Map<string, number>();
  for (const deckEntry of allDecks) {
    if (currentDeckId !== null && deckEntry.deck.id === currentDeckId) continue;
    for (const { row, card } of deckEntry.cards) {
      if (!row.is_assigned) continue;
      if (card.oracleId) {
        byOracleId.set(card.oracleId, (byOracleId.get(card.oracleId) ?? 0) + row.quantity);
      } else {
        byCardId.set(row.card_id, (byCardId.get(row.card_id) ?? 0) + row.quantity);
      }
    }
  }
  return { byCardId, byOracleId };
}

export function getCardAvailability(
  card: { cardId: string; oracleId?: string | null },
  quantity: number,
  owned: Map<string, number>,
  ownedByOracle: Map<string, number>,
  assignedElsewhere: Map<string, number>,
  assignedElsewhereByOracle: Map<string, number>,
): CardAvailability {
  const totalOwned = getOwnedQuantity(card, owned, ownedByOracle);
  const assigned = getOwnedQuantity(card, assignedElsewhere, assignedElsewhereByOracle);
  const available = Math.max(0, totalOwned - assigned);
  const status: CardAvailabilityStatus = available >= quantity ? 'available' : available > 0 ? 'partial' : 'unavailable';
  return { status, totalOwned, assignedElsewhere: assigned, available };
}

export interface AvailabilityMatch {
  percent: number;
  /** Percentage points lost specifically because otherwise-owned copies are already committed to other decks - plain ownership percent minus this weighted percent, floored at 0. Drives the "(davon X% in anderen Decks verplant)" hint. */
  plannedElsewherePercent: number;
}

/**
 * Like matchPercent, but a card whose ownership is partly/fully committed to
 * other decks scores less than plain ownership would suggest: full credit
 * only once *available* (not just owned) copies cover what's needed; a
 * partially-available card earns half credit in 'flexible' mode (the
 * default) and none in 'strict' mode - see the deck-search toggle.
 */
export function getAvailabilityMatch(
  required: RequiredCard[],
  owned: Map<string, number>,
  ownedByOracle: Map<string, number>,
  assignedElsewhere: Map<string, number>,
  assignedElsewhereByOracle: Map<string, number>,
  mode: MatchMode,
): AvailabilityMatch {
  let needed = 0;
  let rawMatched = 0;
  let weightedScore = 0;
  for (const item of required) {
    needed += item.quantity;
    const totalOwned = getOwnedQuantity(item, owned, ownedByOracle);
    rawMatched += Math.min(item.quantity, totalOwned);

    const assigned = getOwnedQuantity(item, assignedElsewhere, assignedElsewhereByOracle);
    const available = Math.max(0, totalOwned - assigned);

    if (available >= item.quantity) weightedScore += item.quantity;
    else if (mode === 'flexible' && available > 0) weightedScore += item.quantity * 0.5;
  }

  const rawPercent = needed > 0 ? Math.round((rawMatched / needed) * 100) : 0;
  const percent = needed > 0 ? Math.round((weightedScore / needed) * 100) : 0;
  return { percent, plannedElsewherePercent: Math.max(0, rawPercent - percent) };
}

export interface AssignedElsewhereEntry {
  deckId: string;
  deckName: string;
  quantity: number;
  // The matching row(s)' own card_id(s) *in that other deck* - not
  // necessarily this card's own id, since a match can be via oracle_id
  // across different printings. Needed to actually release the commitment
  // (see DeckService.releaseAssignment) - deck_cards has no oracle_id
  // column of its own to release by.
  cardIds: string[];
}

/** Which of the user's *other* decks (and how many copies) already claim this card - feeds the deck-detail row's "↳ Bereits in 'X' verplant" line and its "Freigeben" action. Matches by oracle_id when both sides resolved one (always true for deck cards), falling back to the exact card_id otherwise. */
export function getAssignedElsewhereDecks(
  card: { cardId: string; oracleId?: string | null },
  allDecks: DeckEntry[],
  currentDeckId: string,
): AssignedElsewhereEntry[] {
  const results: AssignedElsewhereEntry[] = [];
  for (const deckEntry of allDecks) {
    if (deckEntry.deck.id === currentDeckId) continue;
    let quantity = 0;
    const cardIds = new Set<string>();
    for (const { row, card: deckCard } of deckEntry.cards) {
      if (!row.is_assigned) continue;
      const matches =
        card.oracleId && deckCard.oracleId ? deckCard.oracleId === card.oracleId : deckCard.id === card.cardId;
      if (matches) {
        quantity += row.quantity;
        cardIds.add(row.card_id);
      }
    }
    if (quantity > 0) {
      results.push({ deckId: deckEntry.deck.id, deckName: deckEntry.deck.name, quantity, cardIds: [...cardIds] });
    }
  }
  return results;
}

/** A deck card the user owns under a *different* printing than the one the deck actually lists - e.g. the deck calls for Sol Ring (Fallout #285) but the collection only has Sol Ring (MSH #142). Null when the exact printing is already owned in sufficient quantity (nothing to substitute) or no oracle match exists at all. */
export function findSubstitute(
  deckCard: { id: string; oracleId: string | null },
  quantity: number,
  collectionEntries: CollectionEntry[],
): CollectionEntry | null {
  if (!deckCard.oracleId) return null;

  const exactOwned = collectionEntries
    .filter((entry) => entry.card.id === deckCard.id)
    .reduce((sum, entry) => sum + entry.row.quantity, 0);
  if (exactOwned >= quantity) return null;

  return (
    collectionEntries.find(
      (entry) => entry.row.oracle_id === deckCard.oracleId && entry.card.id !== deckCard.id,
    ) ?? null
  );
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
