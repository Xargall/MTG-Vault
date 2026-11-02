import { Injectable, signal } from '@angular/core';

import { Card } from '../../core/models/card.model';

/** Backs the large hover preview (see playtest.html's .playtest-preview) - the small thumbnails everywhere on the table (hand, battlefield, piles) are too small to read a card's own text at a glance, so hovering any face-up PlaytestCard shows it full-size here instead. A plain shared service rather than threading an output through every intermediate component (hand/battlefield/zone-pile all host cards) - every PlaytestCard sets/clears this directly on its own mouseenter/mouseleave. */
@Injectable({ providedIn: 'root' })
export class PlaytestPreviewService {
  readonly hoveredCard = signal<Card | null>(null);

  show(card: Card): void {
    this.hoveredCard.set(card);
  }

  hide(card: Card): void {
    // A fast mouse move across two adjacent cards can fire the new card's
    // enter before the old one's leave - only clear if nothing newer already
    // took over, so the preview doesn't flicker to empty between cards.
    if (this.hoveredCard() === card) this.hoveredCard.set(null);
  }
}
