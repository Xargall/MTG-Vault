import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { MoxfieldTopDeck, MoxfieldService, MOXFIELD_FORMATS } from '../../../core/services/moxfield.service';
import { MtgApiService } from '../../../core/services/mtg-api.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';
import { CollectionEntry, CollectionService } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import {
  AverageDeckAssignedCardMatch,
  AverageDeckCardMatch,
  UnresolvedAverageDeckCard,
  getPreciseAverageDeckMatch,
  mergeCardQuantities,
  splitAverageDeckByAvailability,
} from '../deck-stats';
import { DeckEntry, DeckService } from '../deck.service';

const BATCH_SIZE = 5;
// Defensive floor - a real Moxfield deck should always clear this, but
// guards against a broken/partial import on Moxfield's own side (e.g. no
// mainboard) surfacing as a technically-real but useless recommendation.
const MIN_RECOMMENDATION_CARD_COUNT = 20;

type ScanPhase = 'listing' | 'matching';

interface DeckRecommendation extends MoxfieldTopDeck {
  matchPercent: number;
  matchedCount: number;
  totalCount: number;
  freeMatchPercent: number;
  freeMatchedCount: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-format-deck-recommendations-dialog',
  imports: [TranslatePipe, CardTile, ScrollLockDirective],
  templateUrl: './format-deck-recommendations-dialog.html',
  // Reuses CommanderRecommendationsDialog's stylesheet (same dialog shell,
  // recommendation-list/match-badge/progress-bar classes) rather than
  // duplicating it - the local file only adds the format-picker step, which
  // has no equivalent there.
  styleUrls: ['../commander-recommendations/commander-recommendations-dialog.scss', './format-deck-recommendations-dialog.scss'],
})
export class FormatDeckRecommendationsDialog {
  private readonly collectionService = inject(CollectionService);
  private readonly mtgApi = inject(MtgApiService);
  private readonly moxfield = inject(MoxfieldService);
  private readonly deckService = inject(DeckService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly formats = MOXFIELD_FORMATS;
  // null = format picker shown; set once the user chooses one, cleared by
  // backToFormats().
  protected readonly selectedFormat = signal<string | null>(null);
  // Short "what even is this format" blurb shown above the recommendations,
  // since the format names alone (Modern, Legacy, ...) don't tell a reader
  // what's actually different about them.
  protected readonly selectedFormatDescriptionKey = computed(
    () => this.formats.find((format) => format.slug === this.selectedFormat())?.descriptionKey ?? null,
  );

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly scanPhase = signal<ScanPhase>('listing');
  protected readonly checked = signal(0);
  protected readonly total = signal(0);
  protected readonly recommendations = signal<DeckRecommendation[]>([]);
  private readonly collectionEntries = signal<CollectionEntry[]>([]);
  private readonly allDecks = signal<DeckEntry[]>([]);

  protected readonly hasNoResults = computed(
    () => !this.loading() && !this.errorMessage() && this.recommendations().length === 0,
  );

  // Detail (single hub's computed average decklist) - shown once a
  // recommendation row is clicked, same toggle pattern as
  // CommanderRecommendationsDialog.
  protected readonly selectedRecommendation = signal<DeckRecommendation | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);
  protected readonly ownedCards = signal<AverageDeckCardMatch[]>([]);
  protected readonly assignedElsewhereCards = signal<AverageDeckAssignedCardMatch[]>([]);
  protected readonly missingCards = signal<AverageDeckCardMatch[]>([]);
  // Deck cards whose name never resolved to a real Card - still counted
  // below (see AverageDeckSplit's own doc comment), just with no tile to
  // render, so the percentages/totals always add up to the deck's real size
  // instead of quietly shrinking.
  protected readonly unresolvedCards = signal<UnresolvedAverageDeckCard[]>([]);
  protected readonly unresolvedCardsLabel = computed(() =>
    this.unresolvedCards()
      .map((c) => `${c.quantity}x ${c.name}`)
      .join(', ') || null,
  );

