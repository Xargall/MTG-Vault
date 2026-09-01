import { MtgCard } from '../../core/models/card.model';
import { BarChartDatum } from '../../shared/charts/bar-chart/bar-chart';
import { getEntryPrice } from './card-price-stats';
import { CollectionEntry } from './collection.service';

export { getEntryPrice, getPriceDistribution, getTotalValue } from './card-price-stats';

export interface ColorCategorySummary {
  key: ColorCategory;
  label: string;
  color: string;
  count: number;
  showcase: CollectionEntry | null;
}

export type ColorCategory = 'W' | 'U' | 'B' | 'R' | 'G' | 'M' | 'C';

type MtgEntry = CollectionEntry & { card: MtgCard };

function mtgEntries(entries: CollectionEntry[]): MtgEntry[] {
  return entries.filter((entry): entry is MtgEntry => entry.card.game === 'mtg');
}

// `label` holds an i18n key (rendered via the `translate` pipe wherever it's
// shown), not literal text - so this data can flow straight into chart
// components (which just interpolate `.label`) without threading a
// translate function through every stats function.
export const COLOR_CATEGORIES: Array<{ key: ColorCategory; label: string; color: string }> = [
  { key: 'U', label: 'colors.blue', color: '#3987e5' },
  { key: 'M', label: 'colors.multicolor', color: '#d95926' },
  { key: 'C', label: 'colors.colorless', color: '#199e70' },
  { key: 'W', label: 'colors.white', color: '#c98500' },
  { key: 'G', label: 'colors.green', color: '#008300' },
  { key: 'B', label: 'colors.black', color: '#9085e9' },
  { key: 'R', label: 'colors.red', color: '#e66767' },
];

const MANA_CURVE_COLOR = '#3987e5';
const MANA_CURVE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];

export function colorCategoryFor(colorIdentity: string[]): ColorCategory {
  if (colorIdentity.length === 0) return 'C';
  if (colorIdentity.length > 1) return 'M';
  return colorIdentity[0] as ColorCategory;
}

function manaCurveBucketFor(cmc: number): string {
  const rounded = Math.max(0, Math.floor(cmc));
  return rounded >= 7 ? '7+' : String(rounded);
}

export function getColorDistribution(entries: CollectionEntry[]): BarChartDatum[] {
  const counts = new Map<ColorCategory, number>();
  for (const { row, card } of mtgEntries(entries)) {
    const category = colorCategoryFor(card.colorIdentity);
    counts.set(category, (counts.get(category) ?? 0) + row.quantity);
  }
  return COLOR_CATEGORIES.map(({ key, label, color }) => ({
    label,
    color,
    value: counts.get(key) ?? 0,
  }));
}

export function getColorCategorySummaries(entries: CollectionEntry[]): ColorCategorySummary[] {
  const grouped = new Map<ColorCategory, MtgEntry[]>();
  for (const entry of mtgEntries(entries)) {
    const category = colorCategoryFor(entry.card.colorIdentity);
    const list = grouped.get(category);
    if (list) {
      list.push(entry);
    } else {
      grouped.set(category, [entry]);
    }
  }

  return COLOR_CATEGORIES.map(({ key, label, color }) => {
    const categoryEntries = grouped.get(key) ?? [];
    const count = categoryEntries.reduce((sum, e) => sum + e.row.quantity, 0);
    const showcase = categoryEntries.reduce<CollectionEntry | null>(
      (best, e) => (best === null || getEntryPrice(e) > getEntryPrice(best) ? e : best),
      null,
    );
    return { key, label, color, count, showcase };
  });
}

export function getManaCurve(entries: CollectionEntry[]): BarChartDatum[] {
  const counts = new Map<string, number>();
  for (const { row, card } of mtgEntries(entries)) {
    const bucket = manaCurveBucketFor(card.cmc);
    counts.set(bucket, (counts.get(bucket) ?? 0) + row.quantity);
  }
  return MANA_CURVE_BUCKETS.map((bucket) => ({
    label: bucket,
    color: MANA_CURVE_COLOR,
    value: counts.get(bucket) ?? 0,
  }));
}

