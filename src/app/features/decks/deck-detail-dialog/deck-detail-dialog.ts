import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CardOwnedStatus, CardTile } from '../../../shared/cards/card-tile/card-tile';
import { CollectionEntry } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import {
  buildOwnedMap,
  getCardOwnedStatus,
  getDeckCardCount,
  getDeckShowcase,
  getDeckTotalValue,
  getMissingQuantity,
} from '../deck-stats';
import { DeckCardEntry, DeckEntry, DeckService } from '../deck.service';

export interface DeckCardWithStatus {
  entry: DeckCardEntry;
  status: CardOwnedStatus;
}

@Component({
  selector: 'app-deck-detail-dialog',
  imports: [CardTile, DecimalPipe, TranslatePipe],
  templateUrl: './deck-detail-dialog.html',
  styleUrl: './deck-detail-dialog.scss',
})
export class DeckDetailDialog {
  private readonly deckService = inject(DeckService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly entry = input.required<DeckEntry>();
  readonly collectionEntries = input.required<CollectionEntry[]>();
  readonly close = output<void>();
  readonly deleted = output<void>();

  protected readonly showcase = computed(() => getDeckShowcase(this.entry()));
  protected readonly showcaseImageUrl = computed(() => this.showcase()?.card.imageUrl ?? null);

  protected readonly cardCount = computed(() => getDeckCardCount(this.entry()));
  protected readonly totalValue = computed(() => getDeckTotalValue(this.entry()));

  protected readonly year = computed(() => this.entry().deck.release_date?.slice(0, 4) ?? null);

  protected readonly sortedCards = computed<DeckCardEntry[]>(() =>
    [...this.entry().cards].sort((a, b) => a.card.name.localeCompare(b.card.name)),
  );

  private readonly ownedMap = computed(() => buildOwnedMap(this.collectionEntries()));

  /** Every deck card paired with its owned/partial/missing status, for the status-badged card grid - so an incomplete deck shows exactly *which* cards are missing, not just a count. */
  protected readonly cardsWithStatus = computed<DeckCardWithStatus[]>(() =>
    this.sortedCards().map((entry) => ({
      entry,
      status: getCardOwnedStatus(entry.row.quantity, this.ownedMap().get(entry.row.card_id) ?? 0),
    })),
  );

  protected readonly missingCards = computed<DeckCardEntry[]>(() => {
    const owned = this.ownedMap();
    return this.entry().cards.filter(({ row }) => (owned.get(row.card_id) ?? 0) < row.quantity);
  });

  /** Total missing *copies* (needed minus owned, summed) - not the number of distinct cards that are short, which is what missingCards().length would give. */
  protected readonly missingQuantityTotal = computed(() => {
    const owned = this.ownedMap();
    return this.entry().cards.reduce(
      (sum, { row }) => sum + getMissingQuantity(row.quantity, owned.get(row.card_id) ?? 0),
      0,
    );
  });

  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly addingToWishlist = signal(false);
  protected readonly wishlistAdded = signal(false);
  protected readonly wishlistError = signal<string | null>(null);

  async addMissingToWishlist() {
    this.addingToWishlist.set(true);
    this.wishlistError.set(null);
    try {
      const existing = await this.wishlistService.getCardIds();
      const deckName = this.entry().deck.name;
      const owned = this.ownedMap();
      const inputs: UpsertWishlistInput[] = this.missingCards()
        .filter(({ row }) => !existing.has(row.card_id))
        .map(({ row }) => ({
          cardId: row.card_id,
          priority: 2,
          notes: this.translate.instant('common.forDeck', { name: deckName }),
          quantity: getMissingQuantity(row.quantity, owned.get(row.card_id) ?? 0),
        }));

      if (inputs.length > 0) {
        await this.wishlistService.upsertMany(inputs);
      }
      this.wishlistAdded.set(true);
    } catch (error) {
      this.wishlistError.set(
        error instanceof Error ? error.message : this.translate.instant('deckDetail.wishlistFailed'),
      );
    } finally {
      this.addingToWishlist.set(false);
    }
  }

  async confirmDelete() {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.deckService.deleteDeck(this.entry().deck.id);
      this.deleted.emit();
      this.close.emit();
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : this.translate.instant('deckDetail.deleteFailed'));
    } finally {
      this.deleting.set(false);
    }
  }
}
