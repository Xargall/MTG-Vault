import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { BarChart, BarChartDatum } from '../../../shared/charts/bar-chart/bar-chart';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AddCardDialog } from '../add-card/add-card-dialog';
import { CardDetailDialog } from '../card-detail/card-detail-dialog';
import {
  COLOR_CATEGORIES,
  ColorCategory,
  colorCategoryFor,
  getManaCurve,
} from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';

@Component({
  selector: 'app-collection-overview',
  imports: [BarChart, CardTile, AddCardDialog, CardDetailDialog],
  templateUrl: './collection-overview.html',
  styleUrl: './collection-overview.scss',
})
export class CollectionOverview {
  private readonly collectionService = inject(CollectionService);
  private readonly route = inject(ActivatedRoute);

  protected readonly colorCategories = COLOR_CATEGORIES;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<CollectionEntry[]>([]);

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<ColorCategory | null>(null);
  protected readonly showAddDialog = signal(false);
  protected readonly selectedEntry = signal<CollectionEntry | null>(null);

  protected readonly hasAnyCards = computed(() => this.entries().length > 0);

  protected readonly filteredEntries = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();

    return this.entries().filter(({ card }) => {
      const matchesQuery = !query || card.name.toLowerCase().includes(query);
      const matchesCategory = !category || colorCategoryFor(card.color_identity) === category;
      return matchesQuery && matchesCategory;
    });
  });

  protected readonly manaCurve = computed<BarChartDatum[]>(() => getManaCurve(this.filteredEntries()));

  constructor() {
    const colorParam = this.route.snapshot.queryParamMap.get('color') as ColorCategory | null;
    if (colorParam && this.colorCategories.some((c) => c.key === colorParam)) {
      this.selectedCategory.set(colorParam);
    }
    this.load();
  }

  toggleCategory(key: ColorCategory) {
    this.selectedCategory.set(this.selectedCategory() === key ? null : key);
  }

  protected async load() {
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
