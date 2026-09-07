import { GameSlug } from '../../core/models/card.model';
import { BarChartDatum } from '../../shared/charts/bar-chart/bar-chart';
import {
  COLOR_CATEGORIES,
  ColorCategorySummary,
  getColorCategorySummaries,
  getColorDistribution,
  MtgEntry,
  mtgCategoryFor,
} from './collection-stats';
import { CollectionEntry } from './collection.service';
import {
  POKEMON_CATEGORIES,
  PokemonCategorySummary,
  getPokemonCategorySummaries,
  getPokemonDistribution,
  pokemonCategoryFor,
} from './pokemon-collection-stats';
import {
  ATTRIBUTE_CATEGORIES,
  attributeCategoryFor,
  AttributeCategorySummary,
  getAttributeCategorySummaries,
  getAttributeDistribution,
} from './yugioh-collection-stats';

export type CategorySummary = ColorCategorySummary | AttributeCategorySummary | PokemonCategorySummary;
export interface CategoryDefinition {
  key: string;
  label: string;
  color: string;
}

export function getCategoriesForGame(game: GameSlug): CategoryDefinition[] {
  if (game === 'yugioh') return ATTRIBUTE_CATEGORIES;
  if (game === 'pokemon') return POKEMON_CATEGORIES;
  return COLOR_CATEGORIES;
}

export function categoryKeyFor(entry: CollectionEntry): string {
  const { card } = entry;
  if (card.game === 'yugioh') return attributeCategoryFor(card);
  if (card.game === 'pokemon') return pokemonCategoryFor(card);
  return mtgCategoryFor(entry as MtgEntry);
}

export function getCategoryDistribution(entries: CollectionEntry[], game: GameSlug): BarChartDatum[] {
  if (game === 'yugioh') return getAttributeDistribution(entries);
  if (game === 'pokemon') return getPokemonDistribution(entries);
  return getColorDistribution(entries);
}

export function getCategorySummaries(entries: CollectionEntry[], game: GameSlug): CategorySummary[] {
  if (game === 'yugioh') return getAttributeCategorySummaries(entries);
  if (game === 'pokemon') return getPokemonCategorySummaries(entries);
  return getColorCategorySummaries(entries);
}
