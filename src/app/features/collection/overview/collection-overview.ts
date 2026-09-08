import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BarChart, BarChartDatum } from '../../../shared/charts/bar-chart/bar-chart';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { AddCardDialog } from '../add-card/add-card-dialog';
import { CardDetailDialog } from '../card-detail/card-detail-dialog';
import { DemoScanBlockedDialog } from '../demo-scan-blocked-dialog/demo-scan-blocked-dialog';
import { categoryKeyFor, getCategoriesForGame } from '../card-category-stats';
import { getManaCurve } from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';

@Component({
  selector: 'app-collection-overview',
  imports: [
    BarChart,
    CardTile,
    AddCardDialog,
    CardDetailDialog,
    DemoScanBlockedDialog,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './collection-overview.html',
  styleUrl: './collection-overview.scss',
})
export class CollectionOverview {
  private readonly collectionService = inject(CollectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  protected readonly gameService = inject(GameService);
  protected readonly authService = inject(AuthService);

  protected readonly categories = computed(() => getCategoriesForGame(this.gameService.currentSlug()));

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<CollectionEntry[]>([]);

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly showAddDialog = signal(false);
  protected readonly showDemoScanBlocked = signal(false);
  protected readonly selectedEntry = signal<CollectionEntry | null>(null);

  protected readonly hasAnyCards = computed(() => this.entries().length > 0);

  protected readonly filteredEntries = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();

    return this.entries().filter((entry) => {
      const matchesQuery = !query || entry.card.name.toLowerCase().includes(query);
      const matchesCategory = !category || categoryKeyFor(entry) === category;
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

  protected onScanButtonClick(event: MouseEvent) {
    if (this.authService.isGuest()) {
      event.preventDefault();
      this.showDemoScanBlocked.set(true);
    }
  }

  protected onEntryDeleted() {
    this.load();
  }

  /** Keeps the still-open dialog showing the saved values too, not just the grid behind it - `entry` is a plain input bound to whatever object is in `selectedEntry`, which reloading `entries` alone wouldn't update in place. */
  protected async onEntryUpdated() {
    await this.load();
    const current = this.selectedEntry();
    if (!current) return;
    this.selectedEntry.set(this.entries().find((e) => e.row.id === current.row.id) ?? null);
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
