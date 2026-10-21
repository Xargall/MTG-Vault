import { Card, GameSlug } from '../../core/models/card.model';
import { getEntryPrice } from './card-price-stats';
import { CollectionEntry } from './collection.service';

// --- Card type ---------------------------------------------------------------

interface TypeOption {
  key: string;
  labelKey: string;
  /** Lower-case fragments of the game's own type field that put a card in this bucket. */
  matches: string[];
}

// MTG matches the English type_line (Scryfall always delivers it in English,
// whatever language the card name is displayed in), before the "—" subtypes.
// A card can sit in several buckets ("Artifact Creature").
const TYPE_OPTIONS: Record<GameSlug, TypeOption[]> = {
  mtg: [
    { key: 'creature', labelKey: 'collection.types.creature', matches: ['creature'] },
    { key: 'instant', labelKey: 'collection.types.instant', matches: ['instant'] },
    { key: 'sorcery', labelKey: 'collection.types.sorcery', matches: ['sorcery'] },
    { key: 'artifact', labelKey: 'collection.types.artifact', matches: ['artifact'] },
    { key: 'enchantment', labelKey: 'collection.types.enchantment', matches: ['enchantment'] },
    { key: 'planeswalker', labelKey: 'collection.types.planeswalker', matches: ['planeswalker'] },
    { key: 'battle', labelKey: 'collection.types.battle', matches: ['battle'] },
    { key: 'land', labelKey: 'collection.types.land', matches: ['land'] },
  ],
  yugioh: [
    { key: 'monster', labelKey: 'collection.types.monster', matches: ['monster'] },
    { key: 'spell', labelKey: 'collection.types.spell', matches: ['spell'] },
    { key: 'trap', labelKey: 'collection.types.trap', matches: ['trap'] },
  ],
  pokemon: [
    { key: 'pokemon', labelKey: 'collection.types.pokemon', matches: ['pokémon', 'pokemon'] },
    { key: 'trainer', labelKey: 'collection.types.trainer', matches: ['trainer'] },
    { key: 'energy', labelKey: 'collection.types.energy', matches: ['energie', 'energy'] },
  ],
};

function typeField(card: Card): string {
  if (card.game === 'mtg') return card.typeLine.split('—')[0].toLowerCase();
  if (card.game === 'yugioh') return card.cardType.toLowerCase();
  return card.supertype.toLowerCase();
}

/** Every type bucket this card falls into. */
export function getTypeKeys(card: Card): string[] {
  const field = typeField(card);
  return TYPE_OPTIONS[card.game].filter((option) => option.matches.some((m) => field.includes(m))).map((o) => o.key);
}

// --- Rarity ------------------------------------------------------------------

// Values are i18n keys - MTG's rarities are a fixed set worth translating;
// Yu-Gi-Oh!/Pokémon rarity names are shown as delivered.
export const MTG_RARITY_LABELS: Record<string, string> = {
  common: 'rarity.common',
  uncommon: 'rarity.uncommon',
  rare: 'rarity.rare',
  mythic: 'rarity.mythic',
  special: 'rarity.special',
  bonus: 'rarity.bonus',
};

const MTG_RARITY_RANK: Record<string, number> = { mythic: 5, rare: 4, uncommon: 3, common: 2, special: 1, bonus: 1 };

export function rarityLabelKey(game: GameSlug, rarity: string): string {
  return game === 'mtg' ? (MTG_RARITY_LABELS[rarity] ?? rarity) : rarity;
}

function rarityRank(card: Card): number {
  if (!card.rarity) return 0;
  return card.game === 'mtg' ? (MTG_RARITY_RANK[card.rarity] ?? 0) : 0;
}

// --- Facet options -------------------------------------------------------------

export interface FacetOption {
  key: string;
  labelKey: string;
  count: number;
}

/** Type buckets present in these entries (with card counts), in the game's own order. */
export function getTypeOptions(entries: CollectionEntry[], game: GameSlug): FacetOption[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const key of getTypeKeys(entry.card)) counts.set(key, (counts.get(key) ?? 0) + entry.row.quantity);
  }
  return TYPE_OPTIONS[game]
    .filter((option) => counts.has(option.key))
    .map((option) => ({ key: option.key, labelKey: option.labelKey, count: counts.get(option.key)! }));
}

/** Rarities present in these entries - MTG by rank (mythic first), others by count. */
export function getRarityOptions(entries: CollectionEntry[], game: GameSlug): FacetOption[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const rarity = entry.card.rarity;
    if (rarity) counts.set(rarity, (counts.get(rarity) ?? 0) + entry.row.quantity);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, labelKey: rarityLabelKey(game, key), count }))
    .sort((a, b) =>
      game === 'mtg'
        ? (MTG_RARITY_RANK[b.key] ?? 0) - (MTG_RARITY_RANK[a.key] ?? 0)
        : b.count - a.count || a.key.localeCompare(b.key),
    );
}

// --- Price ---------------------------------------------------------------------

/** EUR price of one copy (foil price for a foil copy), or null when unknown. */
export function getUnitPrice(entry: CollectionEntry): number | null {
  return getEntryPrice(entry, 'eur') || null;
}

/** Unknown prices never match a price range - there's nothing to compare. */
export function matchesPriceRange(entry: CollectionEntry, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  const price = getUnitPrice(entry);
  if (price === null) return false;
  return (min === null || price >= min) && (max === null || price <= max);
}

// --- Sorting -------------------------------------------------------------------

export type CollectionSort = 'name' | 'price' | 'recent' | 'cmc' | 'rarity' | 'quantity';

export const SORT_OPTIONS: { value: CollectionSort; labelKey: string; mtgOnly?: boolean }[] = [
  { value: 'name', labelKey: 'collection.sort.name' },
  { value: 'price', labelKey: 'collection.sort.price' },
  { value: 'recent', labelKey: 'collection.sort.recent' },
  { value: 'cmc', labelKey: 'collection.sort.cmc', mtgOnly: true },
  { value: 'rarity', labelKey: 'collection.sort.rarity' },
  { value: 'quantity', labelKey: 'collection.sort.quantity' },
];

/** Returns a sorted copy; ties always fall back to the card name, so the order is stable and predictable. */
export function sortEntries(entries: CollectionEntry[], sort: CollectionSort): CollectionEntry[] {
  const byName = (a: CollectionEntry, b: CollectionEntry) => a.card.name.localeCompare(b.card.name);
  const compare: Record<CollectionSort, (a: CollectionEntry, b: CollectionEntry) => number> = {
    name: byName,
    // Unknown prices sink to the end.
    price: (a, b) => (getUnitPrice(b) ?? -1) - (getUnitPrice(a) ?? -1),
    recent: (a, b) => b.row.created_at.localeCompare(a.row.created_at),
    cmc: (a, b) => (a.card.game === 'mtg' ? a.card.cmc : 0) - (b.card.game === 'mtg' ? b.card.cmc : 0),
    rarity: (a, b) => rarityRank(b.card) - rarityRank(a.card),
    quantity: (a, b) => b.row.quantity - a.row.quantity,
  };
  return [...entries].sort((a, b) => compare[sort](a, b) || byName(a, b));
}
