import { describe, expect, it } from 'vitest';

import { Card } from '../../core/models/card.model';
import { CollectionEntry } from '../collection/collection.service';
import { buildAssignedElsewhereMaps, getCardAvailability, splitAverageDeckByAvailability } from './deck-stats';
import { DeckCardRow, DeckEntry, DeckRow } from './deck.service';

function deckEntry(
  id: string,
  cardRows: Array<{ cardId: string; quantity: number; isAssigned?: boolean }>,
  options: { isPrecon?: boolean } = {},
): DeckEntry {
  return {
    deck: { id, name: id, is_precon: options.isPrecon ?? false, all_cards_owned: false } as unknown as DeckRow,
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

  it('keeps 5 Game Night precons each at 100%, even though they all share one card_id', () => {
    // Each precon was granted its own real copy (DeckService.grantAllCards
    // always adds the full quantity unconditionally for a precon/sealed
    // product - see its own doc comment) - 5 precons, 5 copies owned total,
    // never 1 shared copy pretending to satisfy all 5 at once.
    const gameNightDecks = Array.from({ length: 5 }, (_, i) =>
      deckEntry(`game-night-${i}`, [{ cardId: 'howling-golem', quantity: 1 }], { isPrecon: true }),
    );
    const owned = new Map([['howling-golem', 5]]);
    const ownedByOracle = new Map<string, number>();

    for (const deck of gameNightDecks) {
      const { byCardId, byOracleId } = buildAssignedElsewhereMaps(gameNightDecks, deck.deck.id);
      const availability = getCardAvailability(
        { cardId: 'howling-golem' },
        1,
        owned,
        ownedByOracle,
        byCardId,
        byOracleId,
      );
      // 5 owned minus the other 4 precons' own claims (4) = 1, exactly what
      // this deck itself needs - each of the 5 nets out to "available" on
      // its own, independent copy, not "sharing" one.
      expect(availability.available).toBe(1);
      expect(availability.status).toBe('available');
    }
  });

  it('treats a card that only exists inside one precon as unavailable for an unrelated recommendation scan', () => {
    // Live-reported bug: Graha Tia only ever entered the collection via the
    // Final Fantasy Starter Deck precon, but kept showing up as a free
    // commander candidate in CommanderRecommendationsDialog - that physical
    // copy is sealed inside the precon, not loose in the binder.
    const finalFantasyPrecon = deckEntry('ff-starter', [{ cardId: 'graha-tia', quantity: 1 }], { isPrecon: true });
    const owned = new Map([['graha-tia', 1]]);
    const ownedByOracle = new Map<string, number>();

    // currentDeckId: null - same call shape as getFreelyOwnedEntries, asking
    // "is this free for something else entirely", not for the precon itself.
    const { byCardId, byOracleId } = buildAssignedElsewhereMaps([finalFantasyPrecon], null);
    const availability = getCardAvailability(
      { cardId: 'graha-tia' },
      1,
      owned,
      ownedByOracle,
      byCardId,
      byOracleId,
    );
    expect(availability.available).toBe(0);
    expect(availability.status).toBe('unavailable');
  });

  it('resolves an EDHREC deck card whose owned printing has a translated display name', () => {
    // Live-reported bug: with the UI set to German, a resolved card's own
    // `name` can be swapped to its translated print name (e.g.
    // "Panharmonikon") while EDHREC's own decklist name stays English
    // ("Panharmonicon") - looking cardsByOracleName up by the EDHREC name
    // only works if the map itself is keyed by oracleName, not `name`.
    const panharmonicon = {
      id: 'print-de',
      name: 'Panharmonikon',
      oracleName: 'Panharmonicon',
      oracleId: 'oracle-panharmonicon',
    } as unknown as Card;
    const cardsByOracleName = new Map([[panharmonicon.oracleName.toLowerCase(), panharmonicon]]);

    const collectionEntries: CollectionEntry[] = [
      {
        row: { card_id: 'print-de', oracle_id: 'oracle-panharmonicon', quantity: 1 } as never,
        card: panharmonicon,
      },
    ];

    const { owned, unresolved } = splitAverageDeckByAvailability(
      [{ name: 'Panharmonicon', quantity: 1 }],
      cardsByOracleName,
      collectionEntries,
      [],
    );
    expect(unresolved).toEqual([]);
    expect(owned).toHaveLength(1);
    expect(owned[0].quantity).toBe(1);
  });
});
