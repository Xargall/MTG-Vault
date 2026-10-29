import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CARD_LANGUAGE_OPTIONS, DEFAULT_CARD_LANGUAGE } from '../../../core/constants/card-languages';
import { Card } from '../../../core/models/card.model';
import { GameService } from '../../../core/services/game.service';
import { yugiohPrintNumber } from '../../../core/services/yugioh-api.service';
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
  // Flushed as one batch by commitAll(), called whenever the dialog
  // actually closes (see finishAndClose()).
  protected readonly pendingItems = signal<PendingAddItem[]>([]);
  protected readonly committing = signal(false);
  protected readonly commitError = signal<string | null>(null);
  private nextTempId = 0;

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

  /** Normal name search still goes through selectName()'s "pick a print" step; typing an exact set code (MTG, e.g. "emn"), a bare set prefix (Yu-Gi-Oh!, e.g. "AMDE"), or an exact print code (Yu-Gi-Oh!, e.g. "LOB-DE001") already landed on one specific print, so this skips straight to it instead of making the user re-pick the same one. A Yu-Gi-Oh! result only ever carries a resolved printCode when it came from one of those two direct-hit searches (see YugiohApiService.searchCards) - the plain name search always returns printCode: null - so checking that field covers both cases without needing to re-parse the query here. */
  protected selectCard(card: Card) {
    const trimmed = this.query().trim();
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

    const quantity = this.quantity();
    const foil = this.foil();
    const condition = this.condition();
    const language = this.language();
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

    this.backToSearch();
  }

  protected removePending(tempId: number): void {
    this.pendingItems.update((items) => items.filter((item) => item.tempId !== tempId));
  }

  private pendingKey(card: Card, foil: boolean, language: string): string {
    const setCode = card.game === 'yugioh' ? card.printCode : null;
    return `${card.id}|${foil}|${language}|${setCode ?? ''}`;
  }

  /** Sends every staged item to Supabase as one batch. Returns whether it succeeded, so finishAndClose() knows whether it's safe to actually close. */
  protected async commitAll(): Promise<boolean> {
    const items = this.pendingItems();
    if (items.length === 0) return true;

    this.committing.set(true);
    this.commitError.set(null);
    try {
      await this.collectionService.addCards(
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
      this.pendingItems.set([]);
      this.added.emit();
      return true;
    } catch (error) {
      this.commitError.set(
        error instanceof Error ? error.message : this.translate.instant('addCard.addAllFailed'),
      );
      return false;
    } finally {
      this.committing.set(false);
    }
  }

  /**
   * Bound to the dialog's own closeRequest (header ✕, Escape, backdrop, and
   * the explicit "Alle hinzufügen" button all go through this one path) -
   * always flushes whatever's still staged first rather than treating
   * "close" as "discard the list". The list already has its own per-item
   * remove button for discarding a single entry, so there's no separate
   * "close without adding" action that would otherwise make staged cards
   * vanish silently. Stays open with commitError shown if the flush itself
   * fails, instead of closing and losing the list.
   */
  protected async finishAndClose(): Promise<void> {
    if (await this.commitAll()) this.close.emit();
  }
}
