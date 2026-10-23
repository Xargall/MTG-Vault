import { GameSlug } from '../../../core/models/card.model';

export type HelpCategory = 'basics' | 'keywords' | 'formats' | 'situations';
export type HelpLang = 'de' | 'en';

export interface LocalizedText {
  de: string;
  en: string;
}

export interface HelpStep extends LocalizedText {
  // A real decision fork under this step (e.g. "may" vs. mandatory) - each
  // entry is one short outcome label. Only "may-vs-mandatory-trigger" uses
  // this; every other situation is a plain linear procedure and omits it
  // (see CLAUDE.md: forcing a flowchart shape onto a sequential procedure
  // adds visual complexity without new information).
  branches?: LocalizedText[];
}

export interface HelpTerm {
  id: string;
  // Which game this term belongs to - the Lexikon started MTG-only (see
  // CLAUDE.md), then grew Yu-Gi-Oh!/Pokémon term sets alongside it. Help
  // filters the combined HELP_TERMS list down to the active game, so an
  // id only needs to be unique within its own game's data files in
  // practice, but every per-game data file prefixes its ids (e.g. `ygo-`)
  // anyway to make that obvious and keep help-terms.spec.ts's
  // whole-list uniqueness check meaningful.
  game: GameSlug;
  category: HelpCategory;
  term: LocalizedText;
  definitionNormal: LocalizedText;
  definitionTrottel: LocalizedText;
  relatedTerms?: string[];
  // Situations only: a short, mode-independent step-by-step walkthrough,
  // rendered as its own diagram below the definition (see help.scss).
  steps?: HelpStep[];
  // Situations only: exact English card names for small reference
  // thumbnails, fetched live from Scryfall's named-card image redirect
  // (no local image storage, same on-demand-from-the-API convention as the
  // rest of the app - see CLAUDE.md § Konventionen).
  exampleCards?: string[];
}

export const HELP_CATEGORIES: HelpCategory[] = ['basics', 'keywords', 'formats', 'situations'];

// What a per-game data file actually declares - `game` is filled in once,
// in help-terms.ts, via withGame() rather than repeated on every one of
// the (by now hundreds of) individual entries.
export type HelpTermInput = Omit<HelpTerm, 'game'>;
