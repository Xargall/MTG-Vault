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
// Colors reused from the app's shared 7-slot themed chart palette
// (--chart-1..7 in styles.scss) - but assigned by actual attribute meaning
// (fire is warm/red, water is blue, ...) rather than by raw slot order,
// which is what MTG's COLOR_CATEGORIES uses since mana colors don't share
// a slot-for-slot correspondence with these attributes.
export const ATTRIBUTE_CATEGORIES: Array<{ key: AttributeCategory; label: string; color: string }> = [
  { key: 'FIRE', label: 'yugioh.attributeFire', color: 'var(--chart-2)' }, // ember rust
  { key: 'WATER', label: 'yugioh.attributeWater', color: 'var(--chart-1)' }, // tarnished steel-blue
  { key: 'EARTH', label: 'yugioh.attributeEarth', color: 'var(--chart-3)' }, // oxidized bronze-green
  { key: 'WIND', label: 'yugioh.attributeWind', color: 'var(--chart-5)' }, // weathered moss
  { key: 'LIGHT', label: 'yugioh.attributeLight', color: 'var(--chart-4)' }, // aged gold
  { key: 'DARK', label: 'yugioh.attributeDark', color: 'var(--chart-6)' }, // faded amethyst
  { key: 'SPELL_TRAP', label: 'yugioh.spellTrap', color: 'var(--chart-7)' }, // dried-blood red
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
