import { beforeAll, describe, expect, it } from 'vitest';

import { GameSlug } from '../../core/models/card.model';
import { HelpTerm, loadHelpTerms } from './help-terms';

const GAMES: GameSlug[] = ['mtg', 'yugioh', 'pokemon'];

describe('help terms', () => {
  let byGame: Record<string, HelpTerm[]>;
  let all: HelpTerm[];

  beforeAll(async () => {
    byGame = Object.fromEntries(await Promise.all(GAMES.map(async (game) => [game, await loadHelpTerms(game)])));
    all = Object.values(byGame).flat();
  });

  it('loads a glossary for every game and tags it with that game', () => {
    for (const game of GAMES) {
      expect(byGame[game].length, game).toBeGreaterThan(0);
      expect(byGame[game].every((term) => term.game === game), game).toBe(true);
    }
  });

  it('has no duplicate ids', () => {
    const ids = all.map((term) => term.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only cross-references ids that actually exist', () => {
    const knownIds = new Set(all.map((term) => term.id));
    const brokenReferences = all.flatMap((term) =>
      (term.relatedTerms ?? [])
        .filter((relatedId) => !knownIds.has(relatedId))
        .map((relatedId) => `${term.id} -> ${relatedId}`),
    );
    expect(brokenReferences).toEqual([]);
  });

  it('carries both languages for every term and definition', () => {
    for (const term of all) {
      expect(term.term.de, `${term.id}.term.de`).toBeTruthy();
      expect(term.term.en, `${term.id}.term.en`).toBeTruthy();
      expect(term.definitionNormal.de, `${term.id}.definitionNormal.de`).toBeTruthy();
      expect(term.definitionNormal.en, `${term.id}.definitionNormal.en`).toBeTruthy();
      expect(term.definitionTrottel.de, `${term.id}.definitionTrottel.de`).toBeTruthy();
      expect(term.definitionTrottel.en, `${term.id}.definitionTrottel.en`).toBeTruthy();
    }
  });
});
