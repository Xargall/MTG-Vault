import { Card, GameSlug } from '../../core/models/card.model';
import { BarChartDatum } from '../../shared/charts/bar-chart/bar-chart';
import {
  COLOR_CATEGORIES,
  ColorCategorySummary,
  colorCategoryFor,
  getColorCategorySummaries,
  getColorDistribution,
} from './collection-stats';
import { CollectionEntry } from './collection.service';
import {
  ATTRIBUTE_CATEGORIES,
  attributeCategoryFor,
  AttributeCategorySummary,
  getAttributeCategorySummaries,
  getAttributeDistribution,
} from './yugioh-collection-stats';

export type CategorySummary = ColorCategorySummary | AttributeCategorySummary;
export interface CategoryDefinition {
  key: string;
  label: string;
  color: string;
}

export function getCategoriesForGame(game: GameSlug): CategoryDefinition[] {
  return game === 'yugioh' ? ATTRIBUTE_CATEGORIES : COLOR_CATEGORIES;
}

export function categoryKeyFor(card: Card): string {
  return card.game === 'yugioh' ? attributeCategoryFor(card) : colorCategoryFor(card.colorIdentity);
}

export function getCategoryDistribution(entries: CollectionEntry[], game: GameSlug): BarChartDatum[] {
  return game === 'yugioh' ? getAttributeDistribution(entries) : getColorDistribution(entries);
}

export function getCategorySummaries(entries: CollectionEntry[], game: GameSlug): CategorySummary[] {
  return game === 'yugioh' ? getAttributeCategorySummaries(entries) : getColorCategorySummaries(entries);
}
