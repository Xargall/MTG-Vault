import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BarChart, BarChartDatum } from '../../../shared/charts/bar-chart/bar-chart';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AppDialog } from '../../../shared/dialog/dialog';
import { PricePipe, formatEuro } from '../../../shared/pipes/price.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { CardDisplayLanguageService } from '../../../core/services/card-display-language.service';
import { GameService } from '../../../core/services/game.service';
import { DeckEntry, DeckService } from '../../decks/deck.service';
import { AddCardDialog } from '../add-card/add-card-dialog';
import { CardDetailDialog } from '../card-detail/card-detail-dialog';
import { DemoScanBlockedDialog } from '../demo-scan-blocked-dialog/demo-scan-blocked-dialog';
import { categoryKeyFor, getCategoriesForGame } from '../card-category-stats';
import { buildDeckNamesByCard, getEntryDeckNames, getEntrySurplus, getSurplusMap, isLandCard } from '../card-surplus-stats';
import {
  CollectionSort,
  SORT_OPTIONS,
  getRarityOptions,
  getTypeKeys,
  getTypeOptions,
  getUnitPrice,
  matchesPriceRange,
  rarityLabelKey,
  sortEntries,
} from '../collection-filters';
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

const SORT_STORAGE_KEY = 'tcgvault.collection.sort';

function readStoredSort(): CollectionSort {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (SORT_OPTIONS.some((option) => option.value === stored)) return stored as CollectionSort;
  } catch {
    // Storage blocked (private mode etc.) - fall back to the default.
  }
  return 'name';
}

