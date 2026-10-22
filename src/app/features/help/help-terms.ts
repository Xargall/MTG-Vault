import { HELP_TERMS_BASICS } from './data/basics';
import { HELP_TERMS_FORMATS } from './data/formats';
import { HELP_TERMS_KEYWORDS } from './data/keywords';
import { HELP_TERMS_SITUATIONS } from './data/situations';

export { HELP_CATEGORIES } from './data/types';
export type { HelpCategory, HelpLang, HelpStep, HelpTerm, LocalizedText } from './data/types';

// MTG-only for now (see CLAUDE.md) - content lives here as plain bilingual
// data rather than going through ngx-translate's flat key namespace, since
// each term also carries relatedTerms/steps cross-references by id. Split
// by category into src/app/features/help/data/ once the glossary outgrew a
// single file - see that folder for the actual entries.
export const HELP_TERMS = [...HELP_TERMS_BASICS, ...HELP_TERMS_KEYWORDS, ...HELP_TERMS_FORMATS, ...HELP_TERMS_SITUATIONS];
