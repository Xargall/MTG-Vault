import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { GameService } from '../../../core/services/game.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';
import { WishlistService } from '../wishlist.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-add-wishlist-dialog',
  imports: [FormsModule, CardTile, TranslatePipe, ScrollLockDirective],
  templateUrl: './add-wishlist-dialog.html',
  styleUrl: './add-wishlist-dialog.scss',
})
export class AddWishlistDialog {
  private readonly gameService = inject(GameService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly query = signal('');
  protected readonly results = signal<Card[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);

  protected readonly selectedName = signal<string | null>(null);
  protected readonly prints = signal<Card[]>([]);
  protected readonly loadingPrints = signal(false);
  protected readonly printsError = signal<string | null>(null);

  protected readonly selectedCard = signal<Card | null>(null);
  protected readonly priority = signal(2);
  protected readonly notes = signal('');
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  onQueryChange(value: string) {
    this.query.set(value);

    if (this.debounceHandle) clearTimeout(this.debounceHandle);

    const trimmed = value.trim();
    if (!trimmed) {
      this.results.set([]);
      this.searching.set(false);
      return;
    }

    this.searching.set(true);
    this.debounceHandle = setTimeout(() => this.search(trimmed), SEARCH_DEBOUNCE_MS);
  }

  private async search(query: string) {
    this.searchError.set(null);
    try {
      this.results.set(await this.gameService.cardApi().searchCards(query));
    } catch (error) {
      this.searchError.set(error instanceof Error ? error.message : this.translate.instant('addCard.searchFailed'));
    } finally {
      this.searching.set(false);
    }
  }

  async selectName(card: Card) {
    this.selectedName.set(card.name);
    this.loadingPrints.set(true);
    this.printsError.set(null);
    try {
      this.prints.set(await this.gameService.cardApi().getPrints(card.name));
    } catch (error) {
      this.printsError.set(
        error instanceof Error ? error.message : this.translate.instant('addCard.printsFailed'),
      );
    } finally {
      this.loadingPrints.set(false);
    }
  }

  backToSearch() {
    this.selectedName.set(null);
    this.prints.set([]);
  }

  selectPrint(card: Card) {
    this.selectedCard.set(card);
    this.priority.set(2);
    this.notes.set('');
    this.submitError.set(null);
  }

  backToPrints() {
    this.selectedCard.set(null);
  }

  async submit() {
    const card = this.selectedCard();
    if (!card) return;

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      await this.wishlistService.addEntry({
        cardId: card.id,
        priority: this.priority(),
        notes: this.notes().trim() || null,
      });
      this.added.emit();
      this.close.emit();
    } catch (error) {
      this.submitError.set(
        error instanceof Error ? error.message : this.translate.instant('addWishlist.addFailed'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
