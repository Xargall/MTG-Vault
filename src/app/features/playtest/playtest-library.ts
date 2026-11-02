import { Card } from '../../core/models/card.model';
import { DeckEntry } from '../decks/deck.service';

/** One physical copy of a card on the playtest table - a basic land staged ×17 needs 17 independently draggable/zone-movable identities, which Card.id alone (shared across every copy) can't provide. */
export interface PlaytestCardInstance {
  instanceId: string;
  card: Card;
}

/** A battlefield copy also carries its free-drag position - see Battlefield's own cdkDragFreeDragPosition binding. */
export interface BattlefieldCard extends PlaytestCardInstance {
  x: number;
  y: number;
}

/** Builds the shuffle-ready library from a saved deck: excludes MTG token cards (same predicate as DeckDetailDialog.mainCards - a token isn't a real card to draw into a goldfish hand) and pulls the commander out into its own slot when the deck has one, instead of shuffling it into the 99/100. commander_card_id is only ever set by a precon import (see DeckService.addPreconDeck) - an EDHREC or manually-imported Commander deck has no commander data to find here, so it just plays as an ordinary library with no Command Zone (a known v1 limitation, not a bug). */
export function buildLibrary(entry: DeckEntry): { library: PlaytestCardInstance[]; commander: PlaytestCardInstance | null } {
  const commanderCardId = entry.deck.commander_card_id;
  let commander: PlaytestCardInstance | null = null;

  const library: PlaytestCardInstance[] = [];
  for (const { row, card } of entry.cards) {
    if (card.game === 'mtg' && card.typeLine.startsWith('Token')) continue;

    // One copy goes to the Command Zone, any further copies (shouldn't
    // happen for a real commander, but a silently dropped card would be a
    // worse failure than an extra library copy) still join the library.
    let remaining = row.quantity;
    if (commanderCardId && card.id === commanderCardId && !commander) {
      commander = { instanceId: crypto.randomUUID(), card };
      remaining -= 1;
    }

    for (let i = 0; i < remaining; i++) {
      library.push({ instanceId: crypto.randomUUID(), card });
    }
  }

  return { library, commander };
}

/** Fisher-Yates - uniform shuffle, in place on a copy (the input array is never mutated). */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
