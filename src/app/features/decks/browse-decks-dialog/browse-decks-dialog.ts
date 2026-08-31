import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DeckCardIndexService } from '../../../core/services/deck-card-index.service';
import { MtgjsonDeckDetail, MtgjsonDeckListEntry, MtgjsonService } from '../../../core/services/mtgjson.service';
import { DeckService } from '../deck.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-browse-decks-dialog',
  imports: [FormsModule],
  templateUrl: './browse-decks-dialog.html',
  styleUrl: './browse-decks-dialog.scss',
})
export class BrowseDecksDialog {
  private readonly mtgjson = inject(MtgjsonService);
  private readonly deckService = inject(DeckService);
  protected readonly deckCardIndex = inject(DeckCardIndexService);

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly query = signal('');
  private readonly committedQuery = signal('');
  protected readonly allDecks = signal<MtgjsonDeckListEntry[]>([]);
  protected readonly loadingList = signal(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly selectedDeck = signal<MtgjsonDeckListEntry | null>(null);
  protected readonly detail = signal<MtgjsonDeckDetail | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  protected readonly results = computed(() => {
    const trimmed = this.committedQuery().trim().toLowerCase();
    if (!trimmed) return [];

    this.deckCardIndex.indexedCount(); // re-run as the background index grows

    const prefixMatches: MtgjsonDeckListEntry[] = [];
    const containsMatches: MtgjsonDeckListEntry[] = [];
    const cardMatches: MtgjsonDeckListEntry[] = [];
    for (const deck of this.allDecks()) {
      const name = deck.name.toLowerCase();
      if (name.startsWith(trimmed)) {
        prefixMatches.push(deck);
      } else if (name.includes(trimmed)) {
        containsMatches.push(deck);
      } else if (this.deckCardIndex.matches(deck.fileName, trimmed)) {
        cardMatches.push(deck);
      }
    }
    return [...prefixMatches, ...containsMatches, ...cardMatches];
  });

  protected readonly indexHintText = computed(() => {
    const indexed = this.deckCardIndex.indexedCount();
    const total = this.deckCardIndex.totalCount();
    return total > 0 ? `${indexed} / ${total}` : `${indexed}`;
  });

  constructor() {
    this.loadList();
    this.deckCardIndex.ensureBuilding();
  }

  private async loadList() {
    this.loadingList.set(true);
    this.listError.set(null);
    try {
      this.allDecks.set(await this.mtgjson.getDeckList());
    } catch (error) {
      this.listError.set(error instanceof Error ? error.message : 'Deck-Liste konnte nicht geladen werden.');
    } finally {
      this.loadingList.set(false);
    }
  }

  onQueryChange(value: string) {
    this.query.set(value);
    if (this.debounceHandle) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => this.committedQuery.set(value), SEARCH_DEBOUNCE_MS);
  }

  async selectDeck(deck: MtgjsonDeckListEntry) {
    this.selectedDeck.set(deck);
    this.loadingDetail.set(true);
    this.detailError.set(null);
    this.submitError.set(null);
    try {
      this.detail.set(await this.mtgjson.getDeckDetail(deck.fileName));
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : 'Deck konnte nicht geladen werden.');
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
      await this.deckService.addPreconDeck(deck.name, deck.type, detail);
      this.added.emit();
      this.close.emit();
    } catch (error) {
      this.submitError.set(error instanceof Error ? error.message : 'Deck konnte nicht hinzugefügt werden.');
    } finally {
      this.submitting.set(false);
    }
  }
}
