import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { getCardImageUrl } from '../../core/services/scryfall.service';
import { AddWishlistDialog } from './add-wishlist-dialog/add-wishlist-dialog';
import { getEntryPrice, getWishlistTotalValue } from './wishlist-stats';
import { WishlistEntry, WishlistService } from './wishlist.service';

@Component({
  selector: 'app-wishlist',
  imports: [AddWishlistDialog, DecimalPipe, TranslatePipe],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly entries = signal<WishlistEntry[]>([]);
  protected readonly showAddDialog = signal(false);

  protected readonly hasEntries = computed(() => this.entries().length > 0);
  protected readonly totalValue = computed(() => getWishlistTotalValue(this.entries()));

  protected readonly getCardImageUrl = getCardImageUrl;
  protected readonly getEntryPrice = getEntryPrice;

  constructor() {
    this.load();
  }

  protected async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.entries.set(await this.wishlistService.getWishlist());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : this.translate.instant('wishlist.loadError'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  async updatePriority(entry: WishlistEntry, priority: number) {
    await this.wishlistService.upsertEntry({
      scryfallId: entry.row.scryfall_id,
      priority,
      notes: entry.row.notes,
    });
    this.entries.update((list) =>
      list.map((e) => (e.row.id === entry.row.id ? { ...e, row: { ...e.row, priority } } : e)),
    );
  }

  async updateNotes(entry: WishlistEntry, notesValue: string) {
    const notes = notesValue.trim() || null;
    if (notes === entry.row.notes) return;
    await this.wishlistService.upsertEntry({
      scryfallId: entry.row.scryfall_id,
      priority: entry.row.priority,
      notes,
    });
    this.entries.update((list) =>
      list.map((e) => (e.row.id === entry.row.id ? { ...e, row: { ...e.row, notes } } : e)),
    );
  }

  async remove(entry: WishlistEntry) {
    await this.wishlistService.removeEntry(entry.row.id);
    this.entries.update((list) => list.filter((e) => e.row.id !== entry.row.id));
  }

  protected onAdded() {
    this.load();
  }
}
