import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BarChart } from '../../shared/charts/bar-chart/bar-chart';
import { DonutChart } from '../../shared/charts/donut-chart/donut-chart';
import { getCardImageUrl, ScryfallCard, ScryfallService } from '../../core/services/scryfall.service';
import {
  getColorCategorySummaries,
  getColorDistribution,
  getPriceDistribution,
  getTotalValue,
} from '../collection/collection-stats';
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
  private readonly scryfall = inject(ScryfallService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<CollectionEntry[]>([]);

  protected readonly hasCards = computed(() => this.entries().length > 0);
  protected readonly colorDistribution = computed(() => getColorDistribution(this.entries()));
  protected readonly colorCategories = computed(() => getColorCategorySummaries(this.entries()));
  protected readonly priceDistribution = computed(() => getPriceDistribution(this.entries()));
  protected readonly totalValue = computed(() => getTotalValue(this.entries()));
  protected readonly getCardImageUrl = getCardImageUrl;

  protected readonly popularCards = signal<ScryfallCard[]>([]);
  private readonly popularIndex = signal(0);
  protected readonly currentPopularCard = computed(
    () => this.popularCards()[this.popularIndex()] ?? null,
  );

  constructor() {
    this.load();
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
      const cards = await this.scryfall.getPopularCards(POPULAR_CARD_COUNT);
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
