import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
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
  /** Shown centered over the creature/spell half while set (live-reported: the old small top-strip banner "geht unter") - null hides it. */
  readonly combatReminder = input<string | null>(null);
  readonly positionChanged = output<{ instanceId: string; x: number; y: number }>();
  readonly sentToGraveyard = output<string>();
  readonly sentToExile = output<string>();
  readonly tapToggled = output<string>();

  /** Which card's action row is pinned open on a touch device (no hover to reveal it otherwise) - see .battlefield-card-actions in the stylesheet. Mouse users get hover instead and never need this. */
  protected readonly selectedInstanceId = signal<string | null>(null);

  protected onDragEnded(instanceId: string, event: CdkDragEnd): void {
    const { x, y } = event.source.getFreeDragPosition();
    this.positionChanged.emit({ instanceId, x, y });
  }

  /** Stops the click from bubbling to the surface's own click handler (which clears the selection) - tapping a card selects it, tapping empty table clears it. */
  protected selectCard(instanceId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedInstanceId.set(instanceId);
  }
}
