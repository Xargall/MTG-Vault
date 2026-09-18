import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BarChart, BarChartDatum } from '../../../shared/charts/bar-chart/bar-chart';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { DeckEntry, DeckService } from '../../decks/deck.service';
import { AddCardDialog } from '../add-card/add-card-dialog';
import { CardDetailDialog } from '../card-detail/card-detail-dialog';
import { DemoScanBlockedDialog } from '../demo-scan-blocked-dialog/demo-scan-blocked-dialog';
import { categoryKeyFor, getCategoriesForGame } from '../card-category-stats';
import { buildDeckNamesByCard, getEntryDeckNames, getEntrySurplus, getSurplusMap } from '../card-surplus-stats';
import { getManaCurve } from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';

// How many grid cells render at once, and how many more get added per
// scroll-triggered step - a large collection (see perf audit: 1400+ cards is
// a real case, not a hypothetical) otherwise dumps every entry's DOM node in
// at once on load/filter-change regardless of what's actually on screen.
// Not full virtual scrolling (nothing already rendered ever gets removed
// again) - deliberately simpler, since the real memory cost (decoded
// full-size images) is already solved by card-tile's small-image switch;
// this only caps the initial/filter-change render spike.
const INITIAL_RENDER_LIMIT = 60;
const RENDER_LIMIT_STEP = 60;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private readonly deckService = inject(DeckService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly gameService = inject(GameService);
  protected readonly authService = inject(AuthService);

  protected readonly categories = computed(() => getCategoriesForGame(this.gameService.currentSlug()));

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<CollectionEntry[]>([]);
  // Decks are an MTG-only concept (see CLAUDE.md) - always empty for other
  // games, which is exactly right: with no decks to need anything, nothing
  // should ever be flagged as surplus there either (see getSurplusMap).
  private readonly allDecks = signal<DeckEntry[]>([]);

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly showSurplusOnly = signal(false);
  protected readonly showAddDialog = signal(false);
  protected readonly showDemoScanBlocked = signal(false);
  protected readonly selectedEntry = signal<CollectionEntry | null>(null);

  protected readonly hasAnyCards = computed(() => this.entries().length > 0);

  /** Cards owned in more copies than every deck combined actually needs - see card-surplus-stats.ts. Exposed as a Map (card identity -> surplus count) rather than per-entry up front, since most entries have none and recomputing this per card on every access would be wasteful. */
  protected readonly surplusMap = computed(() => getSurplusMap(this.entries(), this.allDecks()));
  protected readonly hasSurplusCards = computed(() => this.surplusMap().size > 0);
  protected readonly getSurplus = (entry: CollectionEntry) => getEntrySurplus(entry, this.surplusMap());

  /** Which deck(s) list a given card, for the surplus badge and the deck-name search below - going deck by deck to clear surplus is a lot faster than eyeballing which of several same-named cards actually belongs where. */
  private readonly deckNamesByCard = computed(() => buildDeckNamesByCard(this.allDecks()));
  protected readonly getDeckNames = (entry: CollectionEntry) => getEntryDeckNames(entry, this.deckNamesByCard());

  protected readonly filteredEntries = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    const surplusOnly = this.showSurplusOnly();
    const surplusMap = this.surplusMap();
    const deckNamesByCard = this.deckNamesByCard();

    return this.entries().filter((entry) => {
      // In surplus mode the search also matches a deck's name, not just the
      // card's own name - e.g. typing "Boundless Elves" finds every
      // surplus card that deck lists, regardless of what the cards
      // themselves are called, so cleanup can go deck by deck instead of
      // hunting through the whole surplus list by eye.
      const matchesQuery =
        !query ||
        entry.card.name.toLowerCase().includes(query) ||
        (surplusOnly && getEntryDeckNames(entry, deckNamesByCard).some((name) => name.toLowerCase().includes(query)));
      const matchesCategory = !category || categoryKeyFor(entry) === category;
      const matchesSurplus = !surplusOnly || getEntrySurplus(entry, surplusMap) > 0;
      return matchesQuery && matchesCategory && matchesSurplus;
    });
  });

  protected readonly manaCurve = computed<BarChartDatum[]>(() => getManaCurve(this.filteredEntries()));

  // How many of filteredEntries() actually get a DOM node right now - see
  // INITIAL_RENDER_LIMIT. manaCurve above deliberately still reads
  // filteredEntries() directly, not this - the stats must reflect every
  // filtered card, not just the ones currently rendered.
  protected readonly renderLimit = signal(INITIAL_RENDER_LIMIT);
  protected readonly visibleEntries = computed(() => this.filteredEntries().slice(0, this.renderLimit()));
  protected readonly hasMoreEntries = computed(() => this.filteredEntries().length > this.renderLimit());

  private readonly loadMoreSentinel = viewChild<ElementRef<HTMLElement>>('loadMoreSentinel');
  private observer: IntersectionObserver | null = null;

  constructor() {
    const colorParam = this.route.snapshot.queryParamMap.get('color');
    if (colorParam) {
      this.selectedCategory.set(colorParam);
    }

    effect(() => {
      this.gameService.currentSlug();
      untracked(() => this.load());
    });

    // A new search/filter is a different result set - start over at the top
    // of it rather than keep whatever render count the previous one grew to.
    effect(() => {
      this.searchQuery();
      this.selectedCategory();
      this.showSurplusOnly();
      untracked(() => this.renderLimit.set(INITIAL_RENDER_LIMIT));
    });

    // Re-attaches whenever the sentinel element enters/leaves the DOM (it
    // only exists while hasMoreEntries() is true - see the template) -
    // loadMoreSentinel() is itself a signal, so this effect naturally reruns
    // each time that toggles.
    effect(() => {
      const sentinel = this.loadMoreSentinel();
      this.observer?.disconnect();
      if (!sentinel) return;

      this.observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) this.renderLimit.update((limit) => limit + RENDER_LIMIT_STEP);
      });
      this.observer.observe(sentinel.nativeElement);
    });

    this.destroyRef.onDestroy(() => this.observer?.disconnect());
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
      const [entries, allDecks] = await Promise.all([
        this.collectionService.getCollectionWithCardData(),
        this.deckService.getMyDecks(),
      ]);
      this.entries.set(entries);
      this.allDecks.set(allDecks);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : this.translate.instant('collection.loadError'),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
