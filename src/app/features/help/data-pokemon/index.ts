import { HelpTermInput } from '../data/types';
import { HELP_TERMS_POKEMON_BASICS } from './basics';
import { HELP_TERMS_POKEMON_FORMATS } from './formats';
import { HELP_TERMS_POKEMON_KEYWORDS } from './keywords';
import { HELP_TERMS_POKEMON_SITUATIONS } from './situations';

/** Everything the Pokémon glossary has - one module so the whole game loads as a single lazy chunk. */
export const HELP_TERMS_POKEMON: HelpTermInput[] = [
  ...HELP_TERMS_POKEMON_BASICS,
  ...HELP_TERMS_POKEMON_KEYWORDS,
  ...HELP_TERMS_POKEMON_FORMATS,
  ...HELP_TERMS_POKEMON_SITUATIONS,
];
