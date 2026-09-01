import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PreconDetail, PreconListEntry } from '../../../core/models/precon.model';
import { DeckCardIndexService } from '../../../core/services/deck-card-index.service';
import { GameService } from '../../../core/services/game.service';
import { YugiohPreconIndexService } from '../../../core/services/yugioh-precon-index.service';
import { DeckService } from '../deck.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-browse-decks-dialog',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './browse-decks-dialog.html',
  styleUrl: './browse-decks-dialog.scss',
})
export class BrowseDecksDialog {
  private readonly deckService = inject(DeckService);
  private readonly gameService = inject(GameService);
  private readonly deckCardIndex = inject(DeckCardIndexService);
  private readonly yugiohPreconIndex = inject(YugiohPreconIndexService);
  private readonly translate = inject(TranslateService);

  protected readonly deckCardIndexActive = computed(() =>
    this.gameService.currentSlug() === 'yugioh' ? this.yugiohPreconIndex : this.deckCardIndex,
  );

  protected readonly searchHintKey = computed(() =>
    this.gameService.currentSlug() === 'yugioh' ? 'browseDecks.searchHintYugioh' : 'browseDecks.searchHint',
  );

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly query = signal('');
  private readonly committedQuery = signal('');
  protected readonly allDecks = signal<PreconListEntry[]>([]);
  protected readonly loadingList = signal(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly selectedDeck = signal<PreconListEntry | null>(null);
  protected readonly detail = signal<PreconDetail | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  protected readonly results = computed(() => {
    const trimmed = this.committedQuery().trim().toLowerCase();
    if (!trimmed) return [];

    const index = this.deckCardIndexActive();
    index.indexedCount(); // re-run as the background index grows

    const prefixMatches: PreconListEntry[] = [];
    const containsMatches: PreconListEntry[] = [];
    const cardMatches: PreconListEntry[] = [];
    for (const deck of this.allDecks()) {
      const name = deck.name.toLowerCase();
      if (name.startsWith(trimmed)) {
        prefixMatches.push(deck);
      } else if (name.includes(trimmed)) {
        containsMatches.push(deck);
      } else if (index.matches(deck.fileName, trimmed)) {
        cardMatches.push(deck);
      }
    }
    return [...prefixMatches, ...containsMatches, ...cardMatches];
  });

  protected readonly indexHintText = computed(() => {
    const index = this.deckCardIndexActive();
    const indexed = index.indexedCount();
    const total = index.totalCount();
    return total > 0 ? `${indexed} / ${total}` : `${indexed}`;
  });

  constructor() {
    this.loadList();
    this.deckCardIndexActive().ensureBuilding();
  }

  private async loadList() {
    const precon = this.gameService.precon();
    if (!precon) {
      this.allDecks.set([]);
      this.loadingList.set(false);
      return;
    }
    this.loadingList.set(true);
    this.listError.set(null);
    try {
      this.allDecks.set(await precon.getDeckList());
    } catch (error) {
      this.listError.set(error instanceof Error ? error.message : this.translate.instant('browseDecks.listFailed'));
    } finally {
      this.loadingList.set(false);
    }
  }

  onQueryChange(value: string) {
    this.query.set(value);
    if (this.debounceHandle) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => this.committedQuery.set(value), SEARCH_DEBOUNCE_MS);
  }

  async selectDeck(deck: PreconListEntry) {
    this.selectedDeck.set(deck);
    this.detailError.set(null);
    this.submitError.set(null);

    const indexed = this.deckCardIndexActive().getEntry(deck.fileName);
    if (indexed) {
      this.detail.set({
        heroCardId: indexed.heroCardId,
        cards: indexed.cards,
        skippedCount: indexed.skippedCount,
      });
      return;
    }

    const precon = this.gameService.precon();
    if (!precon) return;

    this.loadingDetail.set(true);
    try {
      this.detail.set(await precon.getDeckDetail(deck.fileName));
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : this.translate.instant('browseDecks.detailFailed'));
    } finally {
      this.loadingDetail.set(false);
    }
  }

  backToSearch() {
    this.selectedDeck.set(null);
    this.detail.set(null);
  }

  async submit() {
    const deck = this.selectedDeck();
    const detail = this.detail();
    if (!deck || !detail) return;

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      await this.deckService.addPreconDeck(deck.name, deck.type, deck.releaseDate, deck.fileName, detail);
      this.added.emit();
      this.close.emit();
    } catch (error) {
      this.submitError.set(error instanceof Error ? error.message : this.translate.instant('browseDecks.addFailed'));
    } finally {
      this.submitting.set(false);
    }
  }
}
