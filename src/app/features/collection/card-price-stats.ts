import { BarChartDatum } from '../../shared/charts/bar-chart/bar-chart';
import { CollectionEntry } from './collection.service';

const PRICE_BRACKET_COLOR = 'var(--color-bronze)';

const PRICE_BRACKETS: Array<{ label: string; upperBound: number | null }> = [
  { label: '<1', upperBound: 1 },
  { label: '1-5', upperBound: 5 },
  { label: '5-10', upperBound: 10 },
  { label: '10-25', upperBound: 25 },
  { label: '25-50', upperBound: 50 },
  { label: '50-100', upperBound: 100 },
  { label: '100+', upperBound: null },
];

function priceBracketFor(price: number): string {
  for (const bracket of PRICE_BRACKETS) {
    if (bracket.upperBound === null || price < bracket.upperBound) return bracket.label;
  }
  return PRICE_BRACKETS[PRICE_BRACKETS.length - 1].label;
}

export function getEntryPrice(entry: CollectionEntry, currency: 'usd' | 'eur' = 'usd'): number {
  const { row, card } = entry;
  const regular = currency === 'usd' ? card.prices.usd : card.prices.eur;
  const foilPrice = currency === 'usd' ? card.prices.usdFoil : card.prices.eurFoil;
  return (row.foil ? foilPrice : regular) ?? regular ?? foilPrice ?? 0;
}

export function getPriceDistribution(entries: CollectionEntry[]): BarChartDatum[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const bracket = priceBracketFor(getEntryPrice(entry, 'eur'));
    counts.set(bracket, (counts.get(bracket) ?? 0) + entry.row.quantity);
  }
  return PRICE_BRACKETS.map(({ label }) => ({
    label,
    color: PRICE_BRACKET_COLOR,
    value: counts.get(label) ?? 0,
  }));
}

export function getTotalValue(entries: CollectionEntry[]): number {
  return entries.reduce((sum, entry) => sum + getEntryPrice(entry, 'eur') * entry.row.quantity, 0);
}
