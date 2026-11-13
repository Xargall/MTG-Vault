import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { Card } from '../../../core/models/card.model';

export type CardOwnedStatus = 'owned' | 'partial' | 'missing';

/** True when the browser reports the user asked for less data, or a 2G-class connection (Chromium only; elsewhere the full-size image is simply allowed). */
function prefersLightImages(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!connection && (connection.saveData === true || /2g/.test(connection.effectiveType ?? ''));
}

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

  /**
   * The small thumbnail (146px wide for Scryfall) is only sharp on a 1x
   * screen - a tile is 130-170 CSS px wide, so a phone or HiDPI laptop needs
   * the full-size image to fill its physical pixels. The browser picks one
   * of the two, never both. Null (plain `src` only) when there is just one
   * size or the user is on a data-saving connection.
   */
  protected readonly srcset = computed(() => {
    const { imageUrl, imageUrlSmall } = this.card();
    if (!imageUrl || !imageUrlSmall || imageUrl === imageUrlSmall || prefersLightImages()) return null;
    return `${imageUrlSmall} 1x, ${imageUrl} 2x`;
  });
}
