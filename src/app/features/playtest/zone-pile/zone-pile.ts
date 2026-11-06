import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { PlaytestCard } from '../playtest-card/playtest-card';
import { PlaytestCardInstance } from '../playtest-library';

/** One reusable "stack with a count, click to act on the top card" visual for Library/Graveyard/Exile/Command Zone - all four are the same shape (see playtest.ts's plan doc), so this stands in for four near-identical components. The caller decides what the click means (draw, return to battlefield, cast) via primaryAction; this component only ever shows the top card (index 0 - callers unshift onto their array so the most recently added card is always the one on top) and a count. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-zone-pile',
  imports: [PlaytestCard],
  templateUrl: './zone-pile.html',
  styleUrl: './zone-pile.scss',
})
export class ZonePile {
  readonly label = input.required<string>();
  readonly cards = input.required<PlaytestCardInstance[]>();
  readonly faceDown = input(false);
  /** Passed straight through to PlaytestCard - the Command Zone is the only caller that sets this (see playtest.html). */
  readonly commander = input(false);
  readonly primaryAction = output<void>();

  protected readonly topCard = computed(() => this.cards()[0] ?? null);
}
