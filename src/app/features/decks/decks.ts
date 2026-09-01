import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PreconListEntry } from '../../core/models/precon.model';
import { DeckCardIndexService } from '../../core/services/deck-card-index.service';
import { GameService } from '../../core/services/game.service';
import { YugiohPreconIndexService } from '../../core/services/yugioh-precon-index.service';
import { CollectionEntry, CollectionService } from '../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../wishlist/wishlist.service';
import { DeckBanner } from './deck-banner/deck-banner';
import { BrowseDecksDialog } from './browse-decks-dialog/browse-decks-dialog';
import { ArchetypeBrowserDialog } from './archetype-browser-dialog/archetype-browser-dialog';
import { CommanderRecommendationsDialog } from './commander-recommendations/commander-recommendations-dialog';
import { DeckDetailDialog } from './deck-detail-dialog/deck-detail-dialog';
import { buildOwnedMap, getDeckCardCount, getDeckMatch, getDeckShowcase, getPreconMatch } from './deck-stats';
import { DeckEntry, DeckService } from './deck.service';

const BANNER_SAMPLE_SIZE = 16;
const RECOMMENDATION_THRESHOLD = 75;
const RECOMMENDATION_LIMIT = 12;

interface Recommendation {
  deck: PreconListEntry;
  matchPercent: number;
  heroCardId: string | null;
  missingCardIds: string[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickBannerSample(list: PreconListEntry[], count: number): PreconListEntry[] {
  const byType = new Map<string, PreconListEntry[]>();
  for (const entry of shuffle(list)) {
    const bucket = byType.get(entry.type);
    if (bucket) {
      bucket.push(entry);
    } else {
      byType.set(entry.type, [entry]);
    }
  }

  const types = shuffle([...byType.keys()]);
  const sample: PreconListEntry[] = [];
  let round = 0;
  while (sample.length < count) {
    let addedInRound = false;
    for (const type of types) {
      const bucket = byType.get(type)!;
      if (round < bucket.length) {
        sample.push(bucket[round]);
        addedInRound = true;
        if (sample.length >= count) break;
      }
    }
    if (!addedInRound) break;
    round += 1;
  }
  return sample;
}

@Component({
  selector: 'app-decks',
  imports: [
    DeckBanner,
    BrowseDecksDialog,
    DeckDetailDialog,
    CommanderRecommendationsDialog,
    ArchetypeBrowserDialog,
    TranslatePipe,
  ],
  templateUrl: './decks.html',
  styleUrl: './decks.scss',
})
export class Decks {
  private readonly deckService = inject(DeckService);
  private readonly collectionService = inject(CollectionService);
  private readonly wishlistService = inject(WishlistService);
  protected readonly gameService = inject(GameService);
  private readonly deckCardIndex = inject(DeckCardIndexService);
  private readonly yugiohPreconIndex = inject(YugiohPreconIndexService);
  private readonly translate = inject(TranslateService);

  private readonly activeIndex = computed(() =>
    this.gameService.currentSlug() === 'yugioh' ? this.yugiohPreconIndex : this.deckCardIndex,
  );

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly decks = signal<DeckEntry[]>([]);
  protected readonly collectionEntries = signal<CollectionEntry[]>([]);
  protected readonly bannerImages = signal<string[]>([]);
  protected readonly showBrowseDialog = signal(false);
  protected readonly showCommanderRecs = signal(false);
  protected readonly showArchetypeBrowser = signal(false);
  protected readonly selectedDeck = signal<DeckEntry | null>(null);

  private readonly allPreconDecks = signal<PreconListEntry[]>([]);
  private readonly heroImages = signal<Map<string, string>>(new Map());

  protected readonly addingFileName = signal<string | null>(null);
  protected readonly wishlistingFileName = signal<string | null>(null);
  protected readonly recommendationError = signal<string | null>(null);

  protected readonly hasDecks = computed(() => this.decks().length > 0);

  protected readonly deckSummaries = computed(() =>
    this.decks().map((entry) => ({
      entry,
      showcase: getDeckShowcase(entry),
      cardCount: getDeckCardCount(entry),
      matchPercent: getDeckMatch(entry, this.collectionEntries()),
    })),
  );

  protected readonly recommendations = computed<Recommendation[]>(() => {
    this.activeIndex().indexedCount(); // re-run as the background index grows

    const owned = buildOwnedMap(this.collectionEntries());
    const trackedFileNames = new Set(
      this.decks()
        .map((entry) => entry.deck.mtgjson_file_name)
        .filter((name): name is string => !!name),
    );
    const trackedNames = new Set(this.decks().map((entry) => entry.deck.name));

    const results: Recommendation[] = [];
    for (const deck of this.allPreconDecks()) {
      if (trackedFileNames.has(deck.fileName) || trackedNames.has(deck.name)) continue;

      const indexed = this.activeIndex().getEntry(deck.fileName);
      if (!indexed || indexed.cards.length === 0) continue;

      const matchPercent = getPreconMatch(indexed.cards, owned);
      if (matchPercent < RECOMMENDATION_THRESHOLD) continue;

      const missingCardIds = indexed.cards
        .filter((card) => (owned.get(card.cardId) ?? 0) < card.quantity)
        .map((card) => card.cardId);

      results.push({ deck, matchPercent, heroCardId: indexed.heroCardId, missingCardIds });
    }

    return results.sort((a, b) => b.matchPercent - a.matchPercent).slice(0, RECOMMENDATION_LIMIT);
  });

  protected readonly heroImageUrl = (cardId: string | null) =>
    cardId ? (this.heroImages().get(cardId) ?? null) : null;

  constructor() {
    effect(() => {
      this.gameService.currentSlug();
      untracked(() => {
        this.loadDecks();
        this.loadPreconList();
        this.activeIndex().ensureBuilding();
      });
    });

    effect(() => {
      const recs = this.recommendations();
      const heroIds = recs
        .filter((rec) => !rec.deck.bannerImageUrl)
        .map((rec) => rec.heroCardId)
        .filter((id): id is string => !!id);
      const missing = untracked(() => heroIds.filter((id) => !this.heroImages().has(id)));
      if (missing.length > 0) {
        this.loadHeroImages(missing);
      }
    });
  }

  protected async loadDecks() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const [decks, collection] = await Promise.all([
        this.deckService.getMyDecks(),
        this.collectionService.getCollectionWithCardData(),
      ]);
      this.decks.set(decks);
      this.collectionEntries.set(collection);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : this.translate.instant('decks.loadError'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPreconList() {
    const precon = this.gameService.precon();
    if (!precon) {
      this.allPreconDecks.set([]);
      this.bannerImages.set([]);
      return;
    }
    try {
      const list = await precon.getDeckList();
      this.allPreconDecks.set(list);
      await this.loadBannerImages(list);
    } catch {
      this.bannerImages.set([]);
    }
  }

  private async loadBannerImages(list: PreconListEntry[]) {
    try {
      const sample = pickBannerSample(list, BANNER_SAMPLE_SIZE);
      const direct = sample.filter((deck) => deck.bannerImageUrl).map((deck) => deck.bannerImageUrl!);
      const needsHeroLookup = sample.filter((deck) => !deck.bannerImageUrl);

      let fromHeroLookup: string[] = [];
      if (needsHeroLookup.length > 0) {
        const precon = this.gameService.precon();
        const details = precon
          ? await Promise.all(needsHeroLookup.map((deck) => precon.getDeckDetail(deck.fileName).catch(() => null)))
          : [];
        const heroIds = details
          .map((detail) => detail?.heroCardId)
          .filter((id): id is string => !!id);
        const cards = await this.gameService.cardApi().getCardsByIds(heroIds);
        fromHeroLookup = cards.map((card) => card.imageUrl).filter((url): url is string => !!url);
      }

      this.bannerImages.set(shuffle([...direct, ...fromHeroLookup]));
    } catch {
      this.bannerImages.set([]);
    }
  }

  private async loadHeroImages(cardIds: string[]) {
    try {
      const cards = await this.gameService.cardApi().getCardsByIds(cardIds);
      this.heroImages.update((map) => {
        const next = new Map(map);
        for (const card of cards) {
          if (card.imageUrl) next.set(card.id, card.imageUrl);
        }
        return next;
      });
    } catch {
      // Recommendation cards just render without an image if this fails.
    }
  }

  protected async addRecommendation(rec: Recommendation) {
    this.addingFileName.set(rec.deck.fileName);
    this.recommendationError.set(null);
    try {
      const indexed = this.activeIndex().getEntry(rec.deck.fileName);
      if (!indexed) throw new Error(this.translate.instant('browseDecks.detailFailed'));

      await this.deckService.addPreconDeck(rec.deck.name, rec.deck.type, rec.deck.releaseDate, rec.deck.fileName, {
        heroCardId: indexed.heroCardId,
        cards: indexed.cards,
        skippedCount: indexed.skippedCount,
      });
      await this.loadDecks();
    } catch (error) {
      this.recommendationError.set(
        error instanceof Error ? error.message : this.translate.instant('decks.addRecommendationFailed'),
      );
    } finally {
      this.addingFileName.set(null);
    }
  }

  protected async addRecommendationMissingToWishlist(rec: Recommendation) {
    this.wishlistingFileName.set(rec.deck.fileName);
    this.recommendationError.set(null);
    try {
      const existing = await this.wishlistService.getCardIds();
      const inputs: UpsertWishlistInput[] = rec.missingCardIds
        .filter((id) => !existing.has(id))
        .map((cardId) => ({ cardId, priority: 2, notes: this.translate.instant('common.forDeck', { name: rec.deck.name }) }));

      if (inputs.length > 0) {
        await this.wishlistService.upsertMany(inputs);
      }
    } catch (error) {
      this.recommendationError.set(
        error instanceof Error ? error.message : this.translate.instant('decks.wishlistUpdateFailed'),
      );
    } finally {
      this.wishlistingFileName.set(null);
    }
  }

  protected onDeckAdded() {
    this.loadDecks();
  }

  protected onDeckDeleted() {
    this.selectedDeck.set(null);
    this.loadDecks();
  }
}
