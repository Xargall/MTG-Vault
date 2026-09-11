import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-banner',
  imports: [TranslatePipe],
  templateUrl: './deck-banner.html',
  styleUrl: './deck-banner.scss',
})
export class DeckBanner {
  readonly images = input<string[]>([]);
  readonly bannerClick = output<void>();

  protected readonly loopImages = computed(() => [...this.images(), ...this.images()]);
}
