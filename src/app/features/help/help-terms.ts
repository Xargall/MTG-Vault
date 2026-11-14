import { GameSlug } from '../../core/models/card.model';
import { HelpTerm, HelpTermInput } from './data/types';

export { HELP_CATEGORIES } from './data/types';
export type { HelpCategory, HelpLang, HelpStep, HelpTerm, LocalizedText } from './data/types';

// Each data file writes its entries without `game` (see HelpTermInput) -
// filled in here, once per game, rather than repeated on every entry.
function withGame(game: GameSlug, terms: HelpTermInput[]): HelpTerm[] {
  return terms.map((term) => ({ ...term, game }));
}

// Content lives as plain bilingual data rather than going through
// ngx-translate's flat key namespace, since each term also carries
// relatedTerms/steps cross-references by id. One lazy chunk per game (see
// data/, data-ygo/, data-pokemon/ - each with an index.ts), loaded only when
// that game's Help page is opened: the page used to ship all three
// glossaries (~360 kB) to everyone. Scope and per-game status: see
// CLAUDE.md's Hilfe/Lexikon section.
const LOADERS: Record<string, () => Promise<HelpTermInput[]>> = {
  mtg: () => import('./data/index').then((m) => m.HELP_TERMS_MTG),
  yugioh: () => import('./data-ygo/index').then((m) => m.HELP_TERMS_YGO),
  pokemon: () => import('./data-pokemon/index').then((m) => m.HELP_TERMS_POKEMON),
};

const cache = new Map<GameSlug, Promise<HelpTerm[]>>();

/** All glossary terms of one game (empty for a game without a glossary); loaded once, then cached. */
export function loadHelpTerms(game: GameSlug): Promise<HelpTerm[]> {
  let terms = cache.get(game);
  if (!terms) {
    const load = LOADERS[game];
    terms = load ? load().then((inputs) => withGame(game, inputs)) : Promise.resolve([]);
    // A failed chunk load (offline, deploy in between) must not stay cached.
    terms.catch(() => cache.delete(game));
    cache.set(game, terms);
  }
  return terms;
}
