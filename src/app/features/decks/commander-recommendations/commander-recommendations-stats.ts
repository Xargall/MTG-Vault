import { EdhrecCard } from '../../../core/services/edhrec.service';
import { CollectionEntry } from '../../collection/collection.service';

export function isLegendaryCreature(typeLine: string): boolean {
  return typeLine.includes('Legendary') && typeLine.includes('Creature');
}

export function isLand(typeLine: string): boolean {
  return typeLine.includes('Land');
}

export function buildOwnedByNameMap(entries: CollectionEntry[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const { row, card } of entries) {
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
