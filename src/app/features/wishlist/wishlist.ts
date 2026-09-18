import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GameService } from '../../core/services/game.service';
import { CardTile } from '../../shared/cards/card-tile/card-tile';
import { CollectionService } from '../collection/collection.service';
import { AddWishlistDialog } from './add-wishlist-dialog/add-wishlist-dialog';
import { getEntryPrice, getWishlistTotalValue } from './wishlist-stats';
import { WishlistEntry, WishlistService } from './wishlist.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-wishlist',
  imports: [AddWishlistDialog, CardTile, DecimalPipe, TranslatePipe, FormsModule],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private readonly wishlistService = inject(WishlistService);
  private readonly collectionService = inject(CollectionService);
  private readonly translate = inject(TranslateService);
  private readonly gameService = inject(GameService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly entries = signal<WishlistEntry[]>([]);
  protected readonly showAddDialog = signal(false);
  // Row ids currently being moved to the collection - disables that entry's
  // button so a slow request can't be double-submitted by an impatient tap.
  protected readonly movingToCollection = signal<Set<string>>(new Set());
  // Separate from errorMessage (which replaces the whole list on a load
  // failure) - a failed add-to-collection should just show inline while
  // keeping the rest of the wishlist visible and usable.
  protected readonly actionError = signal<string | null>(null);

  protected readonly hasEntries = computed(() => this.entries().length > 0);
  protected readonly totalValue = computed(() => getWishlistTotalValue(this.entries()));

  protected readonly getEntryPrice = getEntryPrice;

  constructor() {
    effect(() => {
      this.gameService.currentSlug();
      untracked(() => this.load());
    });
  }

  protected async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const [entries, ownedByCardId, ownedByOracle] = await Promise.all([
        this.wishlistService.getWishlist(),
        this.collectionService.getQuantitiesByCardId(),
        this.collectionService.getQuantitiesByOracleId(),
      ]);

      // A wish can already be fully covered without the user ever touching
      // this page - most commonly a deck import auto-granting the same card
      // into the collection (see DeckService.grantMissingCards) after the
      // wish for it was created. Left alone, a fulfilled entry just sits
      // there looking "still needed" and clicking its own "In Sammlung
      // übernehmen" button would add a redundant extra copy on top of what's
      // already owned - live-confirmed as the exact way a deck ended up with
      // more copies of a card than it needs. Pruned here, before the entry
      // is ever rendered, rather than only checked at click-time, so a
      // stale wish can't linger and mislead in the meantime either.
      const stillWanted: WishlistEntry[] = [];
      const fulfilledIds: string[] = [];
      for (const entry of entries) {
        const oracleQty = entry.card.oracleId ? (ownedByOracle.get(entry.card.oracleId) ?? 0) : 0;
        const ownedQty = oracleQty + (ownedByCardId.get(entry.row.card_id) ?? 0);
        if (ownedQty >= entry.row.quantity) {
          fulfilledIds.push(entry.row.id);
        } else {
          stillWanted.push(entry);
        }
      }
      if (fulfilledIds.length > 0) {
        await Promise.all(fulfilledIds.map((id) => this.wishlistService.removeEntry(id)));
      }

      this.entries.set(stillWanted);
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
      cardId: entry.row.card_id,
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
      cardId: entry.row.card_id,
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

  /** Moves a wishlist entry into the collection - adds the exact card/quantity it names, then drops it from the wishlist since it's no longer missing. Foil/condition aren't tracked on a wishlist entry, so it's added as a plain nonfoil NM stack; the user can still adjust that afterward from the collection. */
  async addToCollection(entry: WishlistEntry) {
    const rowId = entry.row.id;
    this.movingToCollection.update((set) => new Set(set).add(rowId));
    this.actionError.set(null);
    try {
      await this.collectionService.addCard({
        cardId: entry.row.card_id,
        quantity: entry.row.quantity,
        foil: false,
        condition: 'NM',
        oracleId: entry.card.oracleId,
      });
      await this.wishlistService.removeEntry(rowId);
      this.entries.update((list) => list.filter((e) => e.row.id !== rowId));
    } catch (error) {
      this.actionError.set(
        error instanceof Error ? error.message : this.translate.instant('wishlist.addToCollectionFailed'),
      );
    } finally {
      this.movingToCollection.update((set) => {
        const next = new Set(set);
        next.delete(rowId);
        return next;
      });
    }
  }

  protected onAdded() {
    this.load();
  }
}
