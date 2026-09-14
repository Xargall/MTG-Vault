import { Card } from '../../core/models/card.model';
import { AverageDeckCard } from '../../core/services/edhrec.service';
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

// --- Average-decklist matching (Feature 3): resolving a computed
// {name, quantity} decklist - EDHREC's own precomputed Commander average, or
// MoxfieldService's per-deck real decklist for 60-card formats - against the
// user's collection and other decks. ---

/** Keyed by name, but only from rows with no recorded oracle_id - a row that has one is already covered by the oracle-keyed buildOwnedOracleMap above, so leaving it out here keeps the two maps disjoint and safely summable. */
export function buildOwnedByNameMap(entries: CollectionEntry[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const { row, card } of entries) {
    if (row.oracle_id) continue;
    const key = card.name.toLowerCase();
    owned.set(key, (owned.get(key) ?? 0) + row.quantity);
  }
  return owned;
}

export interface AverageDeckMatch {
  /** Plain ownership match - includes copies already committed to other decks. */
  matchedCount: number;
  totalCount: number;
  /** matchedCount minus whatever's already committed elsewhere - what the deck is actually buildable with right now. */
  freeMatchedCount: number;
}

/**
 * Oracle-precise match against a computed average decklist - the exact same
 * per-card ownership/assignment math as splitAverageDeckByAvailability
 * below, just summed into counts instead of built into display arrays. Used
 * for a recommendation *list's* dual free/total % badges, same as
 * splitAverageDeckByAvailability is for the detail view once a single one
 * is opened - they used to run on two different algorithms (this one a
 * cheap plain-name bulk scan, no oracle_id resolution, to avoid hundreds of
 * per-candidate Scryfall calls). Now that card resolution goes through our
 * own indexed/RPC-backed scryfall_cards table instead of hitting Scryfall
 * directly, that cost concern is gone - and the two algorithms disagreeing
 * (a list badge saying 8% free, its own detail view saying 0%) was exactly
 * the kind of "the numbers don't add up" confusion reported live. Same
 * formula everywhere now, so a list badge and its own detail view can never
 * show different numbers for the same deck again.
 */
export function getPreciseAverageDeckMatch(
  deckCards: AverageDeckCard[],
  cardsByName: Map<string, Card>,
  collectionEntries: CollectionEntry[],
  allDecks: DeckEntry[],
): AverageDeckMatch {
  const ownedByName = buildOwnedByNameMap(collectionEntries);
  const ownedByOracle = buildOwnedOracleMap(collectionEntries);
  const { byCardId: assignedByCardId, byOracleId: assignedByOracle } = buildAssignedElsewhereMaps(allDecks, null);

  let matched = 0;
  let freeMatched = 0;
  let total = 0;
  for (const { name, quantity } of deckCards) {
    total += quantity;
    const card = cardsByName.get(name.toLowerCase());
    if (!card) continue; // unresolved - counts toward total above, contributes nothing else (see UnresolvedAverageDeckCard)

    const oracleQty = card.oracleId ? (ownedByOracle.get(card.oracleId) ?? 0) : 0;
    const ownedQty = oracleQty + (ownedByName.get(name.toLowerCase()) ?? 0);
    matched += Math.min(quantity, ownedQty);

    const assignedQty = getOwnedQuantity({ cardId: card.id, oracleId: card.oracleId }, assignedByCardId, assignedByOracle);
    const availableQty = Math.max(0, ownedQty - assignedQty);
    freeMatched += Math.min(quantity, availableQty);
  }
  return { matchedCount: matched, totalCount: total, freeMatchedCount: freeMatched };
}

export interface AverageDeckCardMatch {
  card: Card;
  quantity: number;
  ownedQty: number;
  substitute: CollectionEntry | null;
}

/** A "free" card, further split out of AverageDeckCardMatch's owned bucket - fully owned, but some/all copies are already `is_assigned` to one of the user's *other* decks. Display-only: unlike DeckDetailDialog, a recommendation preview offers no "Freigeben" action - releasing a commitment still happens from the deck it's actually assigned to. */
export interface AverageDeckAssignedCardMatch extends AverageDeckCardMatch {
  available: number;
  assignedElsewhere: AssignedElsewhereEntry[];
}

/** A deck card whose name never resolved to a real Card via the card API (unusual punctuation, a double-faced card's face-only name, a spelling Moxfield/EDHREC stores differently than our own data, ...) - still counted toward totals/percentages (see AverageDeckSplit's callers), just with no Card to render a tile for. */
export interface UnresolvedAverageDeckCard {
  name: string;
  quantity: number;
}

export interface AverageDeckSplit {
  owned: AverageDeckCardMatch[];
  assignedElsewhere: AverageDeckAssignedCardMatch[];
  missing: AverageDeckCardMatch[];
  unresolved: UnresolvedAverageDeckCard[];
}

