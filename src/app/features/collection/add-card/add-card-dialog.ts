import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CARD_LANGUAGE_OPTIONS, DEFAULT_CARD_LANGUAGE } from '../../../core/constants/card-languages';
import { Card } from '../../../core/models/card.model';
import { GameService } from '../../../core/services/game.service';
import { YUGIOH_PRINT_CODE_PATTERN, yugiohPrintNumber } from '../../../core/services/yugioh-api.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AppDialog } from '../../../shared/dialog/dialog';
import { CollectionService } from '../collection.service';

const SEARCH_DEBOUNCE_MS = 300;
const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

/** One card staged for a batch add - see pendingItems' doc. */
interface PendingAddItem {
  tempId: number;
  card: Card;
  quantity: number;
  foil: boolean;
  condition: string;
  language: string;
}

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
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  // Scoped per game, same as the collection itself - avoids a Yu-Gi-Oh!
  // draft reappearing while browsing MTG, or vice versa.
  private readonly pendingItemsStorageKey = `addCard.pendingItems.${this.gameService.currentSlug()}`;

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly conditions = CONDITIONS;
  protected readonly languageOptions = CARD_LANGUAGE_OPTIONS;

  // MTG and Yu-Gi-Oh! search also accept typing an exact print/set code (see
  // MtgApiService.searchCards and YugiohApiService.searchCards) - Pokémon
  // still searches by name only, so its hint stays the plain one.
  protected readonly searchPlaceholderKey = computed(() => {
    const game = this.gameService.currentSlug();
    if (game === 'mtg') return 'addCard.searchPlaceholderMtg';
    if (game === 'yugioh') return 'addCard.searchPlaceholderYugioh';
    return 'addCard.searchPlaceholder';
  });

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

  // Cards staged via addToList() but not yet sent to Supabase - lets adding
  // several cards in a row stay in one dialog session instead of the
  // dialog closing (and the search having to restart from scratch) after
  // every single card, which is what submit() used to do unconditionally.
  // Flushed as one batch only by the explicit "Alle hinzufügen" button
  // (commitAll() via finishAndClose() - see its own doc on why this is
  // deliberately NOT tied to the dialog closing in general).
  //
  // Initialized from (and mirrored to on every mutation below - addToList(),
  // removePending(), commitAll(), clearPendingItems() all call
  // savePendingItems() directly) sessionStorage, not just an empty array: a
  // backgrounded/minimized tab getting discarded by the browser under
  // memory pressure and reloaded on return (live-reported for the camera
  // scanner, see its own doc on this exact behavior) wipes every in-memory
  // signal, this one included, with no app code involved at all - there's
  // no way to prevent that reload, only to make reopening this dialog
  // afterward not lose the list. A genuinely new tab/window starts with
  // nothing staged, which is the right scope for a draft nobody asked to
  // keep around forever.
  //
  // Deliberately NOT an effect() mirroring this signal - an effect only
  // flushes on the next change-detection tick, and commitAll() clearing
  // this signal is immediately followed by the dialog closing (see
  // finishAndClose()), which can destroy this component before that flush
  // ever runs - live-confirmed: sessionStorage kept holding the just-added
  // cards after a successful commit. Calling savePendingItems() straight
  // from the same synchronous block that mutates the signal has no such
  // race.
  protected readonly pendingItems = signal<PendingAddItem[]>(this.loadPendingItems());
  protected readonly committing = signal(false);
  protected readonly commitError = signal<string | null>(null);
  private nextTempId = Math.max(-1, ...this.pendingItems().map((item) => item.tempId)) + 1;

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

  // The scroll position of the whole dialog (AppDialog's own .dialog-panel
  // scrolls, not results-grid - see dialog.scss) right before leaving the
  // search results for the print-picker/detail-form views. Those views are
  // usually shorter than a full results-grid, so the browser clamps
  // scrollTop down to fit while they're shown; restoring the saved value in
  // backToSearch() undoes that clamp instead of leaving the list stuck at
  // the top after every single card added while browsing a set.
  private savedScrollTop = 0;

  // .dialog-panel lives in AppDialog's OWN template (dialog.html), with this
  // component's whole template projected into it via <ng-content /> - from
  // this component's host element, that makes it a descendant, not an
  // ancestor, so closest() (which only walks upward) would never find it.
  // querySelector() searches the subtree instead, which does.
  private getScrollContainer(): HTMLElement | null {
    return this.hostEl.nativeElement.querySelector('.dialog-panel');
  }

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

  protected retrySearch() {
    const trimmed = this.query().trim();
    if (!trimmed) return;
    this.searching.set(true);
    void this.search(trimmed);
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
      // The raw error (often a backend message) is for the console; the user
      // gets a plain sentence plus a retry button (see the template).
      console.error('Card search failed', error);
      this.searchError.set(this.translate.instant('addCard.searchFailed'));
    } finally {
      if (!controller.signal.aborted) this.searching.set(false);
    }
  }

  /** Normal name search still goes through selectName()'s "pick a print" step; typing an exact set code (MTG, e.g. "emn"), a bare set prefix (Yu-Gi-Oh!, e.g. "AMDE"), or an exact print code (Yu-Gi-Oh!, e.g. "LOB-DE001") already landed on one specific print, so this skips straight to it instead of making the user re-pick the same one. A Yu-Gi-Oh! result only ever carries a resolved printCode when it came from one of those two direct-hit searches (see YugiohApiService.searchCards) - the plain name search always returns printCode: null - so checking that field covers both cases without needing to re-parse the query here.
   *
   * An exact print code is the one case among those where the search already named one specific card, not a set to browse - re-checking the query shape here (same YUGIOH_PRINT_CODE_PATTERN the search itself used to decide to resolve a single print) picks that case out for quickAdd() instead of still landing on the quantity/foil/condition/language form pre-filled with defaults nobody had to confirm. MTG has no searchCards() path that resolves to one exact print from the search box the same way (getCardBySetAndNumber exists but isn't wired to it - see deck-import-dialog.ts/scanner.ts for its actual callers), so this only ever fires for Yu-Gi-Oh!. */
  protected selectCard(card: Card) {
    const trimmed = this.query().trim();
    if (card.game === 'yugioh' && YUGIOH_PRINT_CODE_PATTERN.test(trimmed)) {
      this.quickAdd(card);
      return;
    }

    this.savedScrollTop = this.getScrollContainer()?.scrollTop ?? 0;

    const isDirectHit =
      (card.game === 'mtg' && card.setCode.toLowerCase() === trimmed.toLowerCase()) ||
      (card.game === 'yugioh' && card.printCode != null);
    if (isDirectHit) {
      this.directPrint.set(true);
      this.selectedName.set(card.name);
      this.selectPrint(card);
    } else {
      this.directPrint.set(false);
      void this.selectName(card);
    }
  }

  /** Stages one copy (no foil, NM, default language) straight from an exact print-code search result - see selectCard's doc on why that query shape skips the quantity/foil/condition/language form entirely. Deliberately leaves the search query/results as they are instead of clearing them - the code is still what's typed in the box either way, and clearing it only costs an extra retype for anyone re-checking or correcting the same code. Anything other than the default (a second copy, foil, a non-NM condition) still goes through the normal form by searching the card's name instead of its print code. */
  private quickAdd(card: Card): void {
    this.stageItem(card, 1, false, 'NM', DEFAULT_CARD_LANGUAGE);
  }

  /** The number printed on the card itself, for scanning a browsed set quickly (e.g. typing "DABL" lists every card with its number, instead of just name/art) - MTG's own collectorNumber, or (Yu-Gi-Oh!, only once a specific printing is known - see selectCard's doc on printCode) the number portion of printCode. Null for a Yu-Gi-Oh! result with no resolved printing yet (a plain name search), where there's no one specific number to show. */
  protected cardNumber(card: Card): string | null {
    if (card.game === 'mtg') return card.collectorNumber;
    if (card.game === 'yugioh' && card.printCode) return yugiohPrintNumber(card.printCode);
    return null;
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

    // Runs once the search view (and its full-height results-grid) is back
    // in the DOM - restoring scrollTop any earlier, while the shorter
    // print-picker/detail-form markup is still what's rendered, would just
    // get clamped back down again (see savedScrollTop's doc).
    afterNextRender(
      () => {
        const container = this.getScrollContainer();
        if (container) container.scrollTop = this.savedScrollTop;
      },
      { injector: this.injector },
    );
  }

  selectPrint(card: Card) {
    this.selectedCard.set(card);
    this.quantity.set(1);
    this.foil.set(false);
    this.condition.set('NM');
    this.language.set(DEFAULT_CARD_LANGUAGE);
  }

  backToPrints() {
    if (this.directPrint()) {
      this.backToSearch();
      return;
    }
    this.selectedCard.set(null);
  }

  /** Stages the configured card/quantity/foil/condition/language instead of sending it to Supabase right away, then goes back to the search results (same query, same results - see backToSearch()) so another card from the same search can be added right after, without retyping it - see pendingItems' doc. */
  protected addToList(): void {
    const card = this.selectedCard();
    if (!card) return;

    this.stageItem(card, this.quantity(), this.foil(), this.condition(), this.language());
    this.backToSearch();
  }

  /** Shared by addToList() (the configured form) and quickAdd() (the print-code shortcut) - both just stage different quantity/foil/condition/language values under the same dedup-and-merge rule. */
  private stageItem(card: Card, quantity: number, foil: boolean, condition: string, language: string): void {
    const key = this.pendingKey(card, foil, language);

    this.pendingItems.update((items) => {
      const index = items.findIndex((item) => this.pendingKey(item.card, item.foil, item.language) === key);
      if (index === -1) {
        return [...items, { tempId: this.nextTempId++, card, quantity, foil, condition, language }];
      }
      // Same dedup key CollectionService.upsertOne() would merge into one
      // row anyway (card/foil/language/Yu-Gi-Oh!-print - see
      // AddCardInput.setCode's doc) - merging here too avoids both a
      // confusing duplicate-looking list entry and a race between two
      // concurrent inserts for the same not-yet-existing row in
      // commitAll()'s Promise.all (see CollectionService.addCards).
      const merged = [...items];
      merged[index] = { ...merged[index], quantity: merged[index].quantity + quantity };
      return merged;
    });
    this.savePendingItems(this.pendingItems());
  }

  protected removePending(tempId: number): void {
    this.pendingItems.update((items) => items.filter((item) => item.tempId !== tempId));
    this.savePendingItems(this.pendingItems());
  }

  /** Discards every staged card without sending any of it to Supabase - the "start over" counterpart to commitAll(). */
  protected clearPendingItems(): void {
    this.pendingItems.set([]);
    this.savePendingItems([]);
  }

  private pendingKey(card: Card, foil: boolean, language: string): string {
    const setCode = card.game === 'yugioh' ? card.printCode : null;
    return `${card.id}|${foil}|${language}|${setCode ?? ''}`;
  }

  private loadPendingItems(): PendingAddItem[] {
    try {
      const raw = sessionStorage.getItem(this.pendingItemsStorageKey);
      return raw ? (JSON.parse(raw) as PendingAddItem[]) : [];
    } catch {
      return [];
    }
  }

  /** sessionStorage can throw (private browsing, quota, disabled storage) - losing the persisted draft is harmless, the in-memory list still works for the rest of this session either way. */
  private savePendingItems(items: PendingAddItem[]): void {
    try {
      if (items.length === 0) {
        sessionStorage.removeItem(this.pendingItemsStorageKey);
      } else {
        sessionStorage.setItem(this.pendingItemsStorageKey, JSON.stringify(items));
      }
    } catch {
      // See doc above - nothing to recover from here.
    }
  }

  /** Sends every staged item to Supabase as one batch. Returns whether every item succeeded, so finishAndClose() knows whether it's safe to actually close. */
  protected async commitAll(): Promise<boolean> {
    const items = this.pendingItems();
    if (items.length === 0) return true;
    // Guards against a double-click/double-Enter sending the same batch
    // twice before [disabled]="committing()" has actually re-rendered -
    // not just a defensive nicety, the whole point of upsertOne() merging
    // by dedup key means a second identical commit wouldn't error, it'd
    // silently double every quantity (see finishAndClose's doc).
    if (this.committing()) return false;

    this.committing.set(true);
    this.commitError.set(null);
    try {
      const outcomes = await this.collectionService.addCards(
        items.map((item) => ({
          cardId: item.card.id,
          quantity: item.quantity,
          foil: item.foil,
          condition: item.condition,
          language: item.language,
          oracleId: item.card.oracleId,
          // The specific printing picked in the "Druck wählen" step
          // (Yu-Gi-Oh! only - see YugiohApiService.getPrints) - persisted
          // so this exact print's set/rarity survives the collection being
          // re-read later (see 040_collection_set_code.sql).
          setCode: item.card.game === 'yugioh' ? item.card.printCode : null,
        })),
      );

      // outcomes is in the same order as items (see CollectionService.
      // addCards) - keeping only the cards that actually failed staged, not
      // the whole batch, means a retry re-sends just those instead of
      // adding a second copy of everything that already went through. A
      // plain Promise.all used to make this all-or-nothing: one flaky card
      // failed the whole batch while the others had already been written,
      // and "try again" doubled every one of those.
      const stillPending = items.filter((_, index) => outcomes[index].status === 'rejected');
      this.pendingItems.set(stillPending);
      this.savePendingItems(stillPending);

      if (stillPending.length > 0) {
        this.commitError.set(this.translate.instant('addCard.addAllFailed'));
        // Some cards did make it in even though this report counts as a
        // failure overall - the collection view behind the dialog still
        // needs to reflect them.
        if (stillPending.length < items.length) this.added.emit();
        return false;
      }

      this.added.emit();
      return true;
    } catch (error) {
      // addCards() itself only throws for something outside any one card's
      // own upsert (not logged in, no active game) - every item is still
      // staged in that case, nothing here to filter out.
      this.commitError.set(
        error instanceof Error ? error.message : this.translate.instant('addCard.addAllFailed'),
      );
      return false;
    } finally {
      this.committing.set(false);
    }
  }

  /**
   * Bound only to the explicit "Alle hinzufügen" button, NOT to the
   * dialog's own closeRequest (header ✕/Escape/backdrop just emit close
   * directly - see the template) - closing the dialog any other way only
   * hides it, leaving the staged list exactly as it is (still mirrored in
   * sessionStorage, restored the next time the dialog opens - see
   * pendingItems' doc). Committing used to run on every close, which
   * combined with a since-fixed sessionStorage flush race (see
   * pendingItems' doc) silently re-sent an already-added batch and doubled
   * quantities in the collection - live-reported, not hypothetical. Tying
   * the actual network call to one explicit button only, instead of to
   * "the dialog is going away" in general, removes that whole class of
   * accidental-resubmit bug rather than just patching the one race that
   * triggered it this time.
   */
  protected async finishAndClose(): Promise<void> {
    if (await this.commitAll()) this.close.emit();
  }
}
