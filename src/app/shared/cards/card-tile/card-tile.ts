import { Component, computed, input } from '@angular/core';

import { getCardImageUrl, ScryfallCard } from '../../../core/services/scryfall.service';

@Component({
  selector: 'app-card-tile',
  templateUrl: './card-tile.html',
  styleUrl: './card-tile.scss',
})
export class CardTile {
  readonly card = input.required<ScryfallCard>();
  readonly quantity = input<number | null>(null);

  protected readonly imageUrl = computed(() => getCardImageUrl(this.card()));
}
