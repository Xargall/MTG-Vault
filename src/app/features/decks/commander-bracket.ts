import { MtgCard } from '../../core/models/card.model';
import { DeckCardEntry } from './deck.service';

// A rough, client-computed approximation of the Commander Format Panel's
// published Bracket 1-5 system (Exhibition/Core/Upgraded/Optimized/cEDH) -
// WotC's own framing explicitly treats this as a conversation-starter, not
// an algorithm, and the thresholds below are this app's own simplification
// of it, not an official ruling. Two signal tiers:
//  - "game changer count" (scryfall_cards.game_changer, migration 035) is
//    local and free - always available, no external call.
//  - mass land denial / two-card combo detection has no equivalent local
//    field (neither Scryfall nor our own data models "this locks players out
//    of land drops" or "these two cards combo infinitely") - only Commander
//    Spellbook's /estimate-bracket API can answer that, hence the optional,
//    on-demand (button-triggered, not eager) commanderSpellbookResult param.
export type CommanderBracket = 1 | 2 | 3 | 4;
// Bracket 5 (cEDH) deliberately isn't a possible return value - distinguishing
// "high-powered Optimized" from "actually cEDH" depends on deck consistency/
// tuning, not a countable signal this data can measure, and guessing it would
// be exactly the overconfident "autoritative Einstufung" the UI is required
// not to present as fact.

export const BRACKET_LABELS: Record<CommanderBracket, string> = {
  1: 'Exhibition',
  2: 'Core',
  3: 'Upgraded',
  4: 'Optimized',
};

export interface BracketFactors {
  gameChangerCount: number;
  gameChangerCards: string[];
  massLandDenialCards: string[];
  extraTurnCards: string[];
  twoCardComboCount: number;
}

export interface BracketEstimate {
  bracket: CommanderBracket;
  factors: BracketFactors;
  /** Whether a Commander Spellbook combo/MLD/extra-turn check actually ran - false means this is the game-changer-only fast path, and mass land denial/combos simply weren't checked (not "confirmed absent"). */
  combosChecked: boolean;
}

/** Commander Spellbook's /estimate-bracket response, narrowed to the fields this app actually uses - see CommanderSpellbookService. */
export interface CommanderSpellbookResult {
  cards: Array<{ gameChanger: boolean; massLandDenial: boolean; extraTurn: boolean; quantity: number; card: { name: string } }>;
  combos: Array<{ definitelyTwoCard: boolean; arguablyTwoCard: boolean }>;
}

// deck.format is free text (manual import, or a literal format slug/name
// from the app's own deck-building flows - see DeckService.addDeck/
// addArchetypeDeck) - there's no fixed enum to match against, so this
// recognizes the handful of real-world spellings rather than requiring an
// exact "Commander" match. Still only a heuristic: an oddly-labeled
// Commander deck ("EDH 2024", "Jumpstart Commander") won't match, and the
// bracket section simply won't offer itself for it.
const COMMANDER_FORMAT_PATTERN = /commander|^edh$|^cedh$/i;

export function isCommanderFormat(format: string | null): boolean {
  return format !== null && COMMANDER_FORMAT_PATTERN.test(format.trim());
}

const GAME_CHANGER_THRESHOLD_UPGRADED = 1;
const GAME_CHANGER_THRESHOLD_OPTIMIZED = 4;

/**
 * Local-only estimate (see getBracketEstimate for the full version) - game
 * changer count from the deck's own cards, nothing else. Used as the always-
 * visible baseline, and as getBracketEstimate's fallback when no Commander
 * Spellbook result is given yet.
 */
export function getGameChangerFactors(cards: DeckCardEntry[]): { count: number; names: string[] } {
  const names: string[] = [];
  let count = 0;
  for (const { row, card } of cards) {
    if (card.game !== 'mtg') continue;
    const mtgCard = card as MtgCard;
    if (mtgCard.gameChanger) {
      count += row.quantity;
      names.push(mtgCard.name);
    }
  }
  return { count, names };
}

/**
 * Full estimate. `commanderSpellbookResult` is null until the user explicitly
 * triggers the on-demand check (see DeckDetailDialog.checkBracketCombos) -
 * without it, mass land denial/two-card combos are simply not factored in
 * (combosChecked: false), not assumed absent, and the UI must say so rather
 * than implying a clean bracket 1-3 result.
 */
export function getBracketEstimate(
  cards: DeckCardEntry[],
  commanderSpellbookResult: CommanderSpellbookResult | null,
): BracketEstimate {
  const gameChangers = getGameChangerFactors(cards);

  const massLandDenialCards = commanderSpellbookResult
    ? commanderSpellbookResult.cards.filter((c) => c.massLandDenial).map((c) => c.card.name)
    : [];
  const extraTurnCards = commanderSpellbookResult
    ? commanderSpellbookResult.cards.filter((c) => c.extraTurn).map((c) => c.card.name)
    : [];
  const twoCardComboCount = commanderSpellbookResult
    ? commanderSpellbookResult.combos.filter((c) => c.definitelyTwoCard).length
    : 0;

  const hasHardSignal = massLandDenialCards.length > 0 || twoCardComboCount > 0;

  let bracket: CommanderBracket;
  if (hasHardSignal || gameChangers.count >= GAME_CHANGER_THRESHOLD_OPTIMIZED) {
    bracket = 4;
  } else if (gameChangers.count >= GAME_CHANGER_THRESHOLD_UPGRADED) {
    bracket = 3;
  } else {
    // Can't distinguish Exhibition (1) from Core (2) from countable card
    // data alone - WotC's own guidance separates those by deck *theme and
    // intent* ("ultra-casual" vs. "precon-level"), not a measurable
    // property. Defaults to the more common case (2) rather than guessing.
    bracket = 2;
  }

  return {
    bracket,
    factors: {
      gameChangerCount: gameChangers.count,
      gameChangerCards: gameChangers.names,
      massLandDenialCards,
      extraTurnCards,
      twoCardComboCount,
    },
    combosChecked: commanderSpellbookResult !== null,
  };
}

/** {name, quantity} payload Commander Spellbook's /estimate-bracket expects - see CommanderSpellbookService.estimateBracket. */
export function toDeckRequestCards(cards: DeckCardEntry[], excludeCardIds: Set<string>): Array<{ card: string; quantity: number }> {
  const byName = new Map<string, number>();
  for (const { row, card } of cards) {
    if (card.game !== 'mtg') continue;
    if (excludeCardIds.has(row.card_id)) continue;
    byName.set(card.oracleName, (byName.get(card.oracleName) ?? 0) + row.quantity);
  }
  return [...byName.entries()].map(([card, quantity]) => ({ card, quantity }));
}
