import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CARD_LANGUAGE_OPTIONS, DEFAULT_CARD_LANGUAGE } from '../../../core/constants/card-languages';
import { Card } from '../../../core/models/card.model';
import { GameService } from '../../../core/services/game.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AppDialog } from '../../../shared/dialog/dialog';
import { CollectionService } from '../collection.service';

const SEARCH_DEBOUNCE_MS = 300;
const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-add-card-dialog',
  imports: [FormsModule, CardTile, TranslatePipe, AppDialog],
  templateUrl: './add-card-dialog.html',
  styleUrl: './add-card-dialog.scss',
})
export class AddCardDialog {
  protected readonly gameService = inject(GameService);
  private readonly collectionService = inject(CollectionService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly conditions = CONDITIONS;
  protected readonly languageOptions = CARD_LANGUAGE_OPTIONS;

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
  protected readonly quantity = signal(1);
  protected readonly foil = signal(false);
  protected readonly condition = signal('NM');
  protected readonly language = signal(DEFAULT_CARD_LANGUAGE);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private debounceHandle: ReturnType<typeof setTimeout> | null = null;
  // Aborts the previous search's actual request (not just its result) when
  // a newer one starts - without this, a slow in-flight request from an
  // earlier keystroke can resolve after a later one and overwrite its
  // results with a stale/narrower match, and every uncancelled request left
  // running in the background adds to the load a fast typist throws at
  // Supabase at once.
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

  /** Normal name search still goes through selectName()'s "pick a print" step; typing an exact set code (e.g. "emn") and clicking one of its cards already landed on one specific print, so this skips straight to it instead of making the user find that same printing again in its full reprint history. */
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
    this.quantity.set(1);
    this.foil.set(false);
    this.condition.set('NM');
    this.language.set(DEFAULT_CARD_LANGUAGE);
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
      await this.collectionService.addCard({
        cardId: card.id,
        quantity: this.quantity(),
        foil: this.foil(),
        condition: this.condition(),
        language: this.language(),
        oracleId: card.oracleId,
      });
      this.added.emit();
      this.close.emit();
    } catch (error) {
      this.submitError.set(
        error instanceof Error ? error.message : this.translate.instant('addCard.addFailed'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
