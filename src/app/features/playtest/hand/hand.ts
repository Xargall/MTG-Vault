import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDrag, CdkDragEnd } from '@angular/cdk/drag-drop';

import { PlaytestCard } from '../playtest-card/playtest-card';
import { PlaytestCardInstance } from '../playtest-library';

/** The fanned hand row - each card is a plain CdkDrag source, deliberately not bound to cdkDragFreeDragPosition: dropping it without the parent accepting the drop (see playtest.ts's onHandCardDropped, which checks the drop point against the battlefield's bounds) lets CDK's own default behavior spring it back into the fan, which is exactly "you didn't play it" with no extra code here. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hand',
  imports: [CdkDrag, PlaytestCard],
  templateUrl: './hand.html',
  styleUrl: './hand.scss',
})
export class Hand {
  readonly cards = input.required<PlaytestCardInstance[]>();
  readonly cardDropped = output<{ instanceId: string; clientX: number; clientY: number }>();

  protected onDragEnded(instanceId: string, event: CdkDragEnd): void {
    const point = event.dropPoint;
    this.cardDropped.emit({ instanceId, clientX: point.x, clientY: point.y });
  }
}
