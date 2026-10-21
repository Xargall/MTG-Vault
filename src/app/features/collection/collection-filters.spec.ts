import { describe, expect, it } from 'vitest';

import { Card } from '../../core/models/card.model';
import { getRarityOptions, getTypeKeys, getTypeOptions, matchesPriceRange, sortEntries } from './collection-filters';
import { CollectionEntry } from './collection.service';

function mtg(name: string, extra: Partial<Record<string, unknown>> = {}): CollectionEntry {
  const card = {
    game: 'mtg',
    id: name,
    name,
    oracleName: name,
    localizedName: null,
    imageUrl: null,
    imageUrlSmall: null,
    setName: 'Set',
    rarity: 'common',
    oracleId: null,
    colorIdentity: [],
    manaCost: null,
    cmc: 0,
    typeLine: 'Creature — Elf',
    cardmarketUrl: null,
    setCode: 'set',
    collectorNumber: '1',
    prices: { eur: null, eurFoil: null, usd: null, usdFoil: null },
    ...extra,
  } as unknown as Card;
  return {
    card,
    row: { id: name, quantity: 1, foil: false, created_at: '2026-01-01T00:00:00Z', ...(extra['row'] as object) },
  } as unknown as CollectionEntry;
}

const price = (eur: number | null) => ({ prices: { eur, eurFoil: null, usd: 99, usdFoil: null } });

describe('getTypeKeys', () => {
  it('puts multi-type cards in every matching bucket, ignoring subtypes', () => {
    expect(getTypeKeys(mtg('Golem', { typeLine: 'Artifact Creature — Golem' }).card)).toEqual(['creature', 'artifact']);
    expect(getTypeKeys(mtg('Forest', { typeLine: 'Basic Land — Forest' }).card)).toEqual(['land']);
  });
});

describe('matchesPriceRange', () => {
  it('matches everything without bounds, and never matches an unknown price once bounded', () => {
    const unknown = mtg('A', price(null));
    expect(matchesPriceRange(unknown, null, null)).toBe(true);
    expect(matchesPriceRange(unknown, 0, null)).toBe(false);
  });

  it('uses the EUR price only, inclusive bounds', () => {
    const fiveEuro = mtg('A', price(5));
    expect(matchesPriceRange(fiveEuro, 5, 5)).toBe(true);
    expect(matchesPriceRange(fiveEuro, 6, null)).toBe(false);
    expect(matchesPriceRange(fiveEuro, null, 4.99)).toBe(false);
  });
});

describe('sortEntries', () => {
  const cheap = mtg('Bolt', price(1));
  const pricey = mtg('Crypt', price(400));
  const unpriced = mtg('Apple', price(null));

  it('sorts by price with unknown prices last', () => {
    expect(sortEntries([cheap, unpriced, pricey], 'price').map((e) => e.card.name)).toEqual(['Crypt', 'Bolt', 'Apple']);
  });

  it('sorts by name and breaks ties by name', () => {
    expect(sortEntries([pricey, unpriced, cheap], 'name').map((e) => e.card.name)).toEqual(['Apple', 'Bolt', 'Crypt']);
    expect(sortEntries([pricey, cheap], 'quantity').map((e) => e.card.name)).toEqual(['Bolt', 'Crypt']);
  });

  it('sorts newest first and by rarity rank', () => {
    const old = mtg('Old', { row: { created_at: '2025-01-01T00:00:00Z' } });
    const fresh = mtg('Fresh', { row: { created_at: '2026-06-01T00:00:00Z' } });
    expect(sortEntries([old, fresh], 'recent').map((e) => e.card.name)).toEqual(['Fresh', 'Old']);

    const mythic = mtg('Z', { rarity: 'mythic' });
    expect(sortEntries([cheap, mythic], 'rarity')[0].card.name).toBe('Z');
  });

  it('does not mutate the input', () => {
    const input = [pricey, cheap];
    sortEntries(input, 'name');
    expect(input.map((e) => e.card.name)).toEqual(['Crypt', 'Bolt']);
  });
});

describe('facet options', () => {
  it('lists only present types, counting copies', () => {
    const elves = mtg('Elf', { row: { quantity: 3 } });
    const options = getTypeOptions([elves], 'mtg');
    expect(options).toEqual([{ key: 'creature', labelKey: 'collection.types.creature', count: 3 }]);
  });

  it('orders MTG rarities by rank', () => {
    const keys = getRarityOptions([mtg('a'), mtg('b', { rarity: 'mythic' }), mtg('c', { rarity: 'rare' })], 'mtg').map(
      (o) => o.key,
    );
    expect(keys).toEqual(['mythic', 'rare', 'common']);
  });
});
