import { GameSlug } from '../../core/models/card.model';
import { HELP_TERMS_BASICS } from './data/basics';
import { HELP_TERMS_FORMATS } from './data/formats';
import { HELP_TERMS_KEYWORDS } from './data/keywords';
import { HELP_TERMS_SITUATIONS } from './data/situations';
import { HelpTerm, HelpTermInput } from './data/types';
import { HELP_TERMS_YGO_BASICS } from './data-ygo/basics';
import { HELP_TERMS_YGO_FORMATS } from './data-ygo/formats';
import { HELP_TERMS_YGO_KEYWORDS } from './data-ygo/keywords';
import { HELP_TERMS_YGO_SITUATIONS } from './data-ygo/situations';
import { HELP_TERMS_POKEMON_BASICS } from './data-pokemon/basics';
import { HELP_TERMS_POKEMON_FORMATS } from './data-pokemon/formats';
import { HELP_TERMS_POKEMON_KEYWORDS } from './data-pokemon/keywords';
import { HELP_TERMS_POKEMON_SITUATIONS } from './data-pokemon/situations';

export { HELP_CATEGORIES } from './data/types';
export type { HelpCategory, HelpLang, HelpStep, HelpTerm, LocalizedText } from './data/types';

// Each data file writes its entries without `game` (see HelpTermInput) -
// filled in here, once per game, rather than repeated on every entry.
function withGame(game: GameSlug, terms: HelpTermInput[]): HelpTerm[] {
  return terms.map((term) => ({ ...term, game }));
}

// Content lives as plain bilingual data rather than going through
// ngx-translate's flat key namespace, since each term also carries
// relatedTerms/steps cross-references by id. Split by game, then by
// category, once the glossary outgrew a single file - see data/ (MTG) and
// data-ygo/ (Yu-Gi-Oh!) for the actual entries. Scope and per-game status:
// see CLAUDE.md's Hilfe/Lexikon section.
export const HELP_TERMS: HelpTerm[] = [
  ...withGame('mtg', [...HELP_TERMS_BASICS, ...HELP_TERMS_KEYWORDS, ...HELP_TERMS_FORMATS, ...HELP_TERMS_SITUATIONS]),
  ...withGame('yugioh', [
    ...HELP_TERMS_YGO_BASICS,
    ...HELP_TERMS_YGO_KEYWORDS,
    ...HELP_TERMS_YGO_FORMATS,
    ...HELP_TERMS_YGO_SITUATIONS,
  ]),
  ...withGame('pokemon', [
    ...HELP_TERMS_POKEMON_BASICS,
    ...HELP_TERMS_POKEMON_KEYWORDS,
    ...HELP_TERMS_POKEMON_FORMATS,
    ...HELP_TERMS_POKEMON_SITUATIONS,
  ]),
];
