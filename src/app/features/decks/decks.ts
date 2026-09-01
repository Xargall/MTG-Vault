import { Component, computed, effect, inject, signal, untracked } from '@angular/core';

import { DeckCardIndexService } from '../../core/services/deck-card-index.service';
import { getCardImageUrl, ScryfallService } from '../../core/services/scryfall.service';
import { MtgjsonDeckListEntry, MtgjsonService } from '../../core/services/mtgjson.service';
import { CollectionEntry, CollectionService } from '../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../wishlist/wishlist.service';
import { DeckBanner } from './deck-banner/deck-banner';
import { BrowseDecksDialog } from './browse-decks-dialog/browse-decks-dialog';
import { CommanderRecommendationsDialog } from './commander-recommendations/commander-recommendations-dialog';
import { DeckDetailDialog } from './deck-detail-dialog/deck-detail-dialog';
import { buildOwnedMap, getDeckCardCount, getDeckMatch, getDeckShowcase, getPreconMatch } from './deck-stats';
import { DeckEntry, DeckService } from './deck.service';

const BANNER_SAMPLE_SIZE = 16;
const RECOMMENDATION_THRESHOLD = 75;
const RECOMMENDATION_LIMIT = 12;

interface Recommendation {
  deck: MtgjsonDeckListEntry;
  matchPercent: number;
  heroScryfallId: string | null;
  missingScryfallIds: string[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickBannerSample(list: MtgjsonDeckListEntry[], count: number): MtgjsonDeckListEntry[] {
  const byType = new Map<string, MtgjsonDeckListEntry[]>();
  for (const entry of shuffle(list)) {
    const bucket = byType.get(entry.type);
    if (bucket) {
      bucket.push(entry);
    } else {
      byType.set(entry.type, [entry]);
    }
  }

  const types = shuffle([...byType.keys()]);
  const sample: MtgjsonDeckListEntry[] = [];
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
  imports: [DeckBanner, BrowseDecksDialog, DeckDetailDialog, CommanderRecommendationsDialog],
  templateUrl: './decks.html',
  styleUrl: './decks.scss',
})
export class Decks {
  private readonly deckService = inject(DeckService);
  private readonly collectionService = inject(CollectionService);
  private readonly wishlistService = inject(WishlistService);
  private readonly mtgjson = inject(MtgjsonService);
  private readonly scryfall = inject(ScryfallService);
  private readonly deckCardIndex = inject(DeckCardIndexService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly decks = signal<DeckEntry[]>([]);
  protected readonly collectionEntries = signal<CollectionEntry[]>([]);
  protected readonly bannerImages = signal<string[]>([]);
  protected readonly showBrowseDialog = signal(false);
  protected readonly showCommanderRecs = signal(false);
  protected readonly selectedDeck = signal<DeckEntry | null>(null);

  private readonly allPreconDecks = signal<MtgjsonDeckListEntry[]>([]);
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
    this.deckCardIndex.indexedCount(); // re-run as the background index grows

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

      const indexed = this.deckCardIndex.getEntry(deck.fileName);
      if (!indexed || indexed.cards.length === 0) continue;

      const matchPercent = getPreconMatch(indexed.cards, owned);
      if (matchPercent < RECOMMENDATION_THRESHOLD) continue;

      const missingScryfallIds = indexed.cards
        .filter((card) => (owned.get(card.scryfallId) ?? 0) < card.quantity)
        .map((card) => card.scryfallId);

      results.push({ deck, matchPercent, heroScryfallId: indexed.heroScryfallId, missingScryfallIds });
    }

    return results.sort((a, b) => b.matchPercent - a.matchPercent).slice(0, RECOMMENDATION_LIMIT);
  });

  protected readonly getCardImageUrl = getCardImageUrl;
  protected readonly heroImageUrl = (scryfallId: string | null) =>
    scryfallId ? (this.heroImages().get(scryfallId) ?? null) : null;

  constructor() {
    this.loadDecks();
    this.loadPreconList();
    this.deckCardIndex.ensureBuilding();

    effect(() => {
      const recs = this.recommendations();
      const heroIds = recs
        .map((rec) => rec.heroScryfallId)
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
      this.errorMessage.set(error instanceof Error ? error.message : 'Decks konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPreconList() {
    try {
      const list = await this.mtgjson.getDeckList();
      this.allPreconDecks.set(list);
      await this.loadBannerImages(list);
    } catch {
      this.bannerImages.set([]);
    }
  }

  private async loadBannerImages(list: MtgjsonDeckListEntry[]) {
    try {
      const sample = pickBannerSample(list, BANNER_SAMPLE_SIZE);
      const details = await Promise.all(
        sample.map((deck) => this.mtgjson.getDeckDetail(deck.fileName).catch(() => null)),
      );
      const heroIds = details
        .map((detail) => detail?.heroScryfallId)
        .filter((id): id is string => !!id);

      const cards = await this.scryfall.getCardsByIds(heroIds);
      const images = cards
        .map((card) => getCardImageUrl(card))
        .filter((url): url is string => !!url);
      this.bannerImages.set(images);
    } catch {
      this.bannerImages.set([]);
    }
  }

  private async loadHeroImages(scryfallIds: string[]) {
    try {
      const cards = await this.scryfall.getCardsByIds(scryfallIds);
      this.heroImages.update((map) => {
        const next = new Map(map);
        for (const card of cards) {
          const url = getCardImageUrl(card);
          if (url) next.set(card.id, url);
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
      const indexed = this.deckCardIndex.getEntry(rec.deck.fileName);
      if (!indexed) throw new Error('Deck konnte nicht geladen werden.');

      await this.deckService.addPreconDeck(rec.deck.name, rec.deck.type, rec.deck.releaseDate, rec.deck.fileName, {
        heroScryfallId: indexed.heroScryfallId,
        cards: indexed.cards,
        skippedCount: indexed.skippedCount,
      });
      await this.loadDecks();
    } catch (error) {
      this.recommendationError.set(
        error instanceof Error ? error.message : 'Deck konnte nicht hinzugefügt werden.',
      );
    } finally {
      this.addingFileName.set(null);
    }
  }

  protected async addRecommendationMissingToWishlist(rec: Recommendation) {
    this.wishlistingFileName.set(rec.deck.fileName);
    this.recommendationError.set(null);
    try {
      const existing = await this.wishlistService.getScryfallIds();
      const inputs: UpsertWishlistInput[] = rec.missingScryfallIds
        .filter((id) => !existing.has(id))
        .map((scryfallId) => ({ scryfallId, priority: 2, notes: `Für ${rec.deck.name}` }));

      if (inputs.length > 0) {
        await this.wishlistService.upsertMany(inputs);
      }
    } catch (error) {
      this.recommendationError.set(
        error instanceof Error ? error.message : 'Wunschliste konnte nicht aktualisiert werden.',
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
