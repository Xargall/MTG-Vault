import { describe, expect, it } from 'vitest';

import { Card } from '../../core/models/card.model';
import { buildLibrary, shuffle } from './playtest-library';
import { DeckCardRow, DeckEntry, DeckRow } from '../decks/deck.service';

function mtgCard(id: string, typeLine = 'Creature'): Card {
  return { game: 'mtg', id, typeLine } as unknown as Card;
}

function deckEntry(
  commanderCardId: string | null,
  cardRows: Array<{ cardId: string; quantity: number; typeLine?: string }>,
): DeckEntry {
  return {
    deck: { id: 'deck-1', commander_card_id: commanderCardId } as unknown as DeckRow,
    cards: cardRows.map(({ cardId, quantity, typeLine }) => ({
      row: { id: `deck-1-${cardId}`, deck_id: 'deck-1', card_id: cardId, quantity, is_assigned: true } as DeckCardRow,
      card: mtgCard(cardId, typeLine),
    })),
  };
}

describe('buildLibrary', () => {
  it('excludes token cards from the shuffled library', () => {
    const entry = deckEntry(null, [
      { cardId: 'sol-ring', quantity: 1 },
      { cardId: 'treasure-token', quantity: 1, typeLine: 'Token Artifact' },
    ]);

    const { library } = buildLibrary(entry);

    expect(library.map((c) => c.card.id)).toEqual(['sol-ring']);
  });

  it('flattens a row with quantity > 1 into that many independent instances', () => {
    const entry = deckEntry(null, [{ cardId: 'island', quantity: 4 }]);

    const { library } = buildLibrary(entry);

    expect(library).toHaveLength(4);
    expect(library.every((c) => c.card.id === 'island')).toBe(true);
    expect(new Set(library.map((c) => c.instanceId)).size).toBe(4); // each copy independently identifiable
  });

  it('pulls the commander into its own slot exactly once, not into the library', () => {
    const entry = deckEntry('atraxa', [
      { cardId: 'atraxa', quantity: 1 },
      { cardId: 'sol-ring', quantity: 1 },
    ]);

    const { library, commander } = buildLibrary(entry);

    expect(commander?.card.id).toBe('atraxa');
    expect(library.map((c) => c.card.id)).toEqual(['sol-ring']);
  });

  it('leaves the library untouched (no Command Zone) when the deck has no commander_card_id', () => {
    const entry = deckEntry(null, [{ cardId: 'sol-ring', quantity: 1 }]);

    const { library, commander } = buildLibrary(entry);

    expect(commander).toBeNull();
    expect(library).toHaveLength(1);
  });
});

describe('shuffle', () => {
  it('returns a permutation of the same length and elements, without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = shuffle(input);

    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