/** One removable chip per active filter, shown above the grid. */
export interface ActiveFilterChip {
  id: string;
  label: string;
  remove: () => void;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-collection-overview',
  imports: [
    BarChart,
    CardTile,
    AddCardDialog,
    AppDialog,
    CardDetailDialog,
    PricePipe,
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
  private readonly cardDisplayLanguage = inject(CardDisplayLanguageService);
  protected readonly gameService = inject(GameService);
  protected readonly authService = inject(AuthService);

  protected readonly categories = computed(() => getCategoriesForGame(this.gameService.currentSlug()));

  protected readonly loading = signal(true);
  protected readonly revealing = signal(false);
  private revealTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<CollectionEntry[]>([]);
  // Decks are an MTG-only concept (see CLAUDE.md) - always empty for other
  // games, which is exactly right: with no decks to need anything, nothing
  // should ever be flagged as surplus there either (see getSurplusMap).
  private readonly allDecks = signal<DeckEntry[]>([]);

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string | null>(null);
  // Which set(s) (CollectionEntry.card.setName) to restrict the grid to -
  // empty means no restriction. A checkbox list in the filter sheet (see
  // availableSets below), not a row of chips like the color categories,
  // since a collection can span dozens of different sets.
  protected readonly selectedSets = signal<Set<string>>(new Set());
  protected readonly selectedTypes = signal<Set<string>>(new Set());
  protected readonly selectedRarities = signal<Set<string>>(new Set());
  // EUR per copy; null = no bound on that side.
  protected readonly priceMin = signal<number | null>(null);
  protected readonly priceMax = signal<number | null>(null);
  protected readonly showFilters = signal(false);
  // A deliberate order instead of whatever the database returned.
  protected readonly sort = signal<CollectionSort>(readStoredSort());
  protected readonly sortOptions = computed(() =>
    SORT_OPTIONS.filter((option) => !option.mtgOnly || this.gameService.currentSlug() === 'mtg'),
  );
  protected readonly showSurplusOnly = signal(false);
  // Only meaningful (and only shown) alongside showSurplusOnly - lands
  // dominate that view with large, uninteresting counts (see isLandCard's
  // own doc comment), so it's an easy way to focus on the cards actually
  // worth cleaning up.
  protected readonly hideLands = signal(false);
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

  /** Every filter except the set menu - its own available options (see availableSets) are drawn from *this*, not from filteredEntries, so the menu still offers every set relevant to the current search/category/surplus filter instead of narrowing to just whatever's already been picked from it. */
  private readonly entriesBeforeSetFilter = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    const surplusOnly = this.showSurplusOnly();
    const hideLands = this.hideLands();
    const surplusMap = this.surplusMap();
    const deckNamesByCard = this.deckNamesByCard();
    const types = this.selectedTypes();
    const rarities = this.selectedRarities();
    const priceMin = this.priceMin();
    const priceMax = this.priceMax();

    return this.entries().filter((entry) => {
      // In surplus mode the search also matches a deck's name, not just the
      // card's own name - e.g. typing "Boundless Elves" finds every
      // surplus card that deck lists, regardless of what the cards
      // themselves are called, so cleanup can go deck by deck instead of
      // hunting through the whole surplus list by eye.
      // Matches the card's own displayed name, its canonical English/oracle
      // name, and the best known translated name across any *other* owned
      // printing of the same card (see Card.localizedName's own doc
      // comment) - so a search finds every printing of a card regardless of
      // which language each specific printing happens to be displayed in
      // (e.g. a Commander-deck-exclusive English-only printing still turns
      // up under a German search, as long as some other owned printing of
      // the same card is known to translate to that German name).
      const matchesQuery =
        !query ||
        entry.card.name.toLowerCase().includes(query) ||
        entry.card.oracleName.toLowerCase().includes(query) ||
        (entry.card.localizedName?.toLowerCase().includes(query) ?? false) ||
        (surplusOnly && getEntryDeckNames(entry, deckNamesByCard).some((name) => name.toLowerCase().includes(query)));
      const matchesCategory = !category || categoryKeyFor(entry) === category;
      const matchesSurplus = !surplusOnly || getEntrySurplus(entry, surplusMap) > 0;
      const matchesLandFilter = !(surplusOnly && hideLands) || !isLandCard(entry.card);
      const matchesType = types.size === 0 || getTypeKeys(entry.card).some((key) => types.has(key));
      const matchesRarity = rarities.size === 0 || (!!entry.card.rarity && rarities.has(entry.card.rarity));
      return (
        matchesQuery &&
        matchesCategory &&
        matchesSurplus &&
        matchesLandFilter &&
        matchesType &&
        matchesRarity &&
        matchesPriceRange(entry, priceMin, priceMax)
      );
    });
  });

  /** Every set name present among entriesBeforeSetFilter, with how many matching cards each has - feeds the set-filter menu's own checkbox list, sorted by count (the sets actually worth filtering by show up first) then name. */
  protected readonly availableSets = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this.entriesBeforeSetFilter()) {
      const setName = entry.card.setName;
      if (!setName) continue;
      counts.set(setName, (counts.get(setName) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  protected readonly filteredEntries = computed(() => {
    const selectedSets = this.selectedSets();
    const entries = this.entriesBeforeSetFilter();
    const filtered =
      selectedSets.size === 0
        ? entries
        : entries.filter((entry) => entry.card.setName && selectedSets.has(entry.card.setName));
    return sortEntries(filtered, this.sort());
  });

  // Facet options come from the whole collection of the active game, so a
  // choice never disappears from the sheet just because another filter
  // currently hides all of its cards.
  protected readonly typeOptions = computed(() => getTypeOptions(this.entries(), this.gameService.currentSlug()));
  protected readonly rarityOptions = computed(() =>
    getRarityOptions(this.entries(), this.gameService.currentSlug()),
  );

  /** Copies and EUR value of what's currently shown. */
  protected readonly summary = computed(() => {
    let count = 0;
    let value = 0;
    for (const entry of this.filteredEntries()) {
      count += entry.row.quantity;
      value += (getUnitPrice(entry) ?? 0) * entry.row.quantity;
    }
    return { count, value };
  });

  /** Filters living in the sheet (the color chips stay on the page). */
  protected readonly sheetFilterCount = computed(
    () =>
      this.selectedTypes().size +
      this.selectedRarities().size +
      this.selectedSets().size +
      (this.priceMin() !== null || this.priceMax() !== null ? 1 : 0) +
      (this.showSurplusOnly() ? 1 : 0),
  );

  protected readonly activeChips = computed<ActiveFilterChip[]>(() => {
    const lang = this.translate.currentLang(); // also re-labels on a language switch
    const t = (key: string, params?: object) => this.translate.instant(key, params);
    const game = this.gameService.currentSlug();
    const chips: ActiveFilterChip[] = [];

    for (const option of this.typeOptions()) {
      if (this.selectedTypes().has(option.key)) {
        chips.push({ id: 'type:' + option.key, label: t(option.labelKey), remove: () => this.toggleType(option.key) });
      }
    }
    for (const rarity of this.selectedRarities()) {
      chips.push({ id: 'rarity:' + rarity, label: t(rarityLabelKey(game, rarity)), remove: () => this.toggleRarity(rarity) });
    }
    const min = this.priceMin();
    const max = this.priceMax();
    if (min !== null || max !== null) {
      const format = (value: number) => formatEuro(value, lang);
      const label =
        min !== null && max !== null
          ? `${format(min)} – ${format(max)}`
          : min !== null
            ? t('collection.priceChipMin', { value: format(min) })
            : t('collection.priceChipMax', { value: format(max!) });
      chips.push({ id: 'price', label, remove: () => this.clearPrice() });
    }
    for (const set of this.selectedSets()) {
      chips.push({ id: 'set:' + set, label: set, remove: () => this.toggleSet(set) });
    }
    if (this.showSurplusOnly()) {
      chips.push({ id: 'surplus', label: t('collection.surplusFilter'), remove: () => this.showSurplusOnly.set(false) });
    }
    return chips;
  });

  protected readonly manaCurve = computed<BarChartDatum[]>(() => getManaCurve(this.filteredEntries()));
  // Only matters on phones, where the chart starts collapsed behind a
  // disclosure button (desktop always shows it, see collection-overview.scss).
  protected readonly manaCurveExpanded = signal(false);
  // The disclosure button itself only renders below this width (see the
  // template) - above it, a focusable "expand" control that can't actually
  // change anything visible (desktop always shows the chart) is a dead
  // interactive element for keyboard/screen-reader users.
  protected readonly isMobileViewport = signal(this.computeIsMobileViewport());

  private computeIsMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  }

  @HostListener('window:resize')
  protected onWindowResize() {
    this.isMobileViewport.set(this.computeIsMobileViewport());
  }

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
      // Re-fetches card data on a card-display-language switch too (see
      // CardDisplayLanguageService/MtgApiService.translateCards) - the
      // already-loaded entries' card.name/imageUrl wouldn't otherwise update
      // until some unrelated reload happened to fire.
      this.cardDisplayLanguage.current();
      untracked(() => this.load());
    });

    // A new search/filter is a different result set - start over at the top
    // of it rather than keep whatever render count the previous one grew to.
    effect(() => {
      this.searchQuery();
      this.selectedCategory();
      this.selectedSets();
      this.showSurplusOnly();
      this.hideLands();
      this.selectedTypes();
      this.selectedRarities();
      this.priceMin();
      this.priceMax();
      this.sort();
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

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      clearTimeout(this.revealTimer);
    });
  }

  toggleCategory(key: string) {
    this.selectedCategory.set(this.selectedCategory() === key ? null : key);
  }

  protected toggleSet(name: string) {
    this.selectedSets.update((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  protected clearSets() {
    this.selectedSets.set(new Set());
  }

  protected toggleType(key: string) {
    this.selectedTypes.update((current) => toggled(current, key));
  }

  protected toggleRarity(key: string) {
    this.selectedRarities.update((current) => toggled(current, key));
  }

  /** Empty or unparsable input clears that bound; accepts "1,50" as well as "1.50". */
  protected setPriceBound(bound: 'min' | 'max', raw: string) {
    const value = parseFloat(raw.replace(',', '.'));
    const parsed = Number.isFinite(value) && value >= 0 ? value : null;
    (bound === 'min' ? this.priceMin : this.priceMax).set(parsed);
  }

  protected clearPrice() {
    this.priceMin.set(null);
    this.priceMax.set(null);
  }

  /** Clears everything in the sheet; the search and the color chips stay. */
  protected resetFilters() {
    this.selectedTypes.set(new Set());
    this.selectedRarities.set(new Set());
    this.selectedSets.set(new Set());
    this.clearPrice();
    this.showSurplusOnly.set(false);
    this.hideLands.set(false);
  }

  protected setSort(value: string) {
    const sort = value as CollectionSort;
    this.sort.set(sort);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sort);
    } catch {
      // Not remembering the choice is fine.
    }
  }

  protected onScanButtonClick(event: MouseEvent) {
    if (this.authService.isGuest()) {
      event.preventDefault();
      this.showDemoScanBlocked.set(true);
    }
  }

  // Edits refresh in place (no "Loading…" swap): the grid, scroll position
  // and any open filter stay put instead of the page blanking like a crash.
  protected onEntryDeleted() {
    this.load({ silent: true });
  }

  /** Keeps the still-open dialog showing the saved values too, not just the grid behind it - `entry` is a plain input bound to whatever object is in `selectedEntry`, which reloading `entries` alone wouldn't update in place. */
  protected async onEntryUpdated() {
    await this.load({ silent: true });
    const current = this.selectedEntry();
    if (!current) return;
    this.selectedEntry.set(this.entries().find((e) => e.row.id === current.row.id) ?? null);
  }

  protected async load({ silent = false } = {}) {
    if (!silent) {
      this.loading.set(true);
      this.errorMessage.set(null);
    }
    try {
      const [entries, allDecks] = await Promise.all([
        this.collectionService.getCollectionWithCardData(),
        this.deckService.getMyDecks(),
      ]);
      this.entries.set(entries);
      this.allDecks.set(allDecks);
      if (!silent) this.playArrivalReveal();
    } catch (error) {
      // A failed background refresh keeps the (slightly stale) grid; only a
      // real load replaces the page with the error.
      if (!silent) {
        this.errorMessage.set(
          error instanceof Error ? error.message : this.translate.instant('collection.loadError'),
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Lets the grid rise in once on arrival, then drops the class so filtering/searching/loading more never replays it. */
  private playArrivalReveal() {
    this.revealing.set(true);
    clearTimeout(this.revealTimer);
    this.revealTimer = setTimeout(() => this.revealing.set(false), 600);
  }
}

function toggled(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
