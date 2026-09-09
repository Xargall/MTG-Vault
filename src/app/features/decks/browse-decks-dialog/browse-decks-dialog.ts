import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { PreconDetail, PreconListEntry } from '../../../core/models/precon.model';
import { DeckCardIndexService } from '../../../core/services/deck-card-index.service';
import { GameService } from '../../../core/services/game.service';
import { YugiohPreconIndexService } from '../../../core/services/yugioh-precon-index.service';
import { CardOwnedStatus, CardTile } from '../../../shared/cards/card-tile/card-tile';
import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';
import { CollectionEntry } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import {
  buildAssignedElsewhereMaps,
  buildOwnedMap,
  buildOwnedOracleMap,
  getAvailabilityMatch,
  getCardOwnedStatus,
  getMissingQuantity,
  MatchMode,
} from '../deck-stats';
import { DeckEntry, DeckService } from '../deck.service';

export interface PreconDetailCard {
  card: Card;
  quantity: number;
  ownedQty: number;
  status: CardOwnedStatus;
}

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-browse-decks-dialog',
  imports: [FormsModule, TranslatePipe, CardTile, ScrollLockDirective],
  templateUrl: './browse-decks-dialog.html',
  styleUrl: './browse-decks-dialog.scss',
})
export class BrowseDecksDialog {
  private readonly deckService = inject(DeckService);
  private readonly gameService = inject(GameService);
  private readonly deckCardIndex = inject(DeckCardIndexService);
  private readonly yugiohPreconIndex = inject(YugiohPreconIndexService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly collectionEntries = input.required<CollectionEntry[]>();
  // Every one of the user's existing decks - needed to tell how many of the
  // previewed precon's cards are already committed elsewhere (see
  // deck-stats.ts's buildAssignedElsewhereMaps). There's no "current deck"
  // to exclude here since this precon hasn't been added yet. Named
  // `myDecks`, not `allDecks` - that name is already taken by the list of
  // every *browsable* precon (see below).
  readonly myDecks = input.required<DeckEntry[]>();

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

  // Resolved once `detail()`'s cardIds come back from the card API - kept
  // separate from `detail` itself since that part requires its own network
  // round trip and loading state.
  protected readonly detailCards = signal<PreconDetailCard[] | null>(null);
  protected readonly loadingDetailCards = signal(false);

  // 'flexible' (a partially-available card still earns half credit) is the
  // default; 'strict' only credits a fully-available card. Deliberately not
  // reset when switching between previewed decks - it's a standing search
  // preference, not per-deck state.
  protected readonly matchMode = signal<MatchMode>('flexible');

  protected readonly availabilityMatch = computed(() => {
    const cards = this.detailCards();
    if (!cards || cards.length === 0) return { percent: 0, plannedElsewherePercent: 0 };

    const required = cards.map((entry) => ({
      cardId: entry.card.id,
      oracleId: entry.card.oracleId,
      quantity: entry.quantity,
    }));
    const owned = buildOwnedMap(this.collectionEntries());
    const ownedByOracle = buildOwnedOracleMap(this.collectionEntries());
    const { byCardId, byOracleId } = buildAssignedElsewhereMaps(this.myDecks(), null);
    return getAvailabilityMatch(required, owned, ownedByOracle, byCardId, byOracleId, this.matchMode());
  });

  protected readonly matchPercent = computed(() => this.availabilityMatch().percent);

  /** Total copies in the deck (sum of quantities) - never the number of distinct cards, which is what `detail().cards.length` would give. */
  protected readonly totalCardCount = computed(
    () => this.detail()?.cards.reduce((sum, card) => sum + card.quantity, 0) ?? 0,
  );

  protected readonly missingCards = computed(
    () => this.detailCards()?.filter((entry) => entry.status !== 'owned') ?? [],
  );

  /** Total missing *copies* (needed minus owned, summed across all cards) - see missingCards' own doc comment for why this isn't missingCards().length. */
  protected readonly missingQuantityTotal = computed(() =>
    this.missingCards().reduce((sum, entry) => sum + getMissingQuantity(entry.quantity, entry.ownedQty), 0),
  );

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly addingToWishlist = signal(false);
  protected readonly wishlistAdded = signal(false);
  protected readonly wishlistError = signal<string | null>(null);

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
    this.wishlistAdded.set(false);
    this.wishlistError.set(null);

    const indexed = this.deckCardIndexActive().getEntry(deck.fileName);
    if (indexed) {
      const detail: PreconDetail = { heroCardId: indexed.heroCardId, cards: indexed.cards, skippedCount: indexed.skippedCount };
      this.detail.set(detail);
      void this.loadDetailCards(detail);
      return;
    }

    const precon = this.gameService.precon();
    if (!precon) return;

    this.loadingDetail.set(true);
    try {
      const detail = await precon.getDeckDetail(deck.fileName);
      this.detail.set(detail);
      void this.loadDetailCards(detail);
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : this.translate.instant('browseDecks.detailFailed'));
    } finally {
      this.loadingDetail.set(false);
    }
  }

  /** Resolves the precon's cardId+quantity pairs to full Card objects (for image/name) and each card's owned status, for the deck-preview card list. */
  private async loadDetailCards(detail: PreconDetail) {
    this.detailCards.set(null);
    this.loadingDetailCards.set(true);
    try {
      const cards = await this.gameService.cardApi().getCardsByIds(detail.cards.map((c) => c.cardId));
      const cardsById = new Map(cards.map((card) => [card.id, card]));
      const owned = buildOwnedMap(this.collectionEntries());

      const resolved: PreconDetailCard[] = detail.cards
        .map((entry) => {
          const card = cardsById.get(entry.cardId);
          if (!card) return null;
          const ownedQty = owned.get(entry.cardId) ?? 0;
          return { card, quantity: entry.quantity, ownedQty, status: getCardOwnedStatus(entry.quantity, ownedQty) };
        })
        .filter((entry): entry is PreconDetailCard => entry !== null)
        .sort((a, b) => a.card.name.localeCompare(b.card.name));

      this.detailCards.set(resolved);
    } catch {
      // The card list is a nice-to-have on top of the count already shown -
      // fail silently rather than blocking the add/submit flow over it.
      this.detailCards.set([]);
    } finally {
      this.loadingDetailCards.set(false);
    }
  }

  backToSearch() {
    this.selectedDeck.set(null);
    this.detail.set(null);
    this.detailCards.set(null);
  }

  async addMissingToWishlist() {
    const deck = this.selectedDeck();
    if (!deck) return;

    this.addingToWishlist.set(true);
    this.wishlistError.set(null);
    try {
      const existing = await this.wishlistService.getCardIds();
      const inputs: UpsertWishlistInput[] = this.missingCards()
        .filter(({ card }) => !existing.has(card.id))
        .map(({ card, quantity, ownedQty }) => ({
          cardId: card.id,
          priority: 2,
          notes: this.translate.instant('common.forDeck', { name: deck.name }),
          quantity: getMissingQuantity(quantity, ownedQty),
        }));

      if (inputs.length > 0) {
        await this.wishlistService.upsertMany(inputs);
      }
      this.wishlistAdded.set(true);
    } catch (error) {
      this.wishlistError.set(
        error instanceof Error ? error.message : this.translate.instant('deckDetail.wishlistFailed'),
      );
    } finally {
      this.addingToWishlist.set(false);
    }
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
