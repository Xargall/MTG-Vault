import { BarChartDatum } from '../../shared/charts/bar-chart/bar-chart';
import { CollectionEntry } from './collection.service';

export interface ColorCategorySummary {
  key: ColorCategory;
  label: string;
  color: string;
  count: number;
  showcase: CollectionEntry | null;
}

export type ColorCategory = 'W' | 'U' | 'B' | 'R' | 'G' | 'M' | 'C';

export const COLOR_CATEGORIES: Array<{ key: ColorCategory; label: string; color: string }> = [
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

const PRICE_BRACKETS: Array<{ label: string; upperBound: number | null }> = [
  { label: '<1', upperBound: 1 },
  { label: '1-5', upperBound: 5 },
  { label: '5-10', upperBound: 10 },
  { label: '10-25', upperBound: 25 },
  { label: '25-50', upperBound: 50 },
  { label: '50-100', upperBound: 100 },
  { label: '100+', upperBound: null },
];

export function colorCategoryFor(colorIdentity: string[]): ColorCategory {
  if (colorIdentity.length === 0) return 'C';
  if (colorIdentity.length > 1) return 'M';
  return colorIdentity[0] as ColorCategory;
}

function manaCurveBucketFor(cmc: number): string {
  const rounded = Math.max(0, Math.floor(cmc));
  return rounded >= 7 ? '7+' : String(rounded);
}

function priceBracketFor(price: number): string {
  for (const bracket of PRICE_BRACKETS) {
    if (bracket.upperBound === null || price < bracket.upperBound) return bracket.label;
  }
  return PRICE_BRACKETS[PRICE_BRACKETS.length - 1].label;
}

export function getEntryPrice(entry: CollectionEntry, currency: 'usd' | 'eur' = 'usd'): number {
  const { row, card } = entry;
  const regular = currency === 'usd' ? card.prices?.usd : card.prices?.eur;
  const foilPrice = currency === 'usd' ? card.prices?.usd_foil : card.prices?.eur_foil;
  const priceStr = (row.foil ? foilPrice : regular) ?? regular ?? foilPrice;
  const parsed = priceStr ? parseFloat(priceStr) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
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

export function getColorCategorySummaries(entries: CollectionEntry[]): ColorCategorySummary[] {
  const grouped = new Map<ColorCategory, CollectionEntry[]>();
  for (const entry of entries) {
    const category = colorCategoryFor(entry.card.color_identity);
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

export function getPriceDistribution(entries: CollectionEntry[]): BarChartDatum[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const bracket = priceBracketFor(getEntryPrice(entry, 'eur'));
    counts.set(bracket, (counts.get(bracket) ?? 0) + entry.row.quantity);
  }
  return PRICE_BRACKETS.map(({ label }) => ({
    label,
    color: MANA_CURVE_COLOR,
    value: counts.get(label) ?? 0,
  }));
}

export function getTotalValue(entries: CollectionEntry[]): number {
  return entries.reduce((sum, entry) => sum + getEntryPrice(entry, 'eur') * entry.row.quantity, 0);
}
