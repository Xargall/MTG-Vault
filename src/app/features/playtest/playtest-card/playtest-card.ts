import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { Card } from '../../../core/models/card.model';

/** Lightweight card visual for the playtest table - CardTile (shared/cards/card-tile) carries collection-only concerns (quantity/status/language badges, owned/partial/missing dimming) that don't apply here, so this is its own component rather than CardTile fed a pile of nulls. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-playtest-card',
  templateUrl: './playtest-card.html',
  styleUrl: './playtest-card.scss',
})
export class PlaytestCard {
  readonly card = input.required<Card>();
  readonly faceDown = input(false);
  /** Plays the signature page-turn draw move (see playtest-card.scss's .flipping animation) - the library's top card only, driven by Playtest.isDrawing(). */
  readonly flipping = input(false);

  protected readonly imageLoaded = signal(false);
}
