import { HelpTermInput } from '../data/types';
import { HELP_TERMS_YGO_BASICS } from './basics';
import { HELP_TERMS_YGO_FORMATS } from './formats';
import { HELP_TERMS_YGO_KEYWORDS } from './keywords';
import { HELP_TERMS_YGO_SITUATIONS } from './situations';

/** Everything the Yu-Gi-Oh! glossary has - one module so the whole game loads as a single lazy chunk. */
export const HELP_TERMS_YGO: HelpTermInput[] = [
  ...HELP_TERMS_YGO_BASICS,
  ...HELP_TERMS_YGO_KEYWORDS,
  ...HELP_TERMS_YGO_FORMATS,
  ...HELP_TERMS_YGO_SITUATIONS,
];
