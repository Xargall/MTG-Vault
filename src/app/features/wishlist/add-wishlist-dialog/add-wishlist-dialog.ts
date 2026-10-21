import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { GameService } from '../../../core/services/game.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AppDialog } from '../../../shared/dialog/dialog';
import { WishlistService } from '../wishlist.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-add-wishlist-dialog',
  imports: [FormsModule, CardTile, TranslatePipe, AppDialog],
  templateUrl: './add-wishlist-dialog.html',
  styleUrl: './add-wishlist-dialog.scss',
})
export class AddWishlistDialog {
  private readonly gameService = inject(GameService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();
  readonly added = output<void>();

  // Only MTG search supports typing a set code (see MtgApiService.searchCards)
  // - Yu-Gi-Oh/Pokémon still search by name only, so the hint stays accurate per game.
  protected readonly searchPlaceholderKey = computed(() =>
    this.gameService.currentSlug() === 'mtg' ? 'addCard.searchPlaceholderMtg' : 'addCard.searchPlaceholder',
  );

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
  // Aborts the previous search's actual request (not just its result) when
  // a newer one starts - see AddCardDialog's own copy of this for why a
  // plain debounce-clear alone isn't enough.
  private abortController: AbortController | null = null;
  // Set when a search result was reached by typing an exact set code (see
  // selectCard) - lets backToPrints() know to skip straight back to search
  // instead of landing on an empty prints list that was never fetched.
  private readonly directPrint = signal(false);

  onQueryChange(value: string) {
    this.query.set(value);

    if (this.debounceHandle) clearTimeout(this.debounceHandle);

    const trimmed = value.trim();
    if (!trimmed) {
      this.abortController?.abort();
      this.results.set([]);
      this.searching.set(false);
      return;
    }

    this.searching.set(true);
    this.debounceHandle = setTimeout(() => this.search(trimmed), SEARCH_DEBOUNCE_MS);
  }

  private async search(query: string) {
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;

    this.searchError.set(null);
    try {
      const results = await this.gameService.cardApi().searchCards(query, controller.signal);
      if (controller.signal.aborted) return; // a newer search already took over
      this.results.set(results);
    } catch (error) {
      if (controller.signal.aborted) return;
      this.searchError.set(error instanceof Error ? error.message : this.translate.instant('addCard.searchFailed'));
    } finally {
      if (!controller.signal.aborted) this.searching.set(false);
    }
  }

  /** Same shortcut as AddCardDialog: typing an exact set code and clicking one of its cards already landed on one specific print, so this skips the "pick a print" step instead of making the user find that same printing again in its full reprint history. */
  protected selectCard(card: Card) {
    const trimmed = this.query().trim().toLowerCase();
    if (card.game === 'mtg' && card.setCode.toLowerCase() === trimmed) {
      this.directPrint.set(true);
      this.selectedName.set(card.name);
      this.selectPrint(card);
    } else {
      this.directPrint.set(false);
      void this.selectName(card);
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
    this.selectedCard.set(null);
    this.directPrint.set(false);
  }

  selectPrint(card: Card) {
    this.selectedCard.set(card);
    this.priority.set(2);
    this.notes.set('');
    this.submitError.set(null);
  }

  backToPrints() {
    if (this.directPrint()) {
      this.backToSearch();
      return;
    }
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