/**
 * Resolves one computed average decklist (EDHREC's Commander average, or
 * MoxfieldService's per-hub aggregation) against the user's collection and
 * other decks - the shared detail-view logic behind both
 * CommanderRecommendationsDialog and FormatDeckRecommendationsDialog. Splits
 * every card's *quantity* three ways - free to use as-is, committed to
 * another deck, or not owned at all - which, for a partially-owned card
 * (need 3, own 1), means the same card can land in more than one bucket at
 * once (1 owned/assigned + 2 missing), not just one or the other. A binary
 * per-card classification used to dump a partially-owned card entirely into
 * "missing" - live-confirmed case: owning 1 of a needed 3 showed as 0 owned,
 * 3 missing instead of the correct 1 owned, 2 missing, which also quietly
 * undercounted the detail view's own owned/free totals (they're summed from
 * these same buckets) below what the list view's badges already showed for
 * the identical deck.
 */
export function splitAverageDeckByAvailability(
  deckCards: AverageDeckCard[],
  cardsByName: Map<string, Card>,
  collectionEntries: CollectionEntry[],
  allDecks: DeckEntry[],
): AverageDeckSplit {
  const ownedByName = buildOwnedByNameMap(collectionEntries);
  const ownedByOracle = buildOwnedOracleMap(collectionEntries);
  // null-equivalent "no current deck to exclude" - the recommended deck
  // doesn't exist yet, same reasoning as browse-decks-dialog.ts's precon
  // preview (see buildAssignedElsewhereMaps's own doc comment).
  const { byCardId: assignedByCardId, byOracleId: assignedByOracle } = buildAssignedElsewhereMaps(allDecks, null);

  const owned: AverageDeckCardMatch[] = [];
  const assignedElsewhere: AverageDeckAssignedCardMatch[] = [];
  const missing: AverageDeckCardMatch[] = [];
  const unresolved: UnresolvedAverageDeckCard[] = [];

  for (const { name, quantity } of deckCards) {
    const card = cardsByName.get(name.toLowerCase());
    if (!card) {
      // Silently dropping this card used to also drop it from every total/
      // percentage below it - live-confirmed case: a real 60-card deck whose
      // detail view came out to 43%/0% match on a ~49-card "total" instead
      // of the correct 60, because ~11 cards' worth of quantity just
      // vanished instead of counting as missing.
      unresolved.push({ name, quantity });
      continue;
    }

    const oracleQty = card.oracleId ? (ownedByOracle.get(card.oracleId) ?? 0) : 0;
    const ownedQty = oracleQty + (ownedByName.get(name.toLowerCase()) ?? 0);
    const substitute = findSubstitute(card, quantity, collectionEntries);

    // Oracle-based match catches any assigned printing of the same card; the
    // exact card_id match additionally covers the (rare) case where a
    // legacy row with no recorded oracle_id is the one that's assigned.
    const assignedQty = getOwnedQuantity({ cardId: card.id, oracleId: card.oracleId }, assignedByCardId, assignedByOracle);
    const availableQty = Math.max(0, ownedQty - assignedQty);

    // How many of the needed copies we actually have at all (never more than
    // what's needed - extra owned copies beyond `quantity` aren't this
    // card's business), how many of *those* are free vs already committed
    // elsewhere, and how many more are needed on top of what's owned.
    const coveredQty = Math.min(quantity, ownedQty);
    const freeQty = Math.min(coveredQty, availableQty);
    const assignedCoveredQty = coveredQty - freeQty;
    const missingQty = quantity - coveredQty;

    if (freeQty > 0) {
      owned.push({ card, quantity: freeQty, ownedQty, substitute });
    }
    if (assignedCoveredQty > 0) {
      assignedElsewhere.push({
        card,
        quantity: assignedCoveredQty,
        ownedQty,
        substitute,
        available: availableQty,
        assignedElsewhere: getAssignedElsewhereDecks({ cardId: card.id, oracleId: card.oracleId }, allDecks, ''),
      });
    }
    if (missingQty > 0) {
      missing.push({ card, quantity: missingQty, ownedQty, substitute });
    }
  }

  owned.sort((a, b) => a.card.name.localeCompare(b.card.name));
  assignedElsewhere.sort((a, b) => a.card.name.localeCompare(b.card.name));
  missing.sort((a, b) => a.card.name.localeCompare(b.card.name));
  unresolved.sort((a, b) => a.name.localeCompare(b.name));

  return { owned, assignedElsewhere, missing, unresolved };
}

/**
 * Merges a card's quantities back into one row per card id, summing them -
 * needed before inserting into deck_cards (unique on deck_id+card_id) since
 * splitAverageDeckByAvailability's per-card split (see its own doc comment)
 * can now legitimately put the *same* card into more than one bucket at
 * once (e.g. 1 owned + 2 missing for a card needed 3x but owned 1x), which
 * addDeck() flattens back into a single cards list before calling
 * DeckService.addArchetypeDeck.
 */
export function mergeCardQuantities(entries: Array<{ card: Card; quantity: number }>): Array<{ cardId: string; quantity: number }> {
  const byId = new Map<string, number>();
  for (const { card, quantity } of entries) {
    byId.set(card.id, (byId.get(card.id) ?? 0) + quantity);
  }
  return [...byId.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
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
