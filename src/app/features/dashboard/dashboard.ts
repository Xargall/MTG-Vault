import { Component, computed, inject, signal } from '@angular/core';

import { DonutChart } from '../../shared/charts/donut-chart/donut-chart';
import { getCardImageUrl } from '../../core/services/scryfall.service';
import { getColorCategorySummaries, getColorDistribution } from '../collection/collection-stats';
import { CollectionEntry, CollectionService } from '../collection/collection.service';

@Component({
  selector: 'app-dashboard',
  imports: [DonutChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly collectionService = inject(CollectionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<CollectionEntry[]>([]);

  protected readonly hasCards = computed(() => this.entries().length > 0);
  protected readonly colorDistribution = computed(() => getColorDistribution(this.entries()));
  protected readonly colorCategories = computed(() => getColorCategorySummaries(this.entries()));
  protected readonly getCardImageUrl = getCardImageUrl;

  constructor() {
    this.load();
  }

  private async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.entries.set(await this.collectionService.getCollectionWithCardData());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Sammlung konnte nicht geladen werden.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
