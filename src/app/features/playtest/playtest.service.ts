import { Injectable, signal } from '@angular/core';

import { DeckEntry } from '../decks/deck.service';

/** Hands a DeckEntry (already loaded in DeckDetailDialog - see startPlaytest's own doc) off to the /playtest route without a second network fetch. Deliberately holds nothing but this handoff: the route component owns every gameplay signal itself, since a game in progress has no reason to survive leaving the route, and keeping it here would risk a stale game bleeding into the next deck sent to /playtest. */
@Injectable({ providedIn: 'root' })
export class PlaytestService {
  readonly deckEntry = signal<DeckEntry | null>(null);

  startPlaytest(entry: DeckEntry): void {
    this.deckEntry.set(entry);
  }
}
