import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CARD_LANGUAGE_OPTIONS, DEFAULT_CARD_LANGUAGE } from '../../../core/constants/card-languages';
import { Card } from '../../../core/models/card.model';
import { GameService } from '../../../core/services/game.service';
import { PokemonApiService, PokemonSetOption } from '../../../core/services/pokemon-api.service';
import { yugiohPrintNumber } from '../../../core/services/yugioh-api.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AppDialog } from '../../../shared/dialog/dialog';
import { CollectionService } from '../collection.service';

const SEARCH_DEBOUNCE_MS = 300;
const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

// Torch isn't in TS's bundled MediaTrackCapabilities/-ConstraintSet types yet,
// though Chromium-based browsers on Android support it (same situation as
// scanner.ts's own FocusCapableTrackCapabilities).
interface TorchCapableTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}
interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

// Manual focus / points-of-interest aren't in TS's bundled DOM types either -
// same shape as scanner.ts's own copy of these (duplicated rather than
// shared since the two components don't otherwise depend on each other).
interface FocusCapableTrackCapabilities extends MediaTrackCapabilities {
  focusMode?: string[];
  // Real devices report their own min/max/step (e.g. 10-100), not a
  // normalized 0-1 range, so the slider bounds must come from here.
  focusDistance?: { min: number; max: number; step?: number };
}
interface FocusConstraintSet extends MediaTrackConstraintSet {
  focusMode?: string;
  focusDistance?: number;
  pointsOfInterest?: { x: number; y: number }[];
}
interface FocusRange {
  min: number;
  max: number;
  step: number;
}

/** One card staged for a batch add - see pendingItems' doc. */
interface PendingAddItem {
  tempId: number;
  card: Card;
  quantity: number;
  foil: boolean;
  condition: string;
  language: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-add-card-dialog',
  imports: [FormsModule, CardTile, TranslatePipe, AppDialog],
  templateUrl: './add-card-dialog.html',
  styleUrl: './add-card-dialog.scss',
})
export class AddCardDialog {
  protected readonly gameService = inject(GameService);
  private readonly pokemonApi = inject(PokemonApiService);
  private readonly collectionService = inject(CollectionService);
  private readonly translate = inject(TranslateService);
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  // Scoped per game, same as the collection itself - avoids a Yu-Gi-Oh!
  // draft reappearing while browsing MTG, or vice versa.
  private readonly pendingItemsStorageKey = `addCard.pendingItems.${this.gameService.currentSlug()}`;

  readonly close = output<void>();
  readonly added = output<void>();

  // Native HTML `autofocus` only fires once, on first paint - it doesn't
  // refocus the input after it's hidden/shown again by the @if in the
  // template (print-picker/detail-form <-> search), so returning to the
  // search view after staging a card needs an explicit focus() call.
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /**
   * Refocuses the search box after staging a card - but only on a device
   * whose primary pointer is a mouse/trackpad. Programmatically focusing a
   * text input on a touch device pops the on-screen keyboard open, which on
   * mobile/tablet eats a third of the viewport and shoves the just-updated
   * pending list and results grid out of view right after every single
   * card added - reported live (2026-11-03) as actively disruptive there,
   * not the convenience it is on desktop (where it just lets the next
   * search be typed immediately, no mouse click needed).
   */
  private focusSearchInputOnDesktop(): void {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    this.searchInput()?.nativeElement.focus();
  }

  // Plain live camera preview, no scanning/OCR - a loupe to read a physical
  // card's print code by eye (digital zoom + the device's own torch/flash),
  // next to the search box rather than instead of it. See the Scanner
  // feature (scanner.ts) for the actual OCR-driven camera flow.
  private readonly cameraVideo = viewChild<ElementRef<HTMLVideoElement>>('cameraVideo');
  private cameraStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  // Set by the destroy hook below, checked right after the (slow, user-
  // permission-gated) getUserMedia call resolves - a dialog closed while
  // that call was still pending used to leave its camera stream running
  // forever: the destroy hook ran first (cameraStream was still null, so it
  // had nothing to stop), and the stream that showed up afterward was never
  // stopped by anything. Found in review (ponytail-review, 2026-11-02).
  private destroyed = false;
  protected readonly cameraError = signal<string | null>(null);
  protected readonly torchSupported = signal(false);
  protected readonly torchOn = signal(false);
  protected readonly zoom = signal(MIN_ZOOM);
  protected readonly minZoom = MIN_ZOOM;
  protected readonly maxZoom = MAX_ZOOM;
  protected readonly zoomStep = ZOOM_STEP;
  protected readonly supportsManualFocus = signal(false);
  protected readonly focusRange = signal<FocusRange>({ min: 0, max: 1, step: 0.05 });
  protected readonly focusDistance = signal(0.5);

