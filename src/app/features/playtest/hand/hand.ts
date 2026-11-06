import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDrag, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { TranslatePipe } from '@ngx-translate/core';

import { PlaytestCard } from '../playtest-card/playtest-card';
import { PlaytestCardInstance } from '../playtest-library';

/** The fanned hand row - each card is a plain CdkDrag source, deliberately not bound to cdkDragFreeDragPosition: dropping it without the parent accepting the drop (see playtest.ts's onHandCardDropped, which checks the drop point against the battlefield's bounds) lets CDK's own default behavior spring it back into the fan, which is exactly "you didn't play it" with no extra code here. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hand',
  imports: [CdkDrag, PlaytestCard, TranslatePipe],
  templateUrl: './hand.html',
  styleUrl: './hand.scss',
})
export class Hand {
  /** Degrees of rotation per card step away from the hand's centre (live-requested "leichter Fächerbogen", 2026-11-06) - kept shallow on purpose, see hand.scss's transform-origin doc for how this becomes an actual bow, not just a tilt. */
  protected readonly fanStepDeg = 2.2;

  readonly cards = input.required<PlaytestCardInstance[]>();
  readonly cardDropped = output<{ instanceId: string; clientX: number; clientY: number }>();
  /** Fires continuously during a drag (not just on drop) - lets the parent show a live drop-target highlight instead of only finding out whether the drop worked after releasing. */
  readonly cardDragMoved = output<{ clientX: number; clientY: number }>();
  /** The hand's own small discard button (live-requested alongside the end-of-turn cleanup hint - there was previously no way to discard from hand at all). */
  readonly cardDiscarded = output<string>();

  protected onDragMoved(event: CdkDragMove): void {
    const point = event.pointerPosition;
    this.cardDragMoved.emit({ clientX: point.x, clientY: point.y });
  }

  protected onDragEnded(instanceId: string, event: CdkDragEnd): void {
    const point = event.dropPoint;
    this.cardDropped.emit({ instanceId, clientX: point.x, clientY: point.y });
  }
}
