import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { YugiohApiService } from '../../../core/services/yugioh-api.service';
import {
  YGO_DECK_CATEGORIES,
  YgoDeckCardQuantity,
  YgoTopDeck,
  YgoprodeckDecksService,
} from '../../../core/services/ygoprodeck-decks.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AppDialog } from '../../../shared/dialog/dialog';
import { CollectionEntry, CollectionService } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import {
  RequiredCard,
  buildAssignedElsewhereMaps,
  buildOwnedMap,
  buildOwnedOracleMap,
  getAvailabilityMatch,
  splitExactDeckByAvailability,
} from '../deck-stats';
import { DeckEntry, DeckService } from '../deck.service';

// Defensive floor against a genuinely broken/stub entry in YGOPRODeck's own
// user-submitted deck pool (e.g. a years-old deck with only a handful of
// placeholder-looking card ids) - a real Yu-Gi-Oh! deck (main + extra +
// side) always clears this by a wide margin.
const MIN_DECK_CARD_COUNT = 30;

interface DeckRecommendation {
  deckNum: number;
  name: string;
  sourceLabel: string;
  required: RequiredCard[];
  matchPercent: number;
}

/** Merges main/extra/side into one required-quantity list, keyed by exact card id - deck_cards has no zone column (see DeckCardRow), so this is also exactly the shape persisted on "add deck". */
function mergeDeckZones(deck: YgoTopDeck): RequiredCard[] {
  const byId = new Map<string, number>();
  for (const { cardId, quantity } of [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck]) {
    byId.set(cardId, (byId.get(cardId) ?? 0) + quantity);
  }
  return [...byId.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ygo-deck-recommendations-dialog',
  imports: [TranslatePipe, CardTile, AppDialog],
  templateUrl: './ygo-deck-recommendations-dialog.html',
  // Reuses both of FormatDeckRecommendationsDialog's stylesheets (dialog
  // shell/recommendation-list/match-badge/progress-bar classes, plus its
  // format-picker/format-button/format-description classes for this
  // dialog's own category picker) rather than duplicating a near-identical
  // third stylesheet.
  styleUrls: [
    '../commander-recommendations/commander-recommendations-dialog.scss',
    '../format-deck-recommendations/format-deck-recommendations-dialog.scss',
  ],
})
export class YgoDeckRecommendationsDialog {
  private readonly collectionService = inject(CollectionService);
  private readonly yugiohApi = inject(YugiohApiService);
  private readonly ygoDecks = inject(YgoprodeckDecksService);
  private readonly deckService = inject(DeckService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly categories = YGO_DECK_CATEGORIES;
  // null = category picker shown; set once the user picks one, cleared by backToCategories().
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly selectedCategoryDescriptionKey = computed(
    () => this.categories.find((category) => category.slug === this.selectedCategory())?.descriptionKey ?? null,
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly recommendations = signal<DeckRecommendation[]>([]);
  // Off by default - cards already committed to another of the user's decks
  // don't count as available. Same reasoning/toggle as
  // FormatDeckRecommendationsDialog.includeAssignedElsewhere.
  protected readonly includeAssignedElsewhere = signal(false);
  private readonly collectionEntries = signal<CollectionEntry[]>([]);
  private readonly allDecks = signal<DeckEntry[]>([]);
  private topDecksByCategory = new Map<string, YgoTopDeck[]>();

  protected readonly hasNoResults = computed(
    () => !this.loading() && !this.errorMessage() && this.recommendations().length === 0,
  );

  protected readonly selectedRecommendation = signal<DeckRecommendation | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);
  protected readonly ownedCards = signal<{ card: Card; quantity: number }[]>([]);
  protected readonly missingCards = signal<{ card: Card; quantity: number }[]>([]);
  protected readonly unresolvedCount = signal(0);

  protected readonly freeQuantityTotal = computed(() => this.ownedCards().reduce((sum, c) => sum + c.quantity, 0));
  protected readonly missingQuantityTotal = computed(
    () => this.missingCards().reduce((sum, c) => sum + c.quantity, 0) + this.unresolvedCount(),
  );
  private readonly totalQuantityNeeded = computed(() => this.freeQuantityTotal() + this.missingQuantityTotal());
  protected readonly freeDetailMatchPercent = computed(() => {
    const total = this.totalQuantityNeeded();
    return total > 0 ? Math.round((this.freeQuantityTotal() / total) * 100) : 0;
  });

  protected readonly addingDeck = signal(false);
  protected readonly addDeckError = signal<string | null>(null);
  protected readonly deckAdded = signal(false);
  protected readonly allCardsOwned = signal(false);

  protected readonly addingToWishlist = signal(false);
  protected readonly wishlistError = signal<string | null>(null);
  protected readonly wishlistAdded = signal(false);

  protected selectCategory(category: string) {
    this.selectedCategory.set(category);
    void this.load(category);
  }

  protected backToCategories() {
    this.selectedCategory.set(null);
    this.recommendations.set([]);
    this.errorMessage.set(null);
  }

  protected toggleIncludeAssignedElsewhere() {
    this.includeAssignedElsewhere.update((value) => !value);
    const category = this.selectedCategory();
    if (category) this.rescoreRecommendations(category);
  }

  private async load(category: string) {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.recommendations.set([]);
    try {
      const [allCollection, allDecks, topDecks] = await Promise.all([
        this.collectionService.getCollectionWithCardData(),
        this.deckService.getMyDecks(),
        this.ygoDecks.getTopDecks(category),
      ]);
      const collection = allCollection.filter((entry) => entry.card.game === 'yugioh');
      this.collectionEntries.set(collection);
      this.allDecks.set(allDecks);
      this.topDecksByCategory.set(category, topDecks);

      this.rescoreRecommendations(category);
      if (topDecks.length === 0) {
        this.errorMessage.set(this.translate.instant('ygoDeckRecs.noResults'));
      }
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : this.translate.instant('ygoDeckRecs.loadFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Re-scores every already-fetched top deck against the current collection/assignment state - no network needed, same reasoning as FormatDeckRecommendationsDialog's own toggleIncludeAssignedElsewhere. */
  private rescoreRecommendations(category: string) {
    const topDecks = this.topDecksByCategory.get(category) ?? [];
    const owned = buildOwnedMap(this.collectionEntries());
    const ownedByOracle = buildOwnedOracleMap(this.collectionEntries());
    const allDecks = this.includeAssignedElsewhere() ? [] : this.allDecks();
    const { byCardId, byOracleId } = buildAssignedElsewhereMaps(allDecks, null);

    const results: DeckRecommendation[] = topDecks
      .map((deck) => {
        const required = mergeDeckZones(deck);
        const matchPercent = getAvailabilityMatch(required, owned, ownedByOracle, byCardId, byOracleId, 'flexible').percent;
        const sourceLabel =
          deck.tournamentPlacement && deck.tournamentName
            ? `${deck.tournamentName} · ${deck.tournamentPlacement}`
            : (deck.format ?? '');
        return { deckNum: deck.deckNum, name: deck.name, sourceLabel, required, matchPercent };
      })
      .filter((rec) => rec.required.reduce((sum, r) => sum + r.quantity, 0) >= MIN_DECK_CARD_COUNT)
      .sort((a, b) => b.matchPercent - a.matchPercent);

    this.recommendations.set(results);
  }

  async selectRecommendation(rec: DeckRecommendation) {
    this.selectedRecommendation.set(rec);
    this.detailError.set(null);
    this.deckAdded.set(false);
    this.addDeckError.set(null);
    this.allCardsOwned.set(false);
    this.wishlistAdded.set(false);
    this.wishlistError.set(null);
    this.ownedCards.set([]);
    this.missingCards.set([]);
    this.unresolvedCount.set(0);

    this.loadingDetail.set(true);
    try {
      const cards = await this.yugiohApi.getCardsByIds(rec.required.map((r) => r.cardId));
      const cardsById = new Map(cards.map((card) => [card.id, card]));

      const owned = buildOwnedMap(this.collectionEntries());
      const ownedByOracle = buildOwnedOracleMap(this.collectionEntries());
      const allDecks = this.includeAssignedElsewhere() ? [] : this.allDecks();
      const { byCardId, byOracleId } = buildAssignedElsewhereMaps(allDecks, null);
      const split = splitExactDeckByAvailability(rec.required, owned, ownedByOracle, byCardId, byOracleId);

      const toEntries = (list: YgoDeckCardQuantity[]) =>
        list
          .map(({ cardId, quantity }) => {
            const card = cardsById.get(cardId);
            return card ? { card, quantity } : null;
          })
          .filter((entry): entry is { card: Card; quantity: number } => entry !== null);

      this.ownedCards.set(toEntries(split.owned));
      this.missingCards.set(toEntries(split.missing));
      this.unresolvedCount.set(
        rec.required.filter((r) => !cardsById.has(r.cardId)).reduce((sum, r) => sum + r.quantity, 0),
      );
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : this.translate.instant('ygoDeckRecs.detailFailed'));
    } finally {
      this.loadingDetail.set(false);
    }
  }

  backToList() {
    this.selectedRecommendation.set(null);
  }

  async addDeck() {
    const rec = this.selectedRecommendation();
    const category = this.selectedCategory();
    if (!rec || !category) return;

    this.addingDeck.set(true);
    this.addDeckError.set(null);
    try {
      const cards = [...this.ownedCards(), ...this.missingCards()].map(({ card, quantity }) => ({
        cardId: card.id,
        quantity,
      }));
      // The deck's "format" field shows the picked category (same role as
      // FormatDeckRecommendationsDialog passing its own selected Moxfield
      // format, e.g. "modern") - not the per-deck sourceLabel, which varies
      // per deck and can be a long tournament string.
      await this.deckService.addArchetypeDeck(rec.name, category, cards, this.allCardsOwned());
      this.deckAdded.set(true);
      this.added.emit();
    } catch (error) {
      this.addDeckError.set(error instanceof Error ? error.message : this.translate.instant('ygoDeckRecs.addDeckFailed'));
    } finally {
      this.addingDeck.set(false);
    }
  }

  async addMissingToWishlist() {
    const rec = this.selectedRecommendation();
    if (!rec) return;

    this.addingToWishlist.set(true);
    this.wishlistError.set(null);
    try {
      const existing = await this.wishlistService.getCardIds();
      const inputs: UpsertWishlistInput[] = this.missingCards()
        .filter(({ card }) => !existing.has(card.id))
        .map(({ card, quantity }) => ({
          cardId: card.id,
          priority: 2,
          notes: this.translate.instant('common.forDeck', { name: rec.name }),
          quantity,
        }));

      if (inputs.length > 0) {
        await this.wishlistService.upsertMany(inputs);
      }
      this.wishlistAdded.set(true);
    } catch (error) {
      this.wishlistError.set(error instanceof Error ? error.message : this.translate.instant('deckDetail.wishlistFailed'));
    } finally {
      this.addingToWishlist.set(false);
    }
  }
}