  protected readonly ownedQuantityTotal = computed(() =>
    [...this.ownedCards(), ...this.assignedElsewhereCards()].reduce((sum, c) => sum + c.quantity, 0),
  );
  protected readonly freeQuantityTotal = computed(() =>
    this.ownedCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  protected readonly assignedElsewhereQuantityTotal = computed(() =>
    this.assignedElsewhereCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  // missingCards' own quantity is already the shortfall (splitAverageDeckByAvailability
  // computes it per card, not the card's full needed amount) - see its own doc comment.
  protected readonly missingQuantityTotal = computed(
    () =>
      this.missingCards().reduce((sum, c) => sum + c.quantity, 0) +
      this.unresolvedCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  private readonly totalQuantityNeeded = computed(
    () =>
      this.ownedQuantityTotal() +
      this.missingCards().reduce((sum, c) => sum + c.quantity, 0) +
      this.unresolvedCards().reduce((sum, c) => sum + c.quantity, 0),
  );

  protected readonly detailMatchPercent = computed(() => {
    const total = this.totalQuantityNeeded();
    return total > 0 ? Math.round((this.ownedQuantityTotal() / total) * 100) : 0;
  });
  protected readonly freeDetailMatchPercent = computed(() => {
    const total = this.totalQuantityNeeded();
    return total > 0 ? Math.round((this.freeQuantityTotal() / total) * 100) : 0;
  });

  protected readonly addingDeck = signal(false);
  protected readonly addDeckError = signal<string | null>(null);
  protected readonly deckAdded = signal(false);

  protected readonly addingToWishlist = signal(false);
  protected readonly wishlistError = signal<string | null>(null);
  protected readonly wishlistAdded = signal(false);

  protected selectFormat(format: string) {
    this.selectedFormat.set(format);
    void this.load(format);
  }

  protected backToFormats() {
    this.selectedFormat.set(null);
    this.recommendations.set([]);
    this.errorMessage.set(null);
  }

  private async load(format: string) {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.recommendations.set([]);
    try {
      const [allCollection, allDecks] = await Promise.all([
        this.collectionService.getCollectionWithCardData(),
        this.deckService.getMyDecks(),
      ]);
      const collection = allCollection.filter((entry) => entry.card.game === 'mtg');
      this.collectionEntries.set(collection);
      this.allDecks.set(allDecks);

      this.scanPhase.set('listing');
      this.checked.set(0);
      this.total.set(0);
      const topDecks = await this.moxfield.getTopDecks(format);

      this.scanPhase.set('matching');
      this.checked.set(0);
      this.total.set(topDecks.length);

      const results: DeckRecommendation[] = [];
      for (let i = 0; i < topDecks.length; i += BATCH_SIZE) {
        const batch = topDecks.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (deck) => {
            const deckCards = await this.moxfield.getDeckCards(deck.publicId).catch(() => []);
            const cards = await this.mtgApi.getCardsByNames(deckCards.map((c) => c.name)).catch(() => []);
            const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
            const { matchedCount, totalCount, freeMatchedCount } = getPreciseAverageDeckMatch(
              deckCards,
              cardsByName,
              collection,
              allDecks,
            );
            const matchPercent = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
            const freeMatchPercent = totalCount > 0 ? Math.round((freeMatchedCount / totalCount) * 100) : 0;
            return { ...deck, matchPercent, matchedCount, totalCount, freeMatchPercent, freeMatchedCount };
          }),
        );
        results.push(...batchResults.filter((result) => result.totalCount >= MIN_RECOMMENDATION_CARD_COUNT));
        this.checked.update((value) => value + batch.length);
        // Same "buildable right now" sort as CommanderRecommendationsDialog.
        this.recommendations.set(
          [...results].sort((a, b) => b.freeMatchPercent - a.freeMatchPercent || b.matchPercent - a.matchPercent),
        );
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : this.translate.instant('formatRecs.loadFailed'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  async selectRecommendation(rec: DeckRecommendation) {
    const format = this.selectedFormat();
    if (!format) return;

    this.selectedRecommendation.set(rec);
    this.detailError.set(null);
    this.deckAdded.set(false);
    this.addDeckError.set(null);
    this.wishlistAdded.set(false);
    this.wishlistError.set(null);
    this.ownedCards.set([]);
    this.assignedElsewhereCards.set([]);
    this.missingCards.set([]);
    this.unresolvedCards.set([]);

    this.loadingDetail.set(true);
    try {
      const deckCards = await this.moxfield.getDeckCards(rec.publicId);
      const cards = await this.mtgApi.getCardsByNames(deckCards.map((c) => c.name));
      const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));

      const { owned, assignedElsewhere, missing, unresolved } = splitAverageDeckByAvailability(
        deckCards,
        cardsByName,
        this.collectionEntries(),
        this.allDecks(),
      );
      this.ownedCards.set(owned);
      this.assignedElsewhereCards.set(assignedElsewhere);
      this.missingCards.set(missing);
      this.unresolvedCards.set(unresolved);
    } catch (error) {
      this.detailError.set(
        error instanceof Error ? error.message : this.translate.instant('formatRecs.detailFailed'),
      );
    } finally {
      this.loadingDetail.set(false);
    }
  }

  backToList() {
    this.selectedRecommendation.set(null);
  }

  /** "MSH #142" style short print label for the substitute callout - same as DeckDetailDialog.printLabel. */
  protected printLabel(card: Card): string {
    return card.game === 'mtg' ? `${card.setCode.toUpperCase()} #${card.collectorNumber}` : card.name;
  }

  async addDeck() {
    const rec = this.selectedRecommendation();
    const format = this.selectedFormat();
    if (!rec || !format) return;

    this.addingDeck.set(true);
    this.addDeckError.set(null);
    try {
      const cards = mergeCardQuantities([...this.ownedCards(), ...this.assignedElsewhereCards(), ...this.missingCards()]);
      await this.deckService.addArchetypeDeck(rec.name, format, cards);
      this.deckAdded.set(true);
      this.added.emit();
    } catch (error) {
      this.addDeckError.set(
        error instanceof Error ? error.message : this.translate.instant('formatRecs.addDeckFailed'),
      );
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
      this.wishlistError.set(
        error instanceof Error ? error.message : this.translate.instant('deckDetail.wishlistFailed'),
      );
    } finally {
      this.addingToWishlist.set(false);
    }
  }
}
