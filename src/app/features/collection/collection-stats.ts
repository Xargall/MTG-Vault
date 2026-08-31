import { BarChartDatum } from '../../shared/charts/bar-chart/bar-chart';
import { CollectionEntry } from './collection.service';

type ColorCategory = 'W' | 'U' | 'B' | 'R' | 'G' | 'M' | 'C';

const COLOR_CATEGORIES: Array<{ key: ColorCategory; label: string; color: string }> = [
  { key: 'U', label: 'Blau', color: '#3987e5' },
  { key: 'M', label: 'Mehrfarbig', color: '#d95926' },
  { key: 'C', label: 'Farblos', color: '#199e70' },
  { key: 'W', label: 'Weiß', color: '#c98500' },
  { key: 'G', label: 'Grün', color: '#008300' },
  { key: 'B', label: 'Schwarz', color: '#9085e9' },
  { key: 'R', label: 'Rot', color: '#e66767' },
];

const MANA_CURVE_COLOR = '#3987e5';
const MANA_CURVE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];

function colorCategoryFor(colorIdentity: string[]): ColorCategory {
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
  for (const { row, card } of entries) {
    const category = colorCategoryFor(card.color_identity);
    counts.set(category, (counts.get(category) ?? 0) + row.quantity);
  }
  return COLOR_CATEGORIES.map(({ key, label, color }) => ({
    label,
    color,
    value: counts.get(key) ?? 0,
  }));
}

export function getManaCurve(entries: CollectionEntry[]): BarChartDatum[] {
  const counts = new Map<string, number>();
  for (const { row, card } of entries) {
    const bucket = manaCurveBucketFor(card.cmc);
    counts.set(bucket, (counts.get(bucket) ?? 0) + row.quantity);
  }
  return MANA_CURVE_BUCKETS.map((bucket) => ({
    label: bucket,
    color: MANA_CURVE_COLOR,
    value: counts.get(bucket) ?? 0,
  }));
}
