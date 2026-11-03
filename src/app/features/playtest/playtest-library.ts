import { Card } from '../../core/models/card.model';
import { DeckEntry } from '../decks/deck.service';

export const STARTING_HAND_SIZE = 7;

/** One physical copy of a card on the playtest table - a basic land staged ×17 needs 17 independently draggable/zone-movable identities, which Card.id alone (shared across every copy) can't provide. */
export interface PlaytestCardInstance {
  instanceId: string;
  card: Card;
}

/** A battlefield copy also carries its free-drag position - see Battlefield's own cdkDragFreeDragPosition binding - and its tapped state (the MTG "used this" convention: rotated 90°, toggled by its own button - see Battlefield's tapToggled output). */
export interface BattlefieldCard extends PlaytestCardInstance {
  x: number;
  y: number;
  tapped: boolean;
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

const BAND_CARD_WIDTH = 100;
const BAND_CARD_GAP = 8;
const BAND_ROW_PADDING = 10;

export type BattlefieldBand = 'land' | 'creature' | null;

/** Live-requested: snap a Land straight into the bottom half on drop, instead of leaving it exactly where the pointer released it - creatures snap the same way into the top half (live-requested, 2026-11-03: free placement there "sieht doof aus"). Spells and everything else that only ever passes through the battlefield keep free placement, since there's no rules engine here to know what else deserves its own band. */
export function classifyBattlefieldBand(card: Card): BattlefieldBand {
  if (card.game !== 'mtg') return null;
  if (card.typeLine.includes('Land')) return 'land';
  if (card.typeLine.includes('Creature')) return 'creature';
  return null;
}

/** The snapped {x, y} for a land/creature entering its band, or null when it has no band (free placement at the actual drop point applies instead). Appends to the end of its row, left to right - battlefieldHeight is the live battlefield surface's own rendered height (its bounding rect), so each band stays correctly anchored to its half at any viewport size. Matches battlefield.scss's own 50% divider - no shared source of truth between the CSS split and this JS snap target. */
export function snapToBand(
  card: Card,
  existingBattlefieldCards: { card: Card }[],
  battlefieldHeight: number,
): { x: number; y: number } | null {
  const band = classifyBattlefieldBand(card);
  if (!band) return null;

  const y = band === 'land' ? battlefieldHeight / 2 + BAND_ROW_PADDING : BAND_ROW_PADDING;
  const countInBand = existingBattlefieldCards.filter((c) => classifyBattlefieldBand(c.card) === band).length;
  const x = BAND_ROW_PADDING + countInBand * (BAND_CARD_WIDTH + BAND_CARD_GAP);
  return { x, y };
}

/** A basic MTG turn structure, simplified to the steps a solo goldfish session actually benefits from - no combat sub-steps (declare attackers/blockers/damage), no stack, no legality checks, since none of that is this feature's job (see the plan doc: no rules engine). Untap and Draw are the only steps with an automatic effect (see Playtest.advancePhase) - the rest are just where-am-I markers the player clicks through. */
export const PHASE_ORDER = ['untap', 'upkeep', 'draw', 'main1', 'combat', 'main2', 'end'] as const;
export type Phase = (typeof PHASE_ORDER)[number];

/** The next {phase, turn} after "Weiter" - wraps from the last phase back to the first and bumps the turn counter, pure so it's testable without the component's DOM/timer plumbing. */
export function nextPhase(phase: Phase, turn: number): { phase: Phase; turn: number } {
  const index = PHASE_ORDER.indexOf(phase);
  const isLastPhase = index === PHASE_ORDER.length - 1;
  return isLastPhase ? { phase: PHASE_ORDER[0], turn: turn + 1 } : { phase: PHASE_ORDER[index + 1], turn };
}

/** A real London Mulligan: shuffle hand back in, draw a fresh 7, then put one card per mulligan already taken on the bottom of the library (the Nth mulligan keeps 7-N cards). There's no card-selection UI here (that's a bigger interaction than this feature's scope), so which cards go to the bottom isn't the player's choice - always the last ones of the freshly drawn 7, in draw order. mulliganCount is the count *before* this call (0 for the first mulligan) - Playtest increments it itself so the signal update and this pure calculation don't race. */
export function mulligan(
  library: PlaytestCardInstance[],
  hand: PlaytestCardInstance[],
  mulliganCount: number,
): { library: PlaytestCardInstance[]; hand: PlaytestCardInstance[] } {
  const combined = shuffle([...library, ...hand]);
  const drawn = combined.slice(0, STARTING_HAND_SIZE);
  const rest = combined.slice(STARTING_HAND_SIZE);
  const keep = Math.max(0, STARTING_HAND_SIZE - (mulliganCount + 1));
  return { library: [...rest, ...drawn.slice(keep)], hand: drawn.slice(0, keep) };
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
