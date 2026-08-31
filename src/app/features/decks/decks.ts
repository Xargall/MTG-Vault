import { Component, computed, inject, signal } from '@angular/core';

import { getCardImageUrl, ScryfallService } from '../../core/services/scryfall.service';
import { MtgjsonDeckListEntry, MtgjsonService } from '../../core/services/mtgjson.service';
import { CollectionEntry, CollectionService } from '../collection/collection.service';
import { DeckBanner } from './deck-banner/deck-banner';
import { BrowseDecksDialog } from './browse-decks-dialog/browse-decks-dialog';
import { DeckDetailDialog } from './deck-detail-dialog/deck-detail-dialog';
import { getDeckCardCount, getDeckMatch, getDeckShowcase } from './deck-stats';
import { DeckEntry, DeckService } from './deck.service';

const BANNER_SAMPLE_SIZE = 16;

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
  imports: [DeckBanner, BrowseDecksDialog, DeckDetailDialog],
  templateUrl: './decks.html',
  styleUrl: './decks.scss',
})
export class Decks {
  private readonly deckService = inject(DeckService);
  private readonly collectionService = inject(CollectionService);
  private readonly mtgjson = inject(MtgjsonService);
  private readonly scryfall = inject(ScryfallService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly decks = signal<DeckEntry[]>([]);
  private readonly collectionEntries = signal<CollectionEntry[]>([]);
  protected readonly bannerImages = signal<string[]>([]);
  protected readonly showBrowseDialog = signal(false);
  protected readonly selectedDeck = signal<DeckEntry | null>(null);

  protected readonly hasDecks = computed(() => this.decks().length > 0);

  protected readonly deckSummaries = computed(() =>
    this.decks().map((entry) => ({
      entry,
      showcase: getDeckShowcase(entry),
      cardCount: getDeckCardCount(entry),
      matchPercent: getDeckMatch(entry, this.collectionEntries()),
    })),
  );

  protected readonly getCardImageUrl = getCardImageUrl;

  constructor() {
    this.loadDecks();
    this.loadBanner();
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

  private async loadBanner() {
    try {
      const list = await this.mtgjson.getDeckList();
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

  protected onDeckAdded() {
    this.loadDecks();
  }

  protected onDeckDeleted() {
    this.selectedDeck.set(null);
    this.loadDecks();
  }
}
