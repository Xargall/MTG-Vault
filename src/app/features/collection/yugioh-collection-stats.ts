import { YugiohCard } from '../../core/models/card.model';
import { BarChartDatum } from '../../shared/charts/bar-chart/bar-chart';
import { getEntryPrice } from './card-price-stats';
import { CollectionEntry } from './collection.service';

export type AttributeCategory = 'FIRE' | 'WATER' | 'EARTH' | 'WIND' | 'LIGHT' | 'DARK' | 'SPELL_TRAP';

export interface AttributeCategorySummary {
  key: AttributeCategory;
  label: string;
  color: string;
  count: number;
  showcase: CollectionEntry | null;
}

type YugiohEntry = CollectionEntry & { card: YugiohCard };

function yugiohEntries(entries: CollectionEntry[]): YugiohEntry[] {
  return entries.filter((entry): entry is YugiohEntry => entry.card.game === 'yugioh');
}

// `label` holds an i18n key, same convention as MTG's COLOR_CATEGORIES.
// Colors reused from the app's already CVD-validated 7-slot categorical
// palette (same hex values/order as COLOR_CATEGORIES) - only the semantic
// mapping (attribute instead of mana color) changes, not the palette itself.
export const ATTRIBUTE_CATEGORIES: Array<{ key: AttributeCategory; label: string; color: string }> = [
  { key: 'FIRE', label: 'yugioh.attributeFire', color: '#3987e5' },
  { key: 'WATER', label: 'yugioh.attributeWater', color: '#d95926' },
  { key: 'EARTH', label: 'yugioh.attributeEarth', color: '#199e70' },
  { key: 'WIND', label: 'yugioh.attributeWind', color: '#c98500' },
  { key: 'LIGHT', label: 'yugioh.attributeLight', color: '#008300' },
  { key: 'DARK', label: 'yugioh.attributeDark', color: '#9085e9' },
  { key: 'SPELL_TRAP', label: 'yugioh.spellTrap', color: '#e66767' },
];

export function attributeCategoryFor(card: YugiohCard): AttributeCategory {
  if (!card.attribute) return 'SPELL_TRAP';
  return card.attribute as AttributeCategory;
}

export function getAttributeDistribution(entries: CollectionEntry[]): BarChartDatum[] {
  const counts = new Map<AttributeCategory, number>();
  for (const { row, card } of yugiohEntries(entries)) {
    const category = attributeCategoryFor(card);
    counts.set(category, (counts.get(category) ?? 0) + row.quantity);
  }
  return ATTRIBUTE_CATEGORIES.map(({ key, label, color }) => ({
    label,
    color,
    value: counts.get(key) ?? 0,
  }));
}

export function getAttributeCategorySummaries(entries: CollectionEntry[]): AttributeCategorySummary[] {
  const grouped = new Map<AttributeCategory, YugiohEntry[]>();
  for (const entry of yugiohEntries(entries)) {
    const category = attributeCategoryFor(entry.card);
    const list = grouped.get(category);
    if (list) {
      list.push(entry);
    } else {
      grouped.set(category, [entry]);
    }
  }

  return ATTRIBUTE_CATEGORIES.map(({ key, label, color }) => {
    const categoryEntries = grouped.get(key) ?? [];
    const count = categoryEntries.reduce((sum, e) => sum + e.row.quantity, 0);
    const showcase = categoryEntries.reduce<CollectionEntry | null>(
      (best, e) => (best === null || getEntryPrice(e) > getEntryPrice(best) ? e : best),
      null,
    );
    return { key, label, color, count, showcase };
  });
}
