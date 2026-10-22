import { describe, expect, it } from 'vitest';

import { HELP_TERMS } from './help-terms';

describe('HELP_TERMS', () => {
  it('has no duplicate ids', () => {
    const ids = HELP_TERMS.map((term) => term.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only cross-references ids that actually exist', () => {
    const knownIds = new Set(HELP_TERMS.map((term) => term.id));
    const brokenReferences = HELP_TERMS.flatMap((term) =>
      (term.relatedTerms ?? [])
        .filter((relatedId) => !knownIds.has(relatedId))
        .map((relatedId) => `${term.id} -> ${relatedId}`),
    );
    expect(brokenReferences).toEqual([]);
  });

  it('carries both languages for every term and definition', () => {
    for (const term of HELP_TERMS) {
      expect(term.term.de, `${term.id}.term.de`).toBeTruthy();
      expect(term.term.en, `${term.id}.term.en`).toBeTruthy();
      expect(term.definitionNormal.de, `${term.id}.definitionNormal.de`).toBeTruthy();
      expect(term.definitionNormal.en, `${term.id}.definitionNormal.en`).toBeTruthy();
      expect(term.definitionTrottel.de, `${term.id}.definitionTrottel.de`).toBeTruthy();
      expect(term.definitionTrottel.en, `${term.id}.definitionTrottel.en`).toBeTruthy();
    }
  });
});
