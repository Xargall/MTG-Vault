import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BarChart, BarChartDatum } from '../../../shared/charts/bar-chart/bar-chart';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { GameService } from '../../../core/services/game.service';
import { AddCardDialog } from '../add-card/add-card-dialog';
import { CardDetailDialog } from '../card-detail/card-detail-dialog';
import { categoryKeyFor, getCategoriesForGame } from '../card-category-stats';
import { getManaCurve } from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';

@Component({
  selector: 'app-collection-overview',
  imports: [BarChart, CardTile, AddCardDialog, CardDetailDialog, RouterLink, TranslatePipe],
  templateUrl: './collection-overview.html',
  styleUrl: './collection-overview.scss',
})
export class CollectionOverview {
  private readonly collectionService = inject(CollectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  protected readonly gameService = inject(GameService);

  protected readonly categories = computed(() => getCategoriesForGame(this.gameService.currentSlug()));

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<CollectionEntry[]>([]);

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly showAddDialog = signal(false);
  protected readonly selectedEntry = signal<CollectionEntry | null>(null);

  protected readonly hasAnyCards = computed(() => this.entries().length > 0);

  protected readonly filteredEntries = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();

    return this.entries().filter(({ card }) => {
      const matchesQuery = !query || card.name.toLowerCase().includes(query);
      const matchesCategory = !category || categoryKeyFor(card) === category;
      return matchesQuery && matchesCategory;
    });
  });

  protected readonly manaCurve = computed<BarChartDatum[]>(() => getManaCurve(this.filteredEntries()));

  constructor() {
    const colorParam = this.route.snapshot.queryParamMap.get('color');
    if (colorParam) {
      this.selectedCategory.set(colorParam);
    }

    effect(() => {
      this.gameService.currentSlug();
      untracked(() => this.load());
    });
  }

  toggleCategory(key: string) {
    this.selectedCategory.set(this.selectedCategory() === key ? null : key);
  }

  protected onEntryDeleted() {
    this.load();
  }

  protected async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.entries.set(await this.collectionService.getCollectionWithCardData());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : this.translate.instant('collection.loadError'),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
