import { PokemonCard } from '../../core/models/card.model';
import { BarChartDatum } from '../../shared/charts/bar-chart/bar-chart';
import { getEntryPrice } from './card-price-stats';
import { CollectionEntry } from './collection.service';

export type PokemonCategory =
  | 'GRASS'
  | 'FIRE'
  | 'WATER'
  | 'LIGHTNING'
  | 'PSYCHIC'
  | 'FIGHTING'
  | 'DARKNESS'
  | 'METAL'
  | 'FAIRY'
  | 'DRAGON'
  | 'COLORLESS'
  | 'TRAINER'
  | 'ENERGY';

export interface PokemonCategorySummary {
  key: PokemonCategory;
  label: string;
  color: string;
  count: number;
  showcase: CollectionEntry | null;
}

type PokemonEntry = CollectionEntry & { card: PokemonCard };

function pokemonEntries(entries: CollectionEntry[]): PokemonEntry[] {
  return entries.filter((entry): entry is PokemonEntry => entry.card.game === 'pokemon');
}

// `label` holds an i18n key, same convention as MTG's COLOR_CATEGORIES /
// Yu-Gi-Oh's ATTRIBUTE_CATEGORIES. Colors: types with a good semantic match
// reuse the shared 7-slot chart palette (see styles.scss's comment on
// --chart-8..12 for the mapping reasoning); Trainer reuses --color-bronze.
export const POKEMON_CATEGORIES: Array<{ key: PokemonCategory; label: string; color: string }> = [
  { key: 'GRASS', label: 'pokemon.typeGrass', color: 'var(--chart-5)' },
  { key: 'FIRE', label: 'pokemon.typeFire', color: 'var(--chart-7)' },
  { key: 'WATER', label: 'pokemon.typeWater', color: 'var(--chart-1)' },
  { key: 'LIGHTNING', label: 'pokemon.typeLightning', color: 'var(--chart-4)' },
  { key: 'PSYCHIC', label: 'pokemon.typePsychic', color: 'var(--chart-6)' },
  { key: 'FIGHTING', label: 'pokemon.typeFighting', color: 'var(--chart-2)' },
  { key: 'DARKNESS', label: 'pokemon.typeDarkness', color: 'var(--chart-8)' },
  { key: 'METAL', label: 'pokemon.typeMetal', color: 'var(--chart-9)' },
  { key: 'FAIRY', label: 'pokemon.typeFairy', color: 'var(--chart-10)' },
  { key: 'DRAGON', label: 'pokemon.typeDragon', color: 'var(--chart-11)' },
  { key: 'COLORLESS', label: 'pokemon.typeColorless', color: 'var(--chart-3)' },
  { key: 'TRAINER', label: 'pokemon.supertypeTrainer', color: 'var(--color-bronze)' },
  { key: 'ENERGY', label: 'pokemon.supertypeEnergy', color: 'var(--chart-12)' },
];

// TCGdex's German locale returns types/category already localized (verified
// live: Pikachu's type is "Elektro", not "Lightning"; an Energy card's
// category is "Energie", not "Energy") - map those German names to our
// category keys rather than assuming they're English.
const GERMAN_TYPE_TO_CATEGORY: Record<string, PokemonCategory> = {
  Pflanze: 'GRASS',
  Feuer: 'FIRE',
  Wasser: 'WATER',
  Elektro: 'LIGHTNING',
  Psycho: 'PSYCHIC',
  Kampf: 'FIGHTING',
  Finsternis: 'DARKNESS',
  Metall: 'METAL',
  Fee: 'FAIRY',
  Drache: 'DRAGON',
  Farblos: 'COLORLESS',
};

export function pokemonCategoryFor(card: PokemonCard): PokemonCategory {
  if (card.supertype === 'Trainer') return 'TRAINER';
  if (card.supertype === 'Energie') return 'ENERGY';
  const type = card.types[0];
  return (type && GERMAN_TYPE_TO_CATEGORY[type]) || 'COLORLESS';
}

export function getPokemonDistribution(entries: CollectionEntry[]): BarChartDatum[] {
  const counts = new Map<PokemonCategory, number>();
  for (const { row, card } of pokemonEntries(entries)) {
    const category = pokemonCategoryFor(card);
    counts.set(category, (counts.get(category) ?? 0) + row.quantity);
  }
  return POKEMON_CATEGORIES.map(({ key, label, color }) => ({
    label,
    color,
    value: counts.get(key) ?? 0,
  }));
}

export function getPokemonCategorySummaries(entries: CollectionEntry[]): PokemonCategorySummary[] {
  const grouped = new Map<PokemonCategory, PokemonEntry[]>();
  for (const entry of pokemonEntries(entries)) {
    const category = pokemonCategoryFor(entry.card);
    const list = grouped.get(category);
    if (list) {
      list.push(entry);
    } else {
      grouped.set(category, [entry]);
    }
  }

  return POKEMON_CATEGORIES.map(({ key, label, color }) => {
    const categoryEntries = grouped.get(key) ?? [];
    const count = categoryEntries.reduce((sum, e) => sum + e.row.quantity, 0);
    const showcase = categoryEntries.reduce<CollectionEntry | null>(
      (best, e) => (best === null || getEntryPrice(e) > getEntryPrice(best) ? e : best),
      null,
    );
    return { key, label, color, count, showcase };
  });
}
