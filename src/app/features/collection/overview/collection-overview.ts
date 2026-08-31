import { Component, computed, inject, signal } from '@angular/core';

import { BarChart, BarChartDatum } from '../../../shared/charts/bar-chart/bar-chart';
import { getManaCurve } from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';

@Component({
  selector: 'app-collection-overview',
  imports: [BarChart],
  templateUrl: './collection-overview.html',
  styleUrl: './collection-overview.scss',
})
export class CollectionOverview {
  private readonly collectionService = inject(CollectionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<CollectionEntry[]>([]);

  protected readonly isEmpty = computed(() => !this.loading() && this.entries().length === 0);
  protected readonly manaCurve = computed<BarChartDatum[]>(() => getManaCurve(this.entries()));

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
