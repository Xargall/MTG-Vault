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

// Matches battlefield.scss's two divider lines exactly (both read off
// `calc(100% - <bottomOffset>px)`) - no shared source of truth between the
// CSS bands and this JS snap target between the two.
const CREATURES_BAND_BOTTOM = 220;
const LANDS_BAND_BOTTOM = 110;
const BAND_CARD_WIDTH = 100;
const BAND_CARD_GAP = 8;
const BAND_ROW_PADDING = 10;

export type BattlefieldBand = 'creature' | 'land' | null;

/** Live-requested: snap a Land or Creature straight into its labeled band on drop, instead of leaving it exactly where the pointer released it - everything else (spells, sorceries, artifacts, anything non-MTG) keeps free placement, since there's no rules engine here to know what else deserves its own band. */
export function classifyBattlefieldBand(card: Card): BattlefieldBand {
  if (card.game !== 'mtg') return null;
  if (card.typeLine.includes('Land')) return 'land';
  if (card.typeLine.includes('Creature')) return 'creature';
  return null;
}

/** The snapped {x, y} for a card entering a band, or null when it has no band (free placement at the actual drop point applies instead). Appends to the end of whatever's already in that band, left to right - battlefieldHeight is the live battlefield surface's own rendered height (its bounding rect), so the bands stay correctly bottom-anchored at any viewport size. */
export function snapToBand(
  card: Card,
  existingBattlefieldCards: { card: Card }[],
  battlefieldHeight: number,
): { x: number; y: number } | null {
  const band = classifyBattlefieldBand(card);
  if (!band) return null;

  const bottomOffset = band === 'creature' ? CREATURES_BAND_BOTTOM : LANDS_BAND_BOTTOM;
  const y = battlefieldHeight - bottomOffset + BAND_ROW_PADDING;
  const countInBand = existingBattlefieldCards.filter((c) => classifyBattlefieldBand(c.card) === band).length;
  const x = BAND_ROW_PADDING + countInBand * (BAND_CARD_WIDTH + BAND_CARD_GAP);
  return { x, y };
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
