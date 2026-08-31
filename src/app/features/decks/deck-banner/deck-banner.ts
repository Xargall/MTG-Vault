import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-deck-banner',
  templateUrl: './deck-banner.html',
  styleUrl: './deck-banner.scss',
})
export class DeckBanner {
  readonly images = input<string[]>([]);
  readonly bannerClick = output<void>();

  protected readonly loopImages = computed(() => [...this.images(), ...this.images()]);
}
