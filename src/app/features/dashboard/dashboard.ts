import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BarChart } from '../../shared/charts/bar-chart/bar-chart';
import { DonutChart } from '../../shared/charts/donut-chart/donut-chart';
import { Card } from '../../core/models/card.model';
import { EdhrecService } from '../../core/services/edhrec.service';
import { GameService } from '../../core/services/game.service';
import { MtgApiService } from '../../core/services/mtg-api.service';
import { getCategoryDistribution, getCategorySummaries } from '../collection/card-category-stats';
import { getPriceDistribution, getTotalValue } from '../collection/card-price-stats';
import { CollectionEntry, CollectionService } from '../collection/collection.service';

const POPULAR_CARD_COUNT = 12;
const POPULAR_CARD_ROTATION_MS = 15000;
const SALTIEST_CARD_COUNT = 10;
// >= 3.5 red ("very salty"), >= 2.5 orange, otherwise yellow.
const SALT_HIGH_THRESHOLD = 3.5;
const SALT_MEDIUM_THRESHOLD = 2.5;

export interface SaltyCard {
  card: Card;
  salt: number;
}

export type SaltLevel = 'high' | 'medium' | 'low';

export function saltLevel(salt: number): SaltLevel {
  if (salt >= SALT_HIGH_THRESHOLD) return 'high';
  if (salt >= SALT_MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

@Component({
  selector: 'app-dashboard',
  imports: [DonutChart, BarChart, RouterLink, DecimalPipe, TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly collectionService = inject(CollectionService);
  private readonly mtgApi = inject(MtgApiService);
  private readonly edhrec = inject(EdhrecService);
  protected readonly gameService = inject(GameService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  // Placeholder count for the loading skeleton grid - purely cosmetic, not tied to real data.
  protected readonly skeletonPlaceholders = Array.from({ length: 7 });
  private readonly entries = signal<CollectionEntry[]>([]);

  protected readonly hasCards = computed(() => this.entries().length > 0);
  protected readonly colorDistribution = computed(() =>
    getCategoryDistribution(this.entries(), this.gameService.currentSlug()),
  );
  protected readonly colorCategories = computed(() =>
    getCategorySummaries(this.entries(), this.gameService.currentSlug()),
  );
  protected readonly priceDistribution = computed(() => getPriceDistribution(this.entries()));
  protected readonly totalValue = computed(() => getTotalValue(this.entries()));

  protected readonly categoryHeading = computed(() => {
    const slug = this.gameService.currentSlug();
    if (slug === 'yugioh') return 'dashboard.attributeDistribution';
    if (slug === 'pokemon') return 'dashboard.typeDistribution';
    return 'dashboard.colorDistribution';
  });
  protected readonly categoryListHeading = computed(() => {
    const slug = this.gameService.currentSlug();
    if (slug === 'yugioh') return 'dashboard.attributeCategories';
    if (slug === 'pokemon') return 'dashboard.typeCategories';
    return 'dashboard.colorCategories';
  });

  protected readonly popularCards = signal<Card[]>([]);
  private readonly popularIndex = signal(0);
  protected readonly currentPopularCard = computed(
    () => this.popularCards()[this.popularIndex()] ?? null,
  );

  // Same rotating-single-card presentation as popularCards/currentPopularCard
  // above (see the template - it's the exact same box/size, just styled with
  // a salt badge) - empty until loaded, and also stays empty (never an error
  // state) whenever EDHREC is unavailable (403 cooldown, network issue, ...),
  // so the section simply doesn't render at all (see loadSaltiestCards).
  protected readonly saltiestCards = signal<SaltyCard[]>([]);
  private readonly saltiestIndex = signal(0);
  protected readonly currentSaltiestCard = computed(
    () => this.saltiestCards()[this.saltiestIndex()] ?? null,
  );
  protected readonly saltLevel = saltLevel;

  constructor() {
    effect(() => {
      this.gameService.currentSlug();
      untracked(() => this.load());
    });
    this.loadPopularCards();
    this.loadSaltiestCards();
  }

  private async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.entries.set(await this.collectionService.getCollectionWithCardData());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : this.translate.instant('dashboard.loadError'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPopularCards() {
    try {
      const cards = await this.mtgApi.getPopularCards(POPULAR_CARD_COUNT);
      this.popularCards.set(cards);
      if (cards.length > 1) {
        const intervalId = setInterval(() => {
          this.popularIndex.update((i) => (i + 1) % cards.length);
        }, POPULAR_CARD_ROTATION_MS);
        this.destroyRef.onDestroy(() => clearInterval(intervalId));
      }
    } catch {
      // Purely decorative - the rest of the dashboard works fine without it.
    }
  }

  /**
   * EDHREC only gives name+score, not full card data - resolved into real
   * Card objects (for the image) via a single batched Scryfall lookup, then
   * matched back to their salt score by name. A name Scryfall doesn't
   * recognize (or EDHREC being cooled-off/unavailable, see EdhrecService)
   * just quietly shrinks the list rather than erroring - same
   * decorative-only failure handling as loadPopularCards.
   */
  private async loadSaltiestCards() {
    try {
      const saltByName = new Map(
        (await this.edhrec.getSaltiestCards(SALTIEST_CARD_COUNT)).map((c) => [c.name, c.salt]),
      );
      if (saltByName.size === 0) return;

      const cards = await this.mtgApi.getCardsByNames([...saltByName.keys()], true);
      const saltiest = cards
        .map((card) => ({ card, salt: saltByName.get(card.name) ?? 0 }))
        .sort((a, b) => b.salt - a.salt);
      this.saltiestCards.set(saltiest);

      if (saltiest.length > 1) {
        const intervalId = setInterval(() => {
          this.saltiestIndex.update((i) => (i + 1) % saltiest.length);
        }, POPULAR_CARD_ROTATION_MS);
        this.destroyRef.onDestroy(() => clearInterval(intervalId));
      }
    } catch {
      // Purely decorative - the rest of the dashboard works fine without it.
    }
  }
}
