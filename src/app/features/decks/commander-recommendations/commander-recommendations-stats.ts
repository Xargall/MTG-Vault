import { EdhrecCard } from '../../../core/services/edhrec.service';
import { CollectionEntry } from '../../collection/collection.service';
import { DeckEntry } from '../deck.service';

export function isLegendaryCreature(typeLine: string): boolean {
  return typeLine.includes('Legendary') && typeLine.includes('Creature');
}

/** Every collection row counted by name, regardless of oracle_id - used for the bulk commander-ranking scan (load() in commander-recommendations-dialog.ts), which deliberately does *not* resolve each EDHREC card's oracle_id (resolving hundreds of names across dozens of candidates at once used to hammer Scryfall and trigger 429s) - plain name matching only there. See buildOwnedByNameMap below for the oracle-aware variant used once a single commander is actually opened. */
export function buildPlainOwnedByNameMap(entries: CollectionEntry[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const { row, card } of entries) {
    const key = card.name.toLowerCase();
    owned.set(key, (owned.get(key) ?? 0) + row.quantity);
  }
  return owned;
}

/** Keyed by name, but only from rows with no recorded oracle_id - a row that has one is already covered by the oracle-keyed side of the match (see buildOwnedOracleMap in deck-stats.ts), so leaving it out here keeps the two maps disjoint and safely summable, exactly like deck-stats.ts's buildOwnedMap/buildOwnedOracleMap split. Used by selectRecommendation()'s detail view, which - unlike the bulk scan above - already resolves full Card objects (oracleId included) for the one commander the user actually opened. */
export function buildOwnedByNameMap(entries: CollectionEntry[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const { row, card } of entries) {
    if (row.oracle_id) continue;
    const key = card.name.toLowerCase();
    owned.set(key, (owned.get(key) ?? 0) + row.quantity);
  }
  return owned;
}

/** Name-keyed sum of every is_assigned deck_card quantity across ALL of the user's decks - the bulk-scan counterpart to buildAssignedElsewhereMaps in deck-stats.ts. No "current deck" to exclude here (none of them can be the not-yet-created recommended deck, same reasoning as that function's null-currentDeckId case), and kept name-keyed rather than oracle_id-keyed to match the rest of the bulk scan's name-only matching (see buildPlainOwnedByNameMap's own doc comment on why - resolving real Card/oracleId per candidate here would reintroduce the same Scryfall hammering that was already ruled out). */
export function buildAssignedElsewhereByNameMap(allDecks: DeckEntry[]): Map<string, number> {
  const assigned = new Map<string, number>();
  for (const deckEntry of allDecks) {
    for (const { row, card } of deckEntry.cards) {
      if (!row.is_assigned) continue;
      const key = card.name.toLowerCase();
      assigned.set(key, (assigned.get(key) ?? 0) + row.quantity);
    }
  }
  return assigned;
}

export interface EdhrecMatch {
  /** Plain ownership match, same as before this existed - includes copies already committed to other decks. */
  matchedCount: number;
  totalCount: number;
  /** matchedCount minus whatever's already committed elsewhere - what the deck is actually buildable with right now. */
  freeMatchedCount: number;
}

export function getEdhrecMatch(
  deckCards: EdhrecCard[],
  ownedByName: Map<string, number>,
  assignedElsewhereByName: Map<string, number>,
): EdhrecMatch {
  let matched = 0;
  let freeMatched = 0;
  let total = 0;
  for (const { name, quantity } of deckCards) {
    total += quantity;
    const key = name.toLowerCase();
    const ownedQty = ownedByName.get(key) ?? 0;
    matched += Math.min(quantity, ownedQty);

    const assignedQty = assignedElsewhereByName.get(key) ?? 0;
    const availableQty = Math.max(0, ownedQty - assignedQty);
    freeMatched += Math.min(quantity, availableQty);
  }
  return { matchedCount: matched, totalCount: total, freeMatchedCount: freeMatched };
}
