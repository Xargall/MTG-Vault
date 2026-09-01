import { Component, input } from '@angular/core';

import { Card } from '../../../core/models/card.model';

@Component({
  selector: 'app-card-tile',
  templateUrl: './card-tile.html',
  styleUrl: './card-tile.scss',
})
export class CardTile {
  readonly card = input.required<Card>();
  readonly quantity = input<number | null>(null);
}
