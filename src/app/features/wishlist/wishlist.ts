import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GameService } from '../../core/services/game.service';
import { ToastService } from '../../core/services/toast.service';
import { CardTile } from '../../shared/cards/card-tile/card-tile';
import { AppDialog } from '../../shared/dialog/dialog';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { CollectionService } from '../collection/collection.service';
import { AddWishlistDialog } from './add-wishlist-dialog/add-wishlist-dialog';
import { WishlistSort, getEntryPrice, getWishlistTotals, sortWishlist } from './wishlist-stats';
import { WishlistEntry, WishlistService } from './wishlist.service';

/** How long a removed entry can be brought back before the delete is sent. */
const UNDO_WINDOW_MS = 5000;

export const PRIORITY_LEVELS = [
  { value: 1, labelKey: 'wishlist.priorityLow' },
  { value: 2, labelKey: 'wishlist.priorityMid' },
  { value: 3, labelKey: 'wishlist.priorityHigh' },
] as const;

/**
 * The wishlist is read in a shop, one-handed: a ledger of rows sorted by what
 * matters (priority, then price) with the price as the loudest element.
 * Editing - priority, note, moving to the collection, removing - lives in a
 * detail sheet one tap away instead of six controls on every card.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-wishlist',
  imports: [AddWishlistDialog, AppDialog, CardTile, PricePipe, TranslatePipe],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private readonly wishlistService = inject(WishlistService);
  private readonly collectionService = inject(CollectionService);
  private readonly translate = inject(TranslateService);
  private readonly gameService = inject(GameService);
  private readonly toast = inject(ToastService);

  protected readonly priorityLevels = PRIORITY_LEVELS;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly entries = signal<WishlistEntry[]>([]);
  protected readonly showAddDialog = signal(false);
  protected readonly sort = signal<WishlistSort>('priority');
  /** Entry whose detail sheet is open. */
  protected readonly selected = signal<WishlistEntry | null>(null);
  /** Unsaved note text for the open sheet - committed on blur or close. */
  protected readonly notesDraft = signal('');
  // Row ids currently being moved to the collection - disables the button so
  // a slow request can't be double-submitted by an impatient tap.
  protected readonly movingToCollection = signal<Set<string>>(new Set());
  // Separate from errorMessage (which replaces the whole list on a load
  // failure) - a failed action should just show inline while keeping the
  // rest of the wishlist visible and usable.
  protected readonly actionError = signal<string | null>(null);

  protected readonly hasEntries = computed(() => this.entries().length > 0);
  protected readonly sortedEntries = computed(() => sortWishlist(this.entries(), this.sort()));
  protected readonly totals = computed(() => getWishlistTotals(this.entries()));
  protected readonly cardCount = computed(() =>
    this.entries().reduce((sum, entry) => sum + entry.row.quantity, 0),
  );

  protected readonly getEntryPrice = getEntryPrice;

  // Removals waiting out their undo window, by row id.
  private readonly pendingRemovals = new Map<string, { entry: WishlistEntry; timer: ReturnType<typeof setTimeout> }>();

  constructor() {
    effect(() => {
      this.gameService.currentSlug();
      untracked(() => this.load());
    });

    // Leaving the page mid-undo-window still sends the deletes the user asked for.
    inject(DestroyRef).onDestroy(() => {
      for (const id of [...this.pendingRemovals.keys()]) void this.commitRemoval(id);
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
        if (this.pendingRemovals.has(entry.row.id)) continue;
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

  protected priorityLabelKey(priority: number): string {
    return PRIORITY_LEVELS.find((level) => level.value === priority)?.labelKey ?? 'wishlist.priorityLow';
  }

  protected openEntry(entry: WishlistEntry) {
    this.actionError.set(null);
    this.notesDraft.set(entry.row.notes ?? '');
    this.selected.set(entry);
  }

  protected async closeEntry() {
    const entry = this.selected();
    this.selected.set(null);
    if (entry) await this.saveNotes(entry);
  }

  async updatePriority(entry: WishlistEntry, priority: number) {
    if (priority === entry.row.priority) return;
    this.patchEntry(entry.row.id, { priority });
    try {
      await this.wishlistService.upsertEntry({
        cardId: entry.row.card_id,
        priority,
        notes: entry.row.notes,
      });
    } catch {
      this.patchEntry(entry.row.id, { priority: entry.row.priority });
      this.actionError.set(this.translate.instant('wishlist.saveFailed'));
    }
  }

  async saveNotes(entry: WishlistEntry) {
    const notes = this.notesDraft().trim() || null;
    const current = this.entries().find((e) => e.row.id === entry.row.id);
    if (!current || notes === current.row.notes) return;
    this.patchEntry(entry.row.id, { notes });
    try {
      await this.wishlistService.upsertEntry({
        cardId: current.row.card_id,
        priority: current.row.priority,
        notes,
      });
    } catch {
      this.patchEntry(entry.row.id, { notes: current.row.notes });
      this.actionError.set(this.translate.instant('wishlist.saveFailed'));
    }
  }

  /** Removes the entry right away in the UI and offers Undo; the delete itself is sent once the undo window has passed. */
  remove(entry: WishlistEntry) {
    const id = entry.row.id;
    this.selected.set(null);
    this.entries.update((list) => list.filter((e) => e.row.id !== id));
    const timer = setTimeout(() => void this.commitRemoval(id), UNDO_WINDOW_MS);
    this.pendingRemovals.set(id, { entry, timer });

    this.toast.show(this.translate.instant('wishlist.removedToast', { name: entry.card.name }), {
      durationMs: UNDO_WINDOW_MS,
      action: { label: this.translate.instant('wishlist.undo'), run: () => void this.undoRemoval(entry) },
    });
  }

  private async commitRemoval(id: string) {
    const pending = this.pendingRemovals.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingRemovals.delete(id);
    try {
      await this.wishlistService.removeEntry(id);
    } catch {
      this.entries.update((list) => [...list, pending.entry]);
      this.actionError.set(this.translate.instant('wishlist.removeFailed'));
    }
  }

  private async undoRemoval(entry: WishlistEntry) {
    const pending = this.pendingRemovals.get(entry.row.id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRemovals.delete(entry.row.id);
      this.entries.update((list) => [...list, entry]);
      return;
    }
    // The delete already went out (e.g. the tab was hidden past the window
    // while the toast's own countdown was paused) - write the row back.
    try {
      await this.wishlistService.upsertEntry({
        cardId: entry.row.card_id,
        priority: entry.row.priority,
        notes: entry.row.notes,
        quantity: entry.row.quantity,
      });
      await this.load();
    } catch {
      this.actionError.set(this.translate.instant('wishlist.saveFailed'));
    }
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
      this.selected.set(null);
      this.entries.update((list) => list.filter((e) => e.row.id !== rowId));
      this.toast.show(this.translate.instant('wishlist.movedToast', { name: entry.card.name }));
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

  private patchEntry(id: string, patch: Partial<WishlistEntry['row']>) {
    const apply = (e: WishlistEntry) => (e.row.id === id ? { ...e, row: { ...e.row, ...patch } } : e);
    this.entries.update((list) => list.map(apply));
    const open = this.selected();
    if (open?.row.id === id) this.selected.set(apply(open));
  }
}
