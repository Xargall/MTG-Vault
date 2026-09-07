import { EdhrecCard } from '../../../core/services/edhrec.service';
import { CollectionEntry } from '../../collection/collection.service';

export function isLegendaryCreature(typeLine: string): boolean {
  return typeLine.includes('Legendary') && typeLine.includes('Creature');
}

export function isLand(typeLine: string): boolean {
  return typeLine.includes('Land');
}

/** Keyed by name, but only from rows with no recorded oracle_id - a row that has one is already covered by the oracle-keyed side of the match (see buildOwnedOracleMap in deck-stats.ts), so leaving it out here keeps the two maps disjoint and safely summable, exactly like deck-stats.ts's buildOwnedMap/buildOwnedOracleMap split. */
export function buildOwnedByNameMap(entries: CollectionEntry[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const { row, card } of entries) {
    if (row.oracle_id) continue;
    const key = card.name.toLowerCase();
    owned.set(key, (owned.get(key) ?? 0) + row.quantity);
  }
  return owned;
}

export interface EdhrecMatchCard extends EdhrecCard {
  // Resolved via OracleIdCacheService - null when not (yet) resolved, e.g.
  // because the plain name match already covered the needed quantity and
  // resolving was skipped as unnecessary (see commander-recommendations-dialog.ts).
  oracleId?: string | null;
}

export function getEdhrecMatch(
  deckCards: EdhrecMatchCard[],
  ownedByName: Map<string, number>,
  ownedByOracle?: Map<string, number>,
): { matchedCount: number; totalCount: number } {
  let matched = 0;
  let total = 0;
  for (const { name, quantity, oracleId } of deckCards) {
    total += quantity;
    const oracleQty = oracleId && ownedByOracle ? (ownedByOracle.get(oracleId) ?? 0) : 0;
    const nameQty = ownedByName.get(name.toLowerCase()) ?? 0;
    matched += Math.min(quantity, oracleQty + nameQty);
  }
  return { matchedCount: matched, totalCount: total };
}
