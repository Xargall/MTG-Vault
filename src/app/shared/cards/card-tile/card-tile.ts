import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { Card } from '../../../core/models/card.model';

export type CardOwnedStatus = 'owned' | 'partial' | 'missing';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card-tile',
  templateUrl: './card-tile.html',
  styleUrl: './card-tile.scss',
})
export class CardTile {
  readonly card = input.required<Card>();
  readonly quantity = input<number | null>(null);
  /** Collection-ownership indicator (deck previews only) - null renders no badge and no dimming, matching every other existing use of this tile. */
  readonly status = input<CardOwnedStatus | null>(null);

  protected readonly imageLoaded = signal(false);
}
