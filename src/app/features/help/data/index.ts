import { HELP_TERMS_BASICS } from './basics';
import { HELP_TERMS_FORMATS } from './formats';
import { HELP_TERMS_KEYWORDS } from './keywords';
import { HELP_TERMS_SITUATIONS } from './situations';
import { HelpTermInput } from './types';

/** Everything the MTG glossary has - one module so the whole game loads as a single lazy chunk. */
export const HELP_TERMS_MTG: HelpTermInput[] = [
  ...HELP_TERMS_BASICS,
  ...HELP_TERMS_KEYWORDS,
  ...HELP_TERMS_FORMATS,
  ...HELP_TERMS_SITUATIONS,
];