  constructor() {
    afterNextRender(() => void this.startCamera());
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.cameraStream?.getTracks().forEach((track) => track.stop());
    });

    if (this.gameService.currentSlug() === 'pokemon') {
      void this.pokemonApi.getSets().then((sets) => this.pokemonSets.set(sets));
    }
  }

  private async startCamera(): Promise<void> {
    const videoEl = this.cameraVideo()?.nativeElement;
    if (!videoEl) return;

    // Prefer a USB camera over built-in/virtual ones, same as the Scanner
    // feature (scanner.ts's startCamera) - typically much higher resolution,
    // and already the user's own setup for reading print codes. Labels are
    // only populated once permission has already been granted at least once
    // for this origin - if not, this just finds nothing and falls back to
    // the default (facingMode) camera below.
    let preferredDeviceId: string | null = null;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const usbCamera = devices.filter((d) => d.kind === 'videoinput').find((d) => d.label.toLowerCase().includes('usb'));
      preferredDeviceId = usbCamera?.deviceId ?? null;
    } catch {
      // enumerateDevices() failing just means no auto-preference - carry on.
    }
    if (this.destroyed) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
          facingMode: preferredDeviceId ? undefined : { ideal: 'environment' },
        },
        audio: false,
      });
    } catch (error) {
      this.cameraError.set(
        error instanceof DOMException && error.name === 'NotFoundError'
          ? this.translate.instant('addCard.cameraNoneFound')
          : this.translate.instant('addCard.cameraPermissionDenied'),
      );
      return;
    }

    // The dialog closed while getUserMedia was still waiting on the
    // browser's permission prompt - see destroyed's doc. Stop the stream
    // this call just opened instead of handing it to a dead component.
    if (this.destroyed) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    this.cameraStream = stream;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.srcObject = stream;
    await videoEl.play();

    this.cameraTrack = stream.getVideoTracks()[0] ?? null;
    try {
      const capabilities = this.cameraTrack?.getCapabilities?.() as
        | (TorchCapableTrackCapabilities & FocusCapableTrackCapabilities)
        | undefined;
      this.torchSupported.set(!!capabilities?.torch);

      // Manual focus is only supported on some Chromium-based browsers
      // (mainly Android Chrome/Edge) - show the slider only when the active
      // device actually advertises it, nothing/no error otherwise. Same
      // detection as scanner.ts's own startCamera.
      const supportsManual = !!capabilities?.focusMode?.includes('manual');
      this.supportsManualFocus.set(supportsManual);
      if (supportsManual && capabilities?.focusDistance) {
        const { min, max, step } = capabilities.focusDistance;
        this.focusRange.set({ min, max, step: step || (max - min) / 20 || 1 });
        this.focusDistance.set((min + max) / 2);
      }
    } catch {
      this.torchSupported.set(false);
      this.supportsManualFocus.set(false);
    }
  }

  protected async toggleTorch(): Promise<void> {
    if (!this.cameraTrack || !this.torchSupported()) return;
    const next = !this.torchOn();
    try {
      await this.cameraTrack.applyConstraints({ advanced: [{ torch: next } as TorchConstraintSet] });
      this.torchOn.set(next);
    } catch {
      // Device advertised torch support but rejected the constraint - not critical.
    }
  }

  protected onZoomChange(value: number): void {
    this.zoom.set(value);
  }

  protected async onFocusDistanceChange(value: number): Promise<void> {
    this.focusDistance.set(value);
    if (!this.cameraTrack) return;
    try {
      await this.cameraTrack.applyConstraints({
        advanced: [{ focusMode: 'manual', focusDistance: value } as FocusConstraintSet],
      });
    } catch {
      // Device advertised manual focus support but rejected the constraint - not critical.
    }
  }

  // Tap-to-focus: works on more devices than the manual slider, so it's
  // always wired up regardless of supportsManualFocus - browsers that don't
  // support pointsOfInterest just reject the constraint, silently ignored.
  // Same approach as scanner.ts's own onVideoTap.
  protected async onVideoTap(event: MouseEvent): Promise<void> {
    if (!this.cameraTrack) return;
    const target = event.currentTarget as HTMLVideoElement;
    if (!target.clientWidth || !target.clientHeight) return;

    const x = event.offsetX / target.clientWidth;
    const y = event.offsetY / target.clientHeight;
    try {
      await this.cameraTrack.applyConstraints({ advanced: [{ pointsOfInterest: [{ x, y }] } as FocusConstraintSet] });
    } catch {
      // Tap-to-focus isn't supported everywhere - fail silently, no error UI.
    }
  }

  protected readonly conditions = CONDITIONS;
  protected readonly languageOptions = CARD_LANGUAGE_OPTIONS;

  // MTG and Yu-Gi-Oh! search also accept typing an exact print/set code (see
  // MtgApiService.searchCards and YugiohApiService.searchCards) - Pokémon
  // still searches by name only, so its hint stays the plain one.
  protected readonly searchPlaceholderKey = computed(() => {
    const game = this.gameService.currentSlug();
    if (game === 'mtg') return 'addCard.searchPlaceholderMtg';
    if (game === 'yugioh') return 'addCard.searchPlaceholderYugioh';
    return 'addCard.searchPlaceholder';
  });

  protected readonly query = signal('');
  protected readonly results = signal<Card[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);

  // Pokémon-only: a prolific name (Pikachu alone has 200+ printings) can
  // easily push the one a person actually has past PokemonApiService's own
  // MAX_SEARCH_RESULTS cutoff, with no reliable way to sort it back within
  // reach (see searchCards' own doc) - this dropdown lets the search be
  // narrowed to one set server-side instead. Loaded once, lazily, only when
  // the dialog opens on the Pokémon game (see the constructor below) - MTG
  // and Yu-Gi-Oh! never need it.
  protected readonly pokemonSets = signal<PokemonSetOption[]>([]);
  protected readonly pokemonSetFilter = signal('');
  // A native <select> can't render an <option>'s icon in any
  // cross-browser-reliable way (confirmed: Chrome ignores background-image
  // on <option>) - requested live (2026-11-03) specifically because the
  // symbol is "offensichtlicher als der Name", i.e. the whole point is
  // showing it per row. This small listbox (button + panel, same
  // signal+click-outside pattern as UserMenu) replaces the native select
  // so each row can carry its icon.
  protected readonly pokemonSetFilterOpen = signal(false);
  protected readonly selectedPokemonSet = computed(
    () => this.pokemonSets().find((s) => s.id === this.pokemonSetFilter()) ?? null,
  );
  private readonly pokemonSetFilterEl = viewChild<ElementRef<HTMLElement>>('pokemonSetFilterEl');

  protected readonly selectedName = signal<string | null>(null);
  protected readonly prints = signal<Card[]>([]);
  protected readonly loadingPrints = signal(false);
  protected readonly printsError = signal<string | null>(null);

  protected readonly selectedCard = signal<Card | null>(null);
  protected readonly quantity = signal(1);
  protected readonly foil = signal(false);
  protected readonly condition = signal('NM');
  protected readonly language = signal(DEFAULT_CARD_LANGUAGE);

  // Cards staged via addToList() but not yet sent to Supabase - lets adding
  // several cards in a row stay in one dialog session instead of the
  // dialog closing (and the search having to restart from scratch) after
  // every single card, which is what submit() used to do unconditionally.
  // Flushed as one batch only by the explicit "Alle hinzufügen" button
  // (commitAll() via finishAndClose() - see its own doc on why this is
  // deliberately NOT tied to the dialog closing in general).
  //
  // Initialized from (and mirrored to on every mutation below - addToList(),
  // removePending(), commitAll(), clearPendingItems() all call
  // savePendingItems() directly) sessionStorage, not just an empty array: a
  // backgrounded/minimized tab getting discarded by the browser under
  // memory pressure and reloaded on return (live-reported for the camera
  // scanner, see its own doc on this exact behavior) wipes every in-memory
  // signal, this one included, with no app code involved at all - there's
  // no way to prevent that reload, only to make reopening this dialog
  // afterward not lose the list. A genuinely new tab/window starts with
  // nothing staged, which is the right scope for a draft nobody asked to
  // keep around forever.
  //
  // Deliberately NOT an effect() mirroring this signal - an effect only
  // flushes on the next change-detection tick, and commitAll() clearing
  // this signal is immediately followed by the dialog closing (see
  // finishAndClose()), which can destroy this component before that flush
  // ever runs - live-confirmed: sessionStorage kept holding the just-added
  // cards after a successful commit. Calling savePendingItems() straight
  // from the same synchronous block that mutates the signal has no such
  // race.
  protected readonly pendingItems = signal<PendingAddItem[]>(this.loadPendingItems());
  // What the header count shows - the total physical copies staged, not
  // pendingItems().length (the number of distinct rows). Adding a second
  // Dark Eruption on top of an already-staged one merges into the same row
  // with quantity 2 (see stageItem's dedup) rather than a new row, so the
  // row count alone silently stopped moving the moment that happened - the
  // whole point of the number is "how many cards am I about to add".
  protected readonly pendingCardCount = computed(() =>
    this.pendingItems().reduce((sum, item) => sum + item.quantity, 0),
  );
  protected readonly committing = signal(false);
  protected readonly commitError = signal<string | null>(null);
  private nextTempId = Math.max(-1, ...this.pendingItems().map((item) => item.tempId)) + 1;
  private readonly pendingItemsList = viewChild<ElementRef<HTMLUListElement>>('pendingItemsList');

  private debounceHandle: ReturnType<typeof setTimeout> | null = null;
  // Aborts the previous search's actual request (not just its result) when
  // a newer one starts - without this, a slow in-flight request from an
  // earlier keystroke can resolve after a later one and overwrite its
  // results with a stale/narrower match, and every uncancelled request left
  // running in the background adds to the load a fast typist throws at
  // Supabase at once.
  private abortController: AbortController | null = null;

  // The scroll position of the whole dialog (AppDialog's own .dialog-panel
  // scrolls, not results-grid - see dialog.scss) right before leaving the
  // search results for the print-picker/detail-form views. Those views are
  // usually shorter than a full results-grid, so the browser clamps
  // scrollTop down to fit while they're shown; restoring the saved value in
  // backToSearch() undoes that clamp instead of leaving the list stuck at
  // the top after every single card added while browsing a set.
  private savedScrollTop = 0;

  // .dialog-panel lives in AppDialog's OWN template (dialog.html), with this
  // component's whole template projected into it via <ng-content /> - from
  // this component's host element, that makes it a descendant, not an
  // ancestor, so closest() (which only walks upward) would never find it.
  // querySelector() searches the subtree instead, which does.
  private getScrollContainer(): HTMLElement | null {
    return this.hostEl.nativeElement.querySelector('.dialog-panel');
  }

  onQueryChange(value: string) {
    this.query.set(value);

    if (this.debounceHandle) clearTimeout(this.debounceHandle);

    const trimmed = value.trim();
    if (!trimmed) {
      this.abortController?.abort();
      this.results.set([]);
      this.searching.set(false);
      return;
    }

    this.searching.set(true);
    this.debounceHandle = setTimeout(() => this.search(trimmed), SEARCH_DEBOUNCE_MS);
  }

  protected retrySearch() {
    const trimmed = this.query().trim();
    if (!trimmed) return;
    this.searching.set(true);
    void this.search(trimmed);
  }

  protected togglePokemonSetFilter(): void {
    this.pokemonSetFilterOpen.update((v) => !v);
  }

  /** Re-runs the current search as soon as the Pokémon set filter changes, same as every keystroke already does - without this, picking a set would silently do nothing until the next character typed. */
  protected selectPokemonSet(setId: string): void {
    this.pokemonSetFilter.set(setId);
    this.pokemonSetFilterOpen.set(false);
    const trimmed = this.query().trim();
    if (!trimmed) return;
    this.searching.set(true);
    void this.search(trimmed);
  }

  // Click-outside-to-close, same dependency-free pattern as UserMenu.
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.pokemonSetFilterOpen()) return;
    const el = this.pokemonSetFilterEl()?.nativeElement;
    if (el && !el.contains(event.target as Node)) this.pokemonSetFilterOpen.set(false);
  }

  private async search(query: string) {
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;

    this.searchError.set(null);
    try {
      // Pokémon's set filter needs PokemonApiService's own extra `setId`
      // param (see its searchCards doc) - GameService.cardApi() only ever
      // types the shared CardApiService signature, so this reaches past it
      // the same way cardNumber()/selectCard() already branch per game.
      const results =
        this.gameService.currentSlug() === 'pokemon'
          ? await this.pokemonApi.searchCards(query, controller.signal, this.pokemonSetFilter() || undefined)
          : await this.gameService.cardApi().searchCards(query, controller.signal);
      if (controller.signal.aborted) return; // a newer search already took over
      this.results.set(results);
    } catch (error) {
      if (controller.signal.aborted) return;
      // The raw error (often a backend message) is for the console; the user
      // gets a plain sentence plus a retry button (see the template).
      console.error('Card search failed', error);
      this.searchError.set(this.translate.instant('addCard.searchFailed'));
    } finally {
      if (!controller.signal.aborted) this.searching.set(false);
    }
  }

  /** Normal name search still goes through selectName()'s "pick a print" step. A search that already landed on one specific print - an exact set code (MTG, e.g. "emn"), a bare set prefix (Yu-Gi-Oh!, e.g. "AMDE"), an exact print code (Yu-Gi-Oh!, e.g. "LOB-DE001"), or any Pokémon result at all - instead stages that card straight away (quickAdd: 1x, non-foil, NM, default language) without opening the quantity/foil/condition/language form or leaving the results grid at all. Browsing a whole set this way is a click-through-the-grid flow (see cardNumber's doc) - stopping to confirm defaults nobody asked to change, and losing the scroll position/staying card to a form round trip, on every single card defeated that; anything other than the default (a second copy, foil, a non-NM condition) still goes through the normal form, by searching the card's name instead. A Yu-Gi-Oh! result only ever carries a resolved printCode when it came from one of those two direct-hit searches (see YugiohApiService.searchCards) - the plain name search always returns printCode: null - so checking that field alone covers both cases without needing to re-parse the query here. MTG has no searchCards() path that resolves to one exact print from the search box the same way (getCardBySetAndNumber exists but isn't wired to it - see deck-import-dialog.ts/scanner.ts for its actual callers), so its own direct-hit case is set-code-only. Pokémon's own searchCards() never groups by name the way MTG/Yu-Gi-Oh! do (TCGdex's search already returns one entry per printing, see PokemonApiService) - every result there is already one exact print, so it's unconditionally a direct hit, requested live (2026-11-03) to match Yu-Gi-Oh!'s one-click add rather than opening a form at all. */
  protected selectCard(card: Card): void {
    const trimmed = this.query().trim();
    const isDirectHit =
      (card.game === 'mtg' && card.setCode.toLowerCase() === trimmed.toLowerCase()) ||
      (card.game === 'yugioh' && card.printCode != null) ||
      card.game === 'pokemon';
    if (isDirectHit) {
      this.quickAdd(card);
      return;
    }

    this.savedScrollTop = this.getScrollContainer()?.scrollTop ?? 0;
    void this.selectName(card);
  }

  /** Stages one copy (no foil, NM, default language) straight from any direct-hit search result (an exact print code, or a set/prefix browse - see selectCard's doc) without opening the quantity/foil/condition/language form or leaving the results grid. Deliberately leaves the search query/results as they are instead of clearing them - the code is still what's typed in the box either way, and clearing it only costs an extra retype for anyone re-checking or correcting the same code, or re-finding the same set while clicking through it card by card. Anything other than the default (a second copy, foil, a non-NM condition) still goes through the normal form by searching the card's name instead of its print code. */
  private quickAdd(card: Card): void {
    this.stageItem(card, 1, false, 'NM', DEFAULT_CARD_LANGUAGE);
    this.focusSearchInputOnDesktop();
  }

  /** The number printed on the card itself, for scanning a browsed set quickly (e.g. typing "DABL" lists every card with its number, instead of just name/art) - MTG's own collectorNumber, or (Yu-Gi-Oh!, only once a specific printing is known - see selectCard's doc on printCode) the number portion of printCode. Null for a Yu-Gi-Oh! result with no resolved printing yet (a plain name search), where there's no one specific number to show. */
  protected cardNumber(card: Card): string | null {
    if (card.game === 'mtg') return card.collectorNumber;
    if (card.game === 'yugioh' && card.printCode) return yugiohPrintNumber(card.printCode);
    // Pokémon has no on-card set symbol/code to go by (see PokemonCard's
    // own doc comment) - the printed "X/Y" number is the only thing left
    // that lets someone match the physical card in hand against a list of
    // same-named prints without having memorized every set's symbol.
    if (card.game === 'pokemon' && card.localId) {
      return card.setTotal ? `${card.localId}/${card.setTotal}` : card.localId;
    }
    return null;
  }

  async selectName(card: Card) {
    this.selectedName.set(card.name);
    this.loadingPrints.set(true);
    this.printsError.set(null);
    try {
      this.prints.set(await this.gameService.cardApi().getPrints(card.name));
    } catch (error) {
      this.printsError.set(
        error instanceof Error ? error.message : this.translate.instant('addCard.printsFailed'),
      );
    } finally {
      this.loadingPrints.set(false);
    }
  }

  backToSearch() {
    this.selectedName.set(null);
    this.prints.set([]);
    this.selectedCard.set(null);

    // Runs once the search view (and its full-height results-grid) is back
    // in the DOM - restoring scrollTop any earlier, while the shorter
    // print-picker/detail-form markup is still what's rendered, would just
    // get clamped back down again (see savedScrollTop's doc).
    afterNextRender(
      () => {
        const container = this.getScrollContainer();
        if (container) container.scrollTop = this.savedScrollTop;
        this.focusSearchInputOnDesktop();
      },
      { injector: this.injector },
    );
  }

  selectPrint(card: Card) {
    this.selectedCard.set(card);
    this.quantity.set(1);
    this.foil.set(false);
    this.condition.set('NM');
    this.language.set(DEFAULT_CARD_LANGUAGE);
  }

  backToPrints() {
    this.selectedCard.set(null);
  }

  /** Stages the configured card/quantity/foil/condition/language instead of sending it to Supabase right away, then goes back to the search results (same query, same results - see backToSearch()) so another card from the same search can be added right after, without retyping it - see pendingItems' doc. */
  protected addToList(): void {
    const card = this.selectedCard();
    if (!card) return;

    this.stageItem(card, this.quantity(), this.foil(), this.condition(), this.language());
    this.backToSearch();
  }

  /** Shared by addToList() (the configured form) and quickAdd() (the print-code shortcut) - both just stage different quantity/foil/condition/language values under the same dedup-and-merge rule. */
  private stageItem(card: Card, quantity: number, foil: boolean, condition: string, language: string): void {
    const key = this.pendingKey(card, foil, language);
    let appended = false;

    this.pendingItems.update((items) => {
      const index = items.findIndex((item) => this.pendingKey(item.card, item.foil, item.language) === key);
      if (index === -1) {
        appended = true;
        return [...items, { tempId: this.nextTempId++, card, quantity, foil, condition, language }];
      }
      // Same dedup key CollectionService.upsertOne() would merge into one
      // row anyway (card/foil/language/Yu-Gi-Oh!-print - see
      // AddCardInput.setCode's doc) - merging here too avoids both a
      // confusing duplicate-looking list entry and a race between two
      // concurrent inserts for the same not-yet-existing row in
      // commitAll()'s Promise.all (see CollectionService.addCards).
      const merged = [...items];
      merged[index] = { ...merged[index], quantity: merged[index].quantity + quantity };
      return merged;
    });
    this.savePendingItems(this.pendingItems());

    // Only when truly new - a newly staged card is appended at the end, so
    // scrolling the (now capped-height, see .pending-items) list to the
    // bottom keeps it in view instead of it silently landing below the
    // fold. A merge (a second copy of an already-staged card) leaves its
    // row exactly where it already was (see above) - scrolling to the
    // bottom here too used to yank the view away from that row toward
    // whatever happened to be last instead (found in review, 2026-11-02).
    // afterNextRender since the list (and, for the very first staged item,
    // its whole container - @if (pendingItems().length > 0)) must already
    // reflect this update in the DOM before scrollHeight means anything.
    if (appended) {
      afterNextRender(
        () => {
          const el = this.pendingItemsList()?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        },
        { injector: this.injector },
      );
    }
  }

  protected removePending(tempId: number): void {
    this.pendingItems.update((items) => items.filter((item) => item.tempId !== tempId));
    this.savePendingItems(this.pendingItems());
  }

  /** Discards every staged card without sending any of it to Supabase - the "start over" counterpart to commitAll(). */
  protected clearPendingItems(): void {
    this.pendingItems.set([]);
    this.savePendingItems([]);
  }

  private pendingKey(card: Card, foil: boolean, language: string): string {
    const setCode = card.game === 'yugioh' ? card.printCode : null;
    return `${card.id}|${foil}|${language}|${setCode ?? ''}`;
  }

  private loadPendingItems(): PendingAddItem[] {
    try {
      const raw = sessionStorage.getItem(this.pendingItemsStorageKey);
      return raw ? (JSON.parse(raw) as PendingAddItem[]) : [];
    } catch {
      return [];
    }
  }

  /** sessionStorage can throw (private browsing, quota, disabled storage) - losing the persisted draft is harmless, the in-memory list still works for the rest of this session either way. */
  private savePendingItems(items: PendingAddItem[]): void {
    try {
      if (items.length === 0) {
        sessionStorage.removeItem(this.pendingItemsStorageKey);
      } else {
        sessionStorage.setItem(this.pendingItemsStorageKey, JSON.stringify(items));
      }
    } catch {
      // See doc above - nothing to recover from here.
    }
  }

  /** Sends every staged item to Supabase as one batch. Returns whether every item succeeded, so finishAndClose() knows whether it's safe to actually close. */
  protected async commitAll(): Promise<boolean> {
    const items = this.pendingItems();
    if (items.length === 0) return true;
    // Guards against a double-click/double-Enter sending the same batch
    // twice before [disabled]="committing()" has actually re-rendered -
    // not just a defensive nicety, the whole point of upsertOne() merging
    // by dedup key means a second identical commit wouldn't error, it'd
    // silently double every quantity (see finishAndClose's doc).
    if (this.committing()) return false;

    this.committing.set(true);
    this.commitError.set(null);
    try {
      const outcomes = await this.collectionService.addCards(
        items.map((item) => ({
          cardId: item.card.id,
          quantity: item.quantity,
          foil: item.foil,
          condition: item.condition,
          language: item.language,
          oracleId: item.card.oracleId,
          // The specific printing picked in the "Druck wählen" step
          // (Yu-Gi-Oh! only - see YugiohApiService.getPrints) - persisted
          // so this exact print's set/rarity survives the collection being
          // re-read later (see 040_collection_set_code.sql).
          setCode: item.card.game === 'yugioh' ? item.card.printCode : null,
        })),
      );

      // outcomes is in the same order as items (see CollectionService.
      // addCards) - keeping only the cards that actually failed staged, not
      // the whole batch, means a retry re-sends just those instead of
      // adding a second copy of everything that already went through. A
      // plain Promise.all used to make this all-or-nothing: one flaky card
      // failed the whole batch while the others had already been written,
      // and "try again" doubled every one of those.
      const stillPending = items.filter((_, index) => outcomes[index].status === 'rejected');
      this.pendingItems.set(stillPending);
      this.savePendingItems(stillPending);

      if (stillPending.length > 0) {
        this.commitError.set(this.translate.instant('addCard.addAllFailed'));
        // Some cards did make it in even though this report counts as a
        // failure overall - the collection view behind the dialog still
        // needs to reflect them.
        if (stillPending.length < items.length) this.added.emit();
        return false;
      }

      this.added.emit();
      return true;
    } catch (error) {
      // addCards() itself only throws for something outside any one card's
      // own upsert (not logged in, no active game) - every item is still
      // staged in that case, nothing here to filter out.
      this.commitError.set(
        error instanceof Error ? error.message : this.translate.instant('addCard.addAllFailed'),
      );
      return false;
    } finally {
      this.committing.set(false);
    }
  }

  /**
   * Bound only to the explicit "Alle hinzufügen" button, NOT to the
   * dialog's own closeRequest (header ✕/Escape/backdrop just emit close
   * directly - see the template) - closing the dialog any other way only
   * hides it, leaving the staged list exactly as it is (still mirrored in
   * sessionStorage, restored the next time the dialog opens - see
   * pendingItems' doc). Committing used to run on every close, which
   * combined with a since-fixed sessionStorage flush race (see
   * pendingItems' doc) silently re-sent an already-added batch and doubled
   * quantities in the collection - live-reported, not hypothetical. Tying
   * the actual network call to one explicit button only, instead of to
   * "the dialog is going away" in general, removes that whole class of
   * accidental-resubmit bug rather than just patching the one race that
   * triggered it this time.
   */
  protected async finishAndClose(): Promise<void> {
    if (await this.commitAll()) this.close.emit();
  }
}
