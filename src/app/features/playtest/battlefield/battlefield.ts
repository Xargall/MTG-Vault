import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDrag, CdkDragEnd } from '@angular/cdk/drag-drop';
import { TranslatePipe } from '@ngx-translate/core';

import { PlaytestCard } from '../playtest-card/playtest-card';
import { BattlefieldCard } from '../playtest-library';

/** The free-drag table surface. No cdkDropList/sortable list - a card here only ever moves within this one surface (position) or out of it entirely (graveyard/exile, via the per-card buttons below, since CDK free drag alone has no second drop target to catch a move between zones). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-battlefield',
  imports: [CdkDrag, PlaytestCard, TranslatePipe],
  templateUrl: './battlefield.html',
  styleUrl: './battlefield.scss',
})
export class Battlefield {
  readonly cards = input.required<BattlefieldCard[]>();
  /** True while a hand card is being dragged over this surface (see Playtest.onHandCardDragMoved) - highlights the drop target so dragging toward the battlefield gives feedback before release, not just after. */
  readonly dropActive = input(false);
  readonly positionChanged = output<{ instanceId: string; x: number; y: number }>();
  readonly sentToGraveyard = output<string>();
  readonly sentToExile = output<string>();

  protected onDragEnded(instanceId: string, event: CdkDragEnd): void {
    const { x, y } = event.source.getFreeDragPosition();
    this.positionChanged.emit({ instanceId, x, y });
  }
}
