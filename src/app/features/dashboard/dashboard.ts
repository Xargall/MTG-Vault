import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BarChart } from '../../shared/charts/bar-chart/bar-chart';
import { DonutChart } from '../../shared/charts/donut-chart/donut-chart';
import { Card } from '../../core/models/card.model';
import { GameService } from '../../core/services/game.service';
import { MtgApiService } from '../../core/services/mtg-api.service';
import { getCategoryDistribution, getCategorySummaries } from '../collection/card-category-stats';
import { getPriceDistribution, getTotalValue } from '../collection/card-price-stats';
import { CollectionEntry, CollectionService } from '../collection/collection.service';

const POPULAR_CARD_COUNT = 12;
const POPULAR_CARD_ROTATION_MS = 15000;

@Component({
  selector: 'app-dashboard',
  imports: [DonutChart, BarChart, RouterLink, DecimalPipe, TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly collectionService = inject(CollectionService);
  private readonly mtgApi = inject(MtgApiService);
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

  protected readonly categoryHeading = computed(() =>
    this.gameService.currentSlug() === 'yugioh'
      ? 'dashboard.attributeDistribution'
      : 'dashboard.colorDistribution',
  );
  protected readonly categoryListHeading = computed(() =>
    this.gameService.currentSlug() === 'yugioh' ? 'dashboard.attributeCategories' : 'dashboard.colorCategories',
  );

  protected readonly popularCards = signal<Card[]>([]);
  private readonly popularIndex = signal(0);
  protected readonly currentPopularCard = computed(
    () => this.popularCards()[this.popularIndex()] ?? null,
  );

  constructor() {
    effect(() => {
      this.gameService.currentSlug();
      untracked(() => this.load());
    });
    this.loadPopularCards();
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
}
