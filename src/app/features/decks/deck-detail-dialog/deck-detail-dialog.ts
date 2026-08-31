import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';

import { getCardImageUrl } from '../../../core/services/scryfall.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { getDeckCardCount, getDeckShowcase, getDeckTotalValue } from '../deck-stats';
import { DeckCardEntry, DeckEntry, DeckService } from '../deck.service';

@Component({
  selector: 'app-deck-detail-dialog',
  imports: [CardTile, DecimalPipe],
  templateUrl: './deck-detail-dialog.html',
  styleUrl: './deck-detail-dialog.scss',
})
export class DeckDetailDialog {
  private readonly deckService = inject(DeckService);

  readonly entry = input.required<DeckEntry>();
  readonly close = output<void>();
  readonly deleted = output<void>();

  protected readonly getCardImageUrl = getCardImageUrl;

  protected readonly showcase = computed(() => getDeckShowcase(this.entry()));
  protected readonly showcaseImageUrl = computed(() => {
    const showcase = this.showcase();
    return showcase ? getCardImageUrl(showcase.card) : null;
  });

  protected readonly cardCount = computed(() => getDeckCardCount(this.entry()));
  protected readonly totalValue = computed(() => getDeckTotalValue(this.entry()));

  protected readonly year = computed(() => this.entry().deck.release_date?.slice(0, 4) ?? null);

  protected readonly sortedCards = computed<DeckCardEntry[]>(() =>
    [...this.entry().cards].sort((a, b) => a.card.name.localeCompare(b.card.name)),
  );

  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  async confirmDelete() {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.deckService.deleteDeck(this.entry().deck.id);
      this.deleted.emit();
      this.close.emit();
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : 'Deck konnte nicht entfernt werden.');
    } finally {
      this.deleting.set(false);
    }
  }
}
