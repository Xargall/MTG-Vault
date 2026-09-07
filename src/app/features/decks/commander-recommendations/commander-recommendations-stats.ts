import { EdhrecCard } from '../../../core/services/edhrec.service';
import { CollectionEntry } from '../../collection/collection.service';

export function isLegendaryCreature(typeLine: string): boolean {
  return typeLine.includes('Legendary') && typeLine.includes('Creature');
}

export function isLand(typeLine: string): boolean {
  return typeLine.includes('Land');
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

export function getEdhrecMatch(
  deckCards: EdhrecCard[],
  ownedByName: Map<string, number>,
): { matchedCount: number; totalCount: number } {
  let matched = 0;
  let total = 0;
  for (const { name, quantity } of deckCards) {
    total += quantity;
    matched += Math.min(quantity, ownedByName.get(name.toLowerCase()) ?? 0);
  }
  return { matchedCount: matched, totalCount: total };
}
