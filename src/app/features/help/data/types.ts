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
