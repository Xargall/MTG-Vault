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
  /** Owned-copy language code (see card-languages.ts), e.g. 'de' - null (no collection row context, e.g. search/print pickers) renders no badge; any real value always shows it, since a mixed collection needs a constant reminder of which printed language each copy actually is, not just a flag for the "unusual" ones. */
  readonly language = input<string | null>(null);
  /** MTG keyword abilities (deck-detail only, see DeckDetailDialog.cardKeywords) - empty renders nothing, so every other call site (Collection grid, search results) stays visually unchanged without having to opt out. */
  readonly keywords = input<string[]>([]);

  protected readonly imageLoaded = signal(false);
}
