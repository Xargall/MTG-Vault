import { describe, expect, it } from 'vitest';

import { Card } from '../../core/models/card.model';
import { buildAssignedElsewhereMaps, getCardAvailability } from './deck-stats';
import { DeckCardRow, DeckEntry, DeckRow } from './deck.service';

function deckEntry(
  id: string,
  cardRows: Array<{ cardId: string; quantity: number; isAssigned?: boolean }>,
): DeckEntry {
  return {
    deck: { id, name: id, is_precon: false, all_cards_owned: false } as unknown as DeckRow,
    cards: cardRows.map(({ cardId, quantity, isAssigned = true }) => ({
      row: { id: `${id}-${cardId}`, deck_id: id, card_id: cardId, quantity, is_assigned: isAssigned } as DeckCardRow,
      card: { id: cardId, oracleId: null } as unknown as Card,
    })),
  };
}

describe('buildAssignedElsewhereMaps + getCardAvailability', () => {
  it('frees up a card shared by two decks once the other deck releases its claim', () => {
    const deckA = deckEntry('deck-a', [{ cardId: 'sol-ring', quantity: 1 }]);
    const deckB = deckEntry('deck-b', [{ cardId: 'sol-ring', quantity: 1 }]);
    // One physical copy owned, claimed on paper by both decks at once.
    const owned = new Map([['sol-ring', 1]]);
    const ownedByOracle = new Map<string, number>();

    const before = buildAssignedElsewhereMaps([deckA, deckB], 'deck-a');
    const availabilityBefore = getCardAvailability(
      { cardId: 'sol-ring' },
      1,
      owned,
      ownedByOracle,
      before.byCardId,
      before.byOracleId,
    );
    expect(availabilityBefore.available).toBe(0); // Deck B's claim uses up the one copy

    // Deck B releases its claim (DeckService.releaseAssignment sets is_assigned: false).
    deckB.cards[0].row.is_assigned = false;

    const after = buildAssignedElsewhereMaps([deckA, deckB], 'deck-a');
    const availabilityAfter = getCardAvailability(
      { cardId: 'sol-ring' },
      1,
      owned,
      ownedByOracle,
      after.byCardId,
      after.byOracleId,
    );
    expect(availabilityAfter.available).toBe(1); // now free for Deck A to actually use
  });
});
