import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { Card } from '../../../core/models/card.model';
import { PlaytestPreviewService } from '../playtest-preview.service';

// Live-requested, modeled on a Pokédex holo-card effect the user built
// before, kept deliberately subtle here: a few degrees of tilt plus a soft
// moving shine, not a full chroma foil. Capped low on purpose.
const MAX_TILT_DEG = 6;

/** Lightweight card visual for the playtest table - CardTile (shared/cards/card-tile) carries collection-only concerns (quantity/status/language badges, owned/partial/missing dimming) that don't apply here, so this is its own component rather than CardTile fed a pile of nulls. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-playtest-card',
  templateUrl: './playtest-card.html',
  styleUrl: './playtest-card.scss',
})
export class PlaytestCard {
  private readonly previewService = inject(PlaytestPreviewService);

  readonly card = input.required<Card>();
  readonly faceDown = input(false);
  /** Plays the signature page-turn draw move (see playtest-card.scss's .flipping animation) - the library's top card only, driven by Playtest.isDrawing(). */
  readonly flipping = input(false);
  /** The MTG "tap" convention (rotated 90° - see Battlefield's own tap-toggle button) - composed with the live holo tilt below into one transform. */
  readonly tapped = input(false);
  /** The Command Zone's own card is always its deck's special, always-castable permanent - a Gilt Glow ring (see playtest-card.scss) instead of a copied Legendary frame (DESIGN.md: no official card-frame reproductions). */
  readonly commander = input(false);

  protected readonly imageLoaded = signal(false);
  private readonly tiltTransform = signal('');
  protected readonly cardTransform = computed(() => (this.tapped() ? 'rotate(90deg) ' : '') + this.tiltTransform());
  protected readonly glareBackground = signal('');

  // Every thumbnail on the table is too small to read a card's own text -
  // click works on touch too (live-requested: hover alone doesn't reach
  // touch devices), face-up only (nothing to read on the library back).
  protected onClick(): void {
    if (!this.faceDown()) this.previewService.show(this.card());
  }

  protected onMouseEnter(): void {
    if (!this.faceDown()) this.previewService.show(this.card());
  }

  protected onMouseLeave(): void {
    this.previewService.hide(this.card());
    this.resetTilt();
  }

  // Same mouse-only, face-up-only scope as the hover preview - a flipping
  // library card never gets here either, so this never fights that
  // animation's own transform on .playtest-card-inner.
  protected onMouseMove(event: MouseEvent): void {
    if (this.faceDown()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const tiltX = (0.5 - py) * MAX_TILT_DEG;
    const tiltY = (px - 0.5) * MAX_TILT_DEG;
    this.tiltTransform.set(`perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`);
    this.glareBackground.set(`radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.16), transparent 55%)`);
  }

  private resetTilt(): void {
    this.tiltTransform.set('');
    this.glareBackground.set('');
  }
}
