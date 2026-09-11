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
import { MoxfieldHub, MoxfieldService, MOXFIELD_FORMATS } from '../../../core/services/moxfield.service';
import { MtgApiService } from '../../../core/services/mtg-api.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';
import { CollectionEntry, CollectionService } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import {
  AverageDeckAssignedCardMatch,
  AverageDeckCardMatch,
  buildAssignedElsewhereByNameMap,
  buildPlainOwnedByNameMap,
  getAverageDeckMatch,
  getMissingQuantity,
  splitAverageDeckByAvailability,
} from '../deck-stats';
import { DeckEntry, DeckService } from '../deck.service';

const BATCH_SIZE = 5;

type ScanPhase = 'hubs' | 'matching';

interface HubRecommendation extends MoxfieldHub {
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

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly scanPhase = signal<ScanPhase>('hubs');
  protected readonly checked = signal(0);
  protected readonly total = signal(0);
  protected readonly recommendations = signal<HubRecommendation[]>([]);
  private readonly collectionEntries = signal<CollectionEntry[]>([]);
  private readonly allDecks = signal<DeckEntry[]>([]);

  protected readonly hasNoResults = computed(
    () => !this.loading() && !this.errorMessage() && this.recommendations().length === 0,
  );

  // Detail (single hub's computed average decklist) - shown once a
  // recommendation row is clicked, same toggle pattern as
  // CommanderRecommendationsDialog.
  protected readonly selectedRecommendation = signal<HubRecommendation | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);
  protected readonly ownedCards = signal<AverageDeckCardMatch[]>([]);
  protected readonly assignedElsewhereCards = signal<AverageDeckAssignedCardMatch[]>([]);
  protected readonly missingCards = signal<AverageDeckCardMatch[]>([]);

  protected readonly ownedQuantityTotal = computed(() =>
    [...this.ownedCards(), ...this.assignedElsewhereCards()].reduce((sum, c) => sum + c.quantity, 0),
  );
  protected readonly freeQuantityTotal = computed(() =>
    this.ownedCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  protected readonly assignedElsewhereQuantityTotal = computed(() =>
    this.assignedElsewhereCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  protected readonly missingQuantityTotal = computed(() =>
    this.missingCards().reduce((sum, c) => sum + getMissingQuantity(c.quantity, c.ownedQty), 0),
  );
  private readonly totalQuantityNeeded = computed(
    () => this.ownedQuantityTotal() + this.missingCards().reduce((sum, c) => sum + c.quantity, 0),
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
      // Same bulk-scan reasoning as CommanderRecommendationsDialog.load() -
      // plain name matching only, no oracle_id resolution per candidate.
      const ownedByName = buildPlainOwnedByNameMap(collection);
      const assignedElsewhereByName = buildAssignedElsewhereByNameMap(allDecks);

      this.scanPhase.set('hubs');
      this.checked.set(0);
      this.total.set(0);
      const hubs = await this.moxfield.getArchetypeHubs(format);

      this.scanPhase.set('matching');
      this.checked.set(0);
      this.total.set(hubs.length);

      const results: HubRecommendation[] = [];
      for (let i = 0; i < hubs.length; i += BATCH_SIZE) {
        const batch = hubs.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (hub) => {
            const deckCards = await this.moxfield.getAverageDeck(format, hub.name).catch(() => []);
            const { matchedCount, totalCount, freeMatchedCount } = getAverageDeckMatch(
              deckCards,
              ownedByName,
              assignedElsewhereByName,
            );
            const matchPercent = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
            const freeMatchPercent = totalCount > 0 ? Math.round((freeMatchedCount / totalCount) * 100) : 0;
            return { ...hub, matchPercent, matchedCount, totalCount, freeMatchPercent, freeMatchedCount };
          }),
        );
        results.push(...batchResults.filter((result) => result.totalCount > 0));
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

  async selectRecommendation(rec: HubRecommendation) {
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

    this.loadingDetail.set(true);
    try {
      const deckCards = await this.moxfield.getAverageDeck(format, rec.name);
      const cards = await this.mtgApi.getCardsByNames(deckCards.map((c) => c.name));
      const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));

      const { owned, assignedElsewhere, missing } = splitAverageDeckByAvailability(
        deckCards,
        cardsByName,
        this.collectionEntries(),
        this.allDecks(),
      );
      this.ownedCards.set(owned);
      this.assignedElsewhereCards.set(assignedElsewhere);
      this.missingCards.set(missing);
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
      const cards = [...this.ownedCards(), ...this.assignedElsewhereCards(), ...this.missingCards()].map(
        ({ card, quantity }) => ({ cardId: card.id, quantity }),
      );
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
        .map(({ card, quantity, ownedQty }) => ({
          cardId: card.id,
          priority: 2,
          notes: this.translate.instant('common.forDeck', { name: rec.name }),
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
}
