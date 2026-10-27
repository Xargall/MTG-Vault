import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { DEFAULT_CARD_LANGUAGE, PRINTED_LANGUAGE_CODES } from '../../core/constants/card-languages';
import { Card } from '../../core/models/card.model';
import { CardIdentification, ScoredCandidate } from '../../core/services/card-api.interface';
import { AddCardResult, CollectionService } from '../collection/collection.service';
import { GameService } from '../../core/services/game.service';
import { GeminiVisionService } from '../../core/services/gemini-vision.service';
import { CardCategory, MtgApiService } from '../../core/services/mtg-api.service';
import { MtgBulkDataService } from '../../core/services/mtg-bulk-data.service';
import { UserSecretsService } from '../../core/services/user-secrets.service';
import { YUGIOH_PRINT_CODE_PATTERN, YugiohApiService } from '../../core/services/yugioh-api.service';
import { CollectorFinish } from '../../core/utils/set-code-parser';
import { CardTile } from '../../shared/cards/card-tile/card-tile';

const MIN_CAPTURE_GAP_MS = 300;
// Paced against GeminiVisionService's own ~10s retry interval - every 3rd
// consecutive overloaded attempt is roughly every 30s, frequent enough to
// reassure during a sustained Gemini outage without repeating on every
// single retry.
const OVERLOADED_REMINDER_INTERVAL = 3;
// Caps the merged candidate list when a print-code miss resolves to a tie
// between multiple equally-close sets (see findSimilarSetPrefixes' doc) -
// each tied set can contribute its own close matches, so this keeps the
// picker from growing unbounded with more tied sets.
const FUZZY_PRINT_CODE_PICKER_LIMIT = 5;
// Was its own, slightly-differently-bounded copy of
// yugioh-api.service.ts's exported YUGIOH_PRINT_CODE_PATTERN - now imported
// from there instead so the two can't drift out of sync again (exactly
// what happened: both independently assumed "2 letters then only digits"
// after the dash, missing a multi-deck product's sub-deck-letter codes like
// "LEHD-DEB32" - see that constant's own doc).
// Allows (but doesn't require) a sub-deck letter between the language code
// and the digits (e.g. "LEHD-DEB32" = DE + sub-deck B + 32) - see
// YUGIOH_PRINT_CODE_PATTERN's doc for why plain `[A-Z]{2}\d` isn't enough.
// Also allows the language itself to be a single letter, for a pre-2004
// print's legacy region tag (e.g. "LOB-G082" - see PRINTED_LANGUAGE_CODES'
// doc). The 2-letter alternative is listed first so it wins whenever both
// letters are actually there (matches toEnglishPrintCode's own precedence).
// Captures only the language itself, not a trailing sub-deck letter. A
// pre-2004 promo with no language segment at all ("DL1-001") or a token
// card's "TKN" suffix both simply fail to match here, same as an
// unreadable OCR result would - falling back to the default language below.
const YUGIOH_PRINT_CODE_LANGUAGE_PATTERN = /-([A-Z]{2}|[A-Z])[A-Z]*\d/;

/** Extracts the language segment already embedded in a Yu-Gi-Oh print code (e.g. "SDAZ-DE001" -> 'de') - unlike MTG, no separate OCR read is needed, it's part of the same code the card is identified by. Falls back to the default (English) for an unrecognized segment rather than failing the whole identification over it. */
function extractYugiohLanguage(printCode: string): string {
  const token = YUGIOH_PRINT_CODE_LANGUAGE_PATTERN.exec(printCode)?.[1];
  return (token && PRINTED_LANGUAGE_CODES[token]) || DEFAULT_CARD_LANGUAGE;
}

/** The specific printing's set_code to persist on the collection row (see 040_collection_set_code.sql) - null for every game but Yu-Gi-Oh!, and null even there when the resolved Card never carried one (e.g. a plain name-search result, not a scan/exact-code match). */
function setCodeOf(card: Card): string | null {
  return card.game === 'yugioh' ? card.printCode : null;
}

/**
 * Percentile-clipped linear contrast stretch (a "levels"/auto-contrast
 * adjustment), applied in place to a crop's own pixel data. Does NOT
 * greyscale or binarize - it keeps full color, just remaps the crop's own
 * (often compressed) luminance range to span the full 0-255 - so Gemini
 * still gets a color image, but one where e.g. black print-code text on a
 * dark blue card frame (near-identical luminance, easy to read for a human
 * who sees the hue difference, hard for a compressed/downsampled photo) is
 * pulled apart instead of crushed together. Clipping to the 1st/99th
 * percentile (rather than the crop's literal min/max) keeps a single stray
 * bright/dark pixel from skewing the whole remap.
 */
function applyContrastStretch(data: Uint8ClampedArray): void {
  const pixelCount = data.length / 4;
  if (pixelCount === 0) return;

  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[luminance]++;
  }

  const clipCount = pixelCount * 0.01;
  let low = 0;
  let cumulative = 0;
  for (; low < 255; low++) {
    cumulative += histogram[low];
    if (cumulative >= clipCount) break;
  }
  let high = 255;
  cumulative = 0;
  for (; high > 0; high--) {
    cumulative += histogram[high];
    if (cumulative >= clipCount) break;
  }
  // Crop is already near-flat (blank/solid) - stretching further would just
  // amplify noise, not reveal text that isn't there.
  if (high <= low) return;

  const scale = 255 / (high - low);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, (data[i] - low) * scale));
    data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - low) * scale));
    data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - low) * scale));
  }
}

/**
 * Gemini's own crop for its collector-number guess - wide enough that a
 * vision model reads it fine without needing a tight, precise frame.
 * Contrast-stretched (see applyContrastStretch) but kept in color.
 *
 * MTG only: its collector number/set code reliably sits bottom-left AND the
 * card is framed to fill most of the camera view, so "bottom-left corner of
 * the frame" is a safe proxy for "bottom-left corner of the card".
 *
 * Yu-Gi-Oh! used to get the same treatment (first widened to full width,
 * since its print code can also sit bottom-right) but that whole premise -
 * "the card fills the frame, so a frame-relative crop finds the right part
 * of the card" - turned out to not hold at all: confirmed live (2026-10-23,
 * real German cards against a desk-mounted USB camera) that the card only
 * fills the upper ~40% of the frame, with the rest empty table - so "bottom
 * 25% of the frame" landed entirely off the card, every time, regardless of
 * where the code actually sits on the card itself. On top of that, the code
 * turned out to sit right below the artwork (above the "[Type/Effekt]"
 * line), not at the card's bottom edge at all - that's the passcode/edition
 * footer instead. Two independent wrong position guesses is the signal that
 * guessing a position here doesn't generalize - see stretchFullFrame below,
 * used for Yu-Gi-Oh! instead.
 */
function cropCollectorArea(source: HTMLCanvasElement): HTMLCanvasElement {
  const crop = document.createElement('canvas');
  // 20%→25%: overlay UI elements sitting low on the viewport can clip into
  // this corner on real devices, cutting the collector number out of the
  // captured frame before it ever reached Gemini - widened to give it room.
  const h = Math.floor(source.height * 0.25);
  const y = source.height - h;
  // Kept narrower than full width since MTG's code is reliably bottom-left.
  const widthFraction = 0.65;
  crop.width = Math.floor(source.width * widthFraction);
  crop.height = h;
  const ctx = crop.getContext('2d');
  if (!ctx) return crop;

  ctx.drawImage(source, 0, y, crop.width, h, 0, 0, crop.width, h);
  const imageData = ctx.getImageData(0, 0, crop.width, h);
  applyContrastStretch(imageData.data);
  ctx.putImageData(imageData, 0, 0);
  return crop;
}

/**
 * Yu-Gi-Oh!'s Gemini input: the full frame, contrast-stretched in place but
 * otherwise uncropped - see cropCollectorArea's doc for why a guessed crop
 * region doesn't work here (the card's position within the frame isn't
 * fixed, and neither is the code's position on the card). Lets Gemini
 * itself find the card and its code anywhere in the shot instead - same
 * reasoning Pokémon's path already relies on (full frame, no crop), just
 * with the contrast stretch MTG's crop also gets, kept for the low-contrast
 * dark-on-dark print code on some card frames (e.g. Link Monsters' navy
 * border).
 */
function stretchFullFrame(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  applyContrastStretch(imageData.data);
  ctx.putImageData(imageData, 0, 0);
  return out;
}

const SUCCESS_TOAST_DURATION_MS = 3000;
const FAILURE_TOAST_DURATION_MS = 2000;
// Just long enough that "added" doesn't feel like an instant UI flash -
// not a "let the user read the confirmation" delay, since the toast (its
// own SUCCESS_TOAST_DURATION_MS) and the top-left undo thumbnail both keep
// that confirmation visible well after scanning has already resumed.
const AUTO_RESUME_DELAY_MS = 400;
const LIMIT_TOAST_DURATION_MS = 6000;

// How long a matched card sits in the panel before it's added automatically -
// long enough to glance at the result and tap "keep scanning" if it's wrong,
// short enough to keep a stack of cards moving (this plus AUTO_RESUME_DELAY_MS
// is dead time on every single card, so it's worth keeping tight - the
// top-left undo thumbnail is the real safety net once scanning has already
// moved on). Kept in sync with the .auto-add-progress animation duration in
// scanner.scss (no shared source of truth between TS and CSS here, so the
// two must be updated together).
const AUTO_ADD_DELAY_MS = 3000;

// Gate that decides when the automatic loop is even allowed to spend a
// (rate-limited) Gemini call - firing on every tick regardless of what's in
// frame would burn through the shared quota on hands, table, or a card
// mid-swap. A downsampled grayscale frame is compared tick-to-tick: low
// diff means the camera image has stopped changing (a card just got placed
// and held still, not swapped/moved), and high variance means there's
// actually something detailed in view rather than a blank surface. Gemini
// only fires once both hold for a few consecutive ticks.
const GATE_SAMPLE_SIZE = 32;
const GATE_STABILITY_THRESHOLD = 6;
const GATE_MIN_VARIANCE = 350;
const GATE_STABLE_TICKS_REQUIRED = 3;
// Live-reported (2026-10-26): hasContent/isStable alone fire on a stable,
// detailed but empty scene too (patterned desk, hands at rest, clutter) -
// neither signal knows "that's just the background", only "something is
// there and it stopped moving". GATE_MIN_DIFF_FROM_BACKGROUND adds a third
// check against a running estimate of what the empty scene actually looks
// like (see backgroundEstimate) - same 0-255-per-pixel scale as
// GATE_STABILITY_THRESHOLD, just a much higher bar, since introducing an
// actual card is expected to change far more of the frame than ordinary
// camera noise does. A starting estimate, not something tuned against a
// real camera - may need adjusting once tried live.
const GATE_MIN_DIFF_FROM_BACKGROUND = 30;
// Live-reported (2026-10-27): unlike MTG (card fills most of the frame),
// the user's own Yu-Gi-Oh! scanning technique only ever pushes PART of the
// card into view (usually just the bottom edge carrying the print code,
// since that crops tighter for Gemini - see stretchFullFrame's doc). That
// changes only a fraction of the 32x32 gate sample, so the frame-WIDE
// average GATE_MIN_VARIANCE/GATE_MIN_DIFF_FROM_BACKGROUND above - tuned
// assuming a full card - rarely clears the bar, diluted by the untouched
// rest of the frame; worse, with looksNew staying false, the background
// estimate below slowly adapts the held card corner INTO the background
// instead, making it fire even less over time. Lowered specifically for
// Yu-Gi-Oh! rather than loosened globally - MTG's full-card framing has no
// such dilution problem, and a global loosening would just make its own
// gate fire more readily on hands/clutter too. First-pass estimates (~60%/
// ~40% of the full-card values), not live-tested yet - may need further
// tuning once tried against a real camera.
const GATE_MIN_VARIANCE_YUGIOH = 200;
const GATE_MIN_DIFF_FROM_BACKGROUND_YUGIOH = 12;
// How fast the background estimate drifts toward the current frame while
// adapting (see adaptBackgroundEstimate) - low on purpose, so it tracks
// slow changes (the camera's own auto-exposure/white-balance settling, the
// desk itself) without being fooled by one single unusual-looking tick.
const BACKGROUND_ADAPT_RATE = 0.08;

type ScannerStatus = 'starting' | 'scanning' | 'matched' | 'choosing' | 'confirmingSet' | 'error';
type ScannerToast = { title?: string; message: string; variant: 'success' | 'warning' };

// Manual focus / points-of-interest aren't in TS's bundled DOM types yet,
// though Chromium-based browsers on Android support them.
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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-scanner',
  imports: [FormsModule, RouterLink, CardTile, TranslatePipe, DecimalPipe],
  templateUrl: './scanner.html',
  styleUrl: './scanner.scss',
})
export class Scanner {
  protected readonly gameService = inject(GameService);
  private readonly mtgApi = inject(MtgApiService);
  private readonly yugiohApi = inject(YugiohApiService);
  protected readonly bulkData = inject(MtgBulkDataService);
  private readonly collectionService = inject(CollectionService);
  private readonly geminiVision = inject(GeminiVisionService);
  private readonly userSecrets = inject(UserSecretsService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly rawFrameCanvas = document.createElement('canvas');
  private readonly gateCanvas = document.createElement('canvas');
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoResumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoAddTimeout: ReturnType<typeof setTimeout> | null = null;
  private isScanning = false;
  // Tick-to-tick baseline for the Gemini trigger gate (see GATE_* constants
  // above) - reset whenever the frame stream restarts (camera switch) or a
  // card finishes its cycle (keepScanning), so a stale comparison from
  // before never leaks into the next card's stability check.
  private lastGateSample: Uint8ClampedArray | null = null;
  private gateStableTicks = 0;
  // Running per-pixel estimate (red-channel values, same indexing as
  // sampleGateFrame) of what the scene looks like with no card in it - see
  // GATE_MIN_DIFF_FROM_BACKGROUND's doc. Reset alongside lastGateSample so
  // it never carries a stale lighting/background guess into the next card.
  private backgroundEstimate: Float32Array | null = null;
  private geminiInFlight = false;

  protected readonly status = signal<ScannerStatus>('starting');
  protected readonly cameraErrorMessage = signal<string | null>(null);
  protected readonly toast = signal<ScannerToast | null>(null);
  protected readonly availableCameras = signal<MediaDeviceInfo[]>([]);
  protected readonly selectedDeviceId = signal<string | null>(null);
  protected readonly supportsManualFocus = signal(false);
  protected readonly focusRange = signal<FocusRange>({ min: 0, max: 1, step: 0.05 });
  protected readonly focusDistance = signal(0.5);

  // Drives the small "🤖 Gemini" / "⚠️ Limit" indicator; null while nothing
  // has read yet.
  protected readonly ocrEngine = signal<'gemini' | 'limit' | null>(null);
  // Live elapsed time (seconds) for the *current* in-flight Gemini call -
  // null while nothing is in flight. Live-requested (2026-10-26): a 504
  // gateway timeout can take the edge function's full 25s budget to surface,
  // and with no feedback at all during that wait it's indistinguishable from
  // the scanner just being stuck. Resets on every new attempt rather than
  // accumulating across retries - the question is "is *this* attempt taking
  // unusually long", not a running total.
  protected readonly geminiElapsedSeconds = signal<number | null>(null);
  private geminiElapsedTimer: ReturnType<typeof setInterval> | null = null;
  // Gates the automatic Gemini path (see updateGeminiGate) and drives the
  // "set up your own key" hint - null (not checked yet) fails open, so a
  // flaky/unmigrated status check never silently disables a working feature.
  protected readonly hasGeminiKey = this.userSecrets.hasGeminiKey;
  // Gemini's 429 is shown to the user only the first time per session -
  // it's already handled gracefully (falls back silently otherwise), so
  // repeating the same explanation every subsequent hit would just be noise.
  private limitWarningShown = false;
  // Unlike limitWarningShown/geminiErrorShown below, this isn't shown just
  // once per session - a transient Gemini 503/504 (see
  // GeminiVisionService.overloaded) does resolve itself via the gate's own
  // retry (paced ~10s apart, see GeminiVisionService.MIN_CALL_INTERVAL_MS),
  // but a real outage can run well past a single retry. A one-time toast
  // then reads as "it gave up", even though it's still quietly retrying
  // underneath - live-confirmed confusing (2026-10-26: toast appeared once,
  // card still never got added, user had no way to tell it was still
  // trying). Reminded again every OVERLOADED_REMINDER_INTERVAL consecutive
  // overloaded attempt instead, reset the moment any attempt comes back
  // with a different outcome.
  private consecutiveOverloadedCount = 0;
  // A real Gemini/edge-function failure (bad key, 500, timeout - anything
  // other than "no card in frame") is shown once per session too - it would
  // otherwise repeat every retry (see GeminiVisionService's own pacing) and
  // look identical to a plain miss, which is exactly what made this
  // undiagnosable on a device without a hooked-up console.
  private geminiErrorShown = false;
  protected readonly detectedCard = signal<Card | null>(null);
  // Drives the match panel's countdown progress bar - true from the moment
  // a card is matched until it's added (auto or manual) or skipped.
  protected readonly autoAddArmed = signal(false);
  // Set alongside detectedCard whenever the gate-triggered Gemini scan
  // resolved an MTG card - stays at the defaults for every other path
  // (picker selection, Yu-Gi-Oh, Pokémon), since only MTG's collector-number
  // corner carries a token/halo flag to read.
  protected readonly detectedFinish = signal<CollectorFinish>('nonfoil');
  protected readonly detectedCardCategory = signal<CardCategory>('normal');
  // Same lifecycle as detectedFinish/detectedCardCategory above - the
  // printed-language abbreviation read off the same crop (MTG) or embedded
  // in the same print code (Yu-Gi-Oh), defaulting to English for every
  // other path (picker selection, Pokémon, which has no such code to read).
  protected readonly detectedLanguage = signal(DEFAULT_CARD_LANGUAGE);
  protected readonly candidateChoices = signal<ScoredCandidate[] | null>(null);
  // Which heading/copy the picker shows - 'medium' (5 options, fairly
  // confident guess) vs 'low' (10 options, weak signal). Derived from how
  // many runners MtgApiService already decided to include, not recomputed
  // from a duplicated threshold here. 'printCodeGuess' is Yu-Gi-Oh!-only:
  // the scanned code matched no real card at all, these are the closest
  // *real* codes found instead (see YugiohApiService.findSimilarPrintCodes).
  protected readonly pickerTier = signal<'medium' | 'low' | 'printCodeGuess'>('medium');
  // Keyed by ScoredCandidate.oracleId (= Card.id for Yu-Gi-Oh!, which has no
  // separate oracle concept) - only populated for the printCodeGuess picker,
  // so selectCandidate can store the *matched* code's printed language
  // rather than the (likely wrong) language read off the misread original.
  private readonly pendingPrintCodeLanguages = new Map<string, string>();
  // Drives the lightweight "meintest du Set X?" confirmation (status
  // 'confirmingSet') - the first of the two-step fallback's two stages, see
  // findSimilarSetPrefix's doc. Null outside that state.
  protected readonly pendingSetGuess = signal<{ prefix: string; setName: string | null; fullCode: string } | null>(
    null,
  );
  protected readonly adding = signal(false);
  protected readonly addError = signal<string | null>(null);
  // Last card added this session, kept around (top-left, next to the camera
  // picker) so a wrong auto-add can be caught and undone even after the
  // scanner has already moved on to the next card - not just during that
  // card's own brief match-panel window.
  protected readonly lastAdded = signal<{ card: Card; result: AddCardResult } | null>(null);
  protected readonly undoingLastAdd = signal(false);

  constructor() {
    // The gate tick (every MIN_CAPTURE_GAP_MS) used to keep reading camera
    // frames and running the stability/variance check the whole time a
    // backgrounded tab stayed open, for no benefit - nobody can see a match
    // happen while hidden anyway. Live-reported (2026-10-26): minimizing the
    // window or switching tabs while scanning reliably came back to a
    // reloaded page - consistent with Chrome discarding a tab that keeps
    // doing camera/canvas work in the background under memory pressure.
    // Pausing the tick's actual work (not the camera stream itself - that
    // stays connected, see captureAndAnalyze's own check) removes that
    // sustained background load without the reconnect/permission-prompt
    // flicker a full stream teardown would cause on every tab switch.
    const onVisibilityChange = () => {
      if (document.hidden) return;
      // A stale diff baseline from before the tab was hidden could compare
      // against a camera frame from a while ago (lighting/position may have
      // changed) - same reset startCamera already does for a fresh stream.
      this.lastGateSample = null;
      this.gateStableTicks = 0;
      this.backgroundEstimate = null;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    this.destroyRef.onDestroy(() => {
      this.isScanning = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (this.timerHandle) clearTimeout(this.timerHandle);
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      if (this.autoResumeTimeout) clearTimeout(this.autoResumeTimeout);
      if (this.autoAddTimeout) clearTimeout(this.autoAddTimeout);
      if (this.geminiElapsedTimer) clearInterval(this.geminiElapsedTimer);
      this.stream?.getTracks().forEach((track) => track.stop());
      this.bulkData.releaseNameIndex();
    });

    afterNextRender(() => void this.startCamera());
    void this.userSecrets.refreshGeminiKeyStatus();
  }

  private async startCamera(deviceId?: string) {
    const videoEl = this.video()?.nativeElement;
    if (!videoEl) return;

    // Switching cameras re-enters this method while already scanning -
    // stop the previous loop/stream first so they don't run in parallel.
    this.isScanning = false;
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    // A new stream means a new baseline - otherwise the first tick would
    // diff against a frame from the old camera/angle.
    this.lastGateSample = null;
    this.gateStableTicks = 0;
    this.backgroundEstimate = null;

    let preferredDeviceId = deviceId ?? null;
    if (!preferredDeviceId) {
      // Prefer a USB camera over built-in/virtual ones (e.g. a "Lenovo
      // Virtual Camera") since it typically has much higher resolution.
      // Labels are only populated once permission has already been
      // granted at least once for this origin - if not, this just finds
      // nothing and falls back to the default camera below.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const usbCamera = devices
          .filter((d) => d.kind === 'videoinput')
          .find((d) => d.label.toLowerCase().includes('usb'));
        preferredDeviceId = usbCamera?.deviceId ?? null;
      } catch {
        // enumerateDevices() failing just means no auto-preference - carry on.
      }
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
          facingMode: preferredDeviceId ? undefined : { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } catch (error) {
      this.status.set('error');
      this.cameraErrorMessage.set(
        error instanceof DOMException && error.name === 'NotFoundError'
          ? this.translate.instant('scanner.noCameraFound')
          : this.translate.instant('scanner.cameraPermissionDenied'),
      );
      return;
    }

    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.srcObject = this.stream;
    await videoEl.play();

    this.videoTrack = this.stream.getVideoTracks()[0] ?? null;
    this.selectedDeviceId.set(this.videoTrack?.getSettings().deviceId ?? null);
    // Now that permission is granted, labels are populated - (re-)populate
    // the camera picker.
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras.set(devices.filter((d) => d.kind === 'videoinput'));
    } catch {
      // Picker just stays empty; not fatal.
    }

    // Manual focus is only supported on some Chromium-based browsers
    // (mainly Android Chrome/Edge) - show the slider only when the active
    // device actually advertises it, nothing/no error otherwise.
    try {
      const capabilities = this.videoTrack?.getCapabilities?.() as FocusCapableTrackCapabilities | undefined;
      const supportsManual = !!capabilities?.focusMode?.includes('manual');
      this.supportsManualFocus.set(supportsManual);

      if (supportsManual && capabilities?.focusDistance) {
        const { min, max, step } = capabilities.focusDistance;
        this.focusRange.set({ min, max, step: step || (max - min) / 20 || 1 });
        this.focusDistance.set((min + max) / 2);
      }
    } catch {
      this.supportsManualFocus.set(false);
    }

    // isScanning must be true before the first scheduleNextCapture() call,
    // or that call's own guard would immediately no-op and the loop would
    // never start.
    this.isScanning = true;
    this.status.set('scanning');
    this.scheduleNextCapture();
  }

  protected onCameraChange(deviceId: string) {
    void this.startCamera(deviceId);
  }

  protected async onFocusDistanceChange(value: number) {
    this.focusDistance.set(value);
    if (!this.videoTrack) return;
    try {
      await this.videoTrack.applyConstraints({
        advanced: [{ focusMode: 'manual', focusDistance: value } as FocusConstraintSet],
      });
    } catch {
      // Device advertised manual focus support but rejected the constraint - not critical.
    }
  }

  // Tap-to-focus: works on more devices than the manual slider, so it's
  // always wired up regardless of supportsManualFocus - browsers that don't
  // support pointsOfInterest just reject the constraint, silently ignored.
  protected async onVideoTap(event: MouseEvent) {
    if (!this.videoTrack) return;
    const target = event.currentTarget as HTMLVideoElement;
    if (!target.clientWidth || !target.clientHeight) return;

    const x = event.offsetX / target.clientWidth;
    const y = event.offsetY / target.clientHeight;
    try {
      await this.videoTrack.applyConstraints({
        advanced: [{ pointsOfInterest: [{ x, y }] } as FocusConstraintSet],
      });
    } catch {
      // Tap-to-focus isn't supported everywhere - fail silently, no error UI.
    }
  }

  private scheduleNextCapture(delayMs: number = MIN_CAPTURE_GAP_MS) {
    if (!this.isScanning) return;
    this.timerHandle = setTimeout(() => void this.captureAndAnalyze(), delayMs);
  }

  /**
   * Gemini is the only detection path now (see updateGeminiGate/
   * autoGeminiScan below) - this tick just keeps the gate's stability/
   * variance check running and reschedules itself. Archived: the
   * per-tick local Tesseract pass (MTG's cropped collector-number corner,
   * Yu-Gi-Oh's print-code corner, Pokémon/Yu-Gi-Oh's whole-frame name OCR)
   * that used to run here as Gemini's fallback.
   */
  private captureAndAnalyze() {
    if (!this.isScanning || this.status() !== 'scanning') return;

    // Keeps the tick itself (and the camera stream) alive so resuming is
    // instant, but skips every bit of actual work - no frame sampling, no
    // Gemini calls - while nobody can see it happen anyway. See the
    // constructor's visibilitychange listener for the reset this leads into
    // on return.
    if (document.hidden) {
      this.scheduleNextCapture();
      return;
    }

    const videoEl = this.video()?.nativeElement;
    if (!videoEl || videoEl.readyState < 2) {
      this.scheduleNextCapture();
      return;
    }

    this.updateGeminiGate(videoEl);
    this.scheduleNextCapture();
  }

  /**
   * Downsamples the frame to a small grayscale grid and compares it against
   * the previous tick's sample to decide whether Gemini is even allowed to
   * fire this tick (see GATE_* constants). Three independent signals must
   * all hold for a few consecutive ticks: low tick-to-tick diff (the image
   * has stopped changing - a card was just placed and is being held still,
   * not swapped or in motion), high variance (there's actual detail in
   * view, not a blank hand/table/background), and a meaningful difference
   * from the running background estimate (that detail is something NEW,
   * not just the desk/hand/clutter that was already there - live-reported
   * 2026-10-26: variance alone fires just as readily on a stable, detailed
   * but cardless scene, e.g. a patterned desk). Only edge-triggers a single
   * Gemini attempt per stable session - as long as the card stays in view
   * it keeps retrying (paced by GeminiVisionService's own call-interval),
   * but a miss doesn't turn into a tight retry loop within the same tick.
   */
  private updateGeminiGate(videoEl: HTMLVideoElement): void {
    const sample = this.sampleGateFrame(videoEl);
    if (!sample) return;

    const previous = this.lastGateSample;
    this.lastGateSample = sample;

    const pixelCount = sample.length / 4;
    let mean = 0;
    for (let i = 0; i < sample.length; i += 4) mean += sample[i];
    mean /= pixelCount;

    // See GATE_MIN_VARIANCE_YUGIOH/GATE_MIN_DIFF_FROM_BACKGROUND_YUGIOH's
    // doc - only Yu-Gi-Oh!'s own partial-card framing needs the lower bar.
    const isYugioh = this.gameService.currentSlug() === 'yugioh';
    const minVariance = isYugioh ? GATE_MIN_VARIANCE_YUGIOH : GATE_MIN_VARIANCE;
    const minDiffFromBackground = isYugioh ? GATE_MIN_DIFF_FROM_BACKGROUND_YUGIOH : GATE_MIN_DIFF_FROM_BACKGROUND;

    let variance = 0;
    for (let i = 0; i < sample.length; i += 4) variance += (sample[i] - mean) ** 2;
    const hasContent = variance / pixelCount > minVariance;

    if (!previous) {
      // First frame of a fresh session (new stream, or a reset after the
      // last card) - nothing to diff against yet, but it's as good a guess
      // at "what empty looks like" as any, so seed the background estimate
      // from it rather than leaving it null until the next tick.
      this.backgroundEstimate = this.sampleToBackgroundArray(sample, pixelCount);
      return;
    }

    let diffSum = 0;
    for (let i = 0; i < sample.length; i += 4) diffSum += Math.abs(sample[i] - previous[i]);
    const isStable = diffSum / pixelCount < GATE_STABILITY_THRESHOLD;

    const diffFromBackground = this.diffFromBackground(sample, pixelCount);
    const looksNew = diffFromBackground > minDiffFromBackground;

    // Temporary diagnostic (2026-10-27): lowering the YGO thresholds alone
    // didn't make the gate fire - rather than guess again blind, log the
    // actual numbers so we can see which of the three conditions is really
    // the blocker (or whether it's stuck in the adaptive-background-absorbs-
    // the-card trap described on GATE_MIN_DIFF_FROM_BACKGROUND_YUGIOH).
    // Yu-Gi-Oh!-only - MTG's gate isn't in question here. Remove once
    // resolved.
    if (isYugioh) {
      console.log(
        '[YGO gate]',
        'variance', (variance / pixelCount).toFixed(0), '/', minVariance,
        'diffTick', (diffSum / pixelCount).toFixed(1), '/', GATE_STABILITY_THRESHOLD,
        'diffBg', diffFromBackground.toFixed(1), '/', minDiffFromBackground,
        '->', hasContent, isStable, looksNew,
      );
    }

    if (!isStable || !hasContent || !looksNew) {
      this.gateStableTicks = 0;
      // Keeps drifting toward the current scene whenever nothing
      // foreground-like is holding still (an empty/returning-to-empty
      // moment, or a stable-but-unchanged busy background) - but freezes
      // the instant a stable, genuinely different object shows up, so a
      // real card never gets slowly blended into "what empty looks like".
      if (isStable && !looksNew) this.adaptBackgroundEstimate(sample, pixelCount);
      return;
    }

    this.gateStableTicks++;
    if (this.gateStableTicks < GATE_STABLE_TICKS_REQUIRED) return;
    if (this.geminiInFlight || this.hasGeminiKey() === false) return;

    void this.autoGeminiScan(videoEl);
  }

  private sampleToBackgroundArray(sample: Uint8ClampedArray, pixelCount: number): Float32Array {
    const background = new Float32Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) background[i] = sample[i * 4];
    return background;
  }

  /** Mean absolute per-pixel difference between the current sample and the running background estimate - 0 when there's no estimate yet (nothing to call "new" against). */
  private diffFromBackground(sample: Uint8ClampedArray, pixelCount: number): number {
    if (!this.backgroundEstimate) return 0;
    let diffSum = 0;
    for (let i = 0; i < pixelCount; i++) diffSum += Math.abs(sample[i * 4] - this.backgroundEstimate[i]);
    return diffSum / pixelCount;
  }

  private adaptBackgroundEstimate(sample: Uint8ClampedArray, pixelCount: number): void {
    if (!this.backgroundEstimate) {
      this.backgroundEstimate = this.sampleToBackgroundArray(sample, pixelCount);
      return;
    }
    for (let i = 0; i < pixelCount; i++) {
      this.backgroundEstimate[i] += (sample[i * 4] - this.backgroundEstimate[i]) * BACKGROUND_ADAPT_RATE;
    }
  }

  /** Small grayscale downsample used only for the gate's stability/variance check - deliberately tiny since it's read back with getImageData every tick. */
  private sampleGateFrame(videoEl: HTMLVideoElement): Uint8ClampedArray | null {
    if (videoEl.videoWidth < 10 || videoEl.videoHeight < 10) return null;

    this.gateCanvas.width = GATE_SAMPLE_SIZE;
    this.gateCanvas.height = GATE_SAMPLE_SIZE;
    const ctx = this.gateCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.filter = 'grayscale(1)';
    ctx.drawImage(videoEl, 0, 0, GATE_SAMPLE_SIZE, GATE_SAMPLE_SIZE);
    return ctx.getImageData(0, 0, GATE_SAMPLE_SIZE, GATE_SAMPLE_SIZE).data;
  }

  /**
   * The gate-triggered Gemini attempt - reuses tryGeminiPath as-is (same
   * crop, same rate limiting, same per-game identification). Runs
   * independently of the tick loop's own scheduling; onMatch guards against
   * landing after a previous call already matched.
   */
  private async autoGeminiScan(videoEl: HTMLVideoElement): Promise<void> {
    this.geminiInFlight = true;
    try {
      const result = await this.tryGeminiPath(videoEl);
      if (result) this.onMatch({ card: result.card, confidence: 1 }, result);
    } finally {
      this.geminiInFlight = false;
    }
  }

  private async tryGeminiPath(
    videoEl: HTMLVideoElement,
  ): Promise<{ card: Card; finish: CollectorFinish; cardCategory: CardCategory; language: string } | null> {
    try {
      const rawFrame = this.captureRawFrame(videoEl);
      if (!rawFrame) return null;

      const game = this.gameService.currentSlug();
      // MTG crops toward its collector-number corner (see
      // cropCollectorArea). Yu-Gi-Oh! and Pokémon both send the full,
      // uncropped frame - Pokémon because it has no compact code to read at
      // all (just its printed name), Yu-Gi-Oh! because guessing a crop
      // region turned out not to generalize across camera setups/card
      // layouts (see stretchFullFrame's doc).
      const cropped = game === 'mtg' ? cropCollectorArea(rawFrame) : game === 'yugioh' ? stretchFullFrame(rawFrame) : rawFrame;
      this.startGeminiElapsedTimer();
      let text: string | null;
      try {
        text = await this.geminiVision.recognizeCollectorText(cropped, game);
      } finally {
        this.stopGeminiElapsedTimer();
      }

      if (this.geminiVision.rateLimited()) {
        this.ocrEngine.set('limit');
        this.consecutiveOverloadedCount = 0;
        if (!this.limitWarningShown) {
          this.limitWarningShown = true;
          this.showToast(
            this.translate.instant('scanner.limitMessage'),
            'warning',
            LIMIT_TOAST_DURATION_MS,
            this.translate.instant('scanner.limitTitle'),
          );
        }
        return null;
      }

      if (this.geminiVision.overloaded()) {
        this.consecutiveOverloadedCount++;
        if (this.consecutiveOverloadedCount === 1 || this.consecutiveOverloadedCount % OVERLOADED_REMINDER_INTERVAL === 0) {
          this.showToast(
            this.translate.instant('scanner.overloadedMessage'),
            'warning',
            LIMIT_TOAST_DURATION_MS,
            this.translate.instant('scanner.overloadedTitle'),
          );
        }
        return null;
      }
      this.consecutiveOverloadedCount = 0;

      if (!text) return null;

      this.ocrEngine.set('gemini');

      // Yu-Gi-Oh and Pokémon have no token/halo concept - wrap their plain
      // Card result at the defaults so every path returns the same shape.
      if (game === 'yugioh') {
        const code = text.toUpperCase().trim();
        if (!YUGIOH_PRINT_CODE_PATTERN.test(code)) return null;
        const card = await this.yugiohApi.identifyByPrintCode(code);
        // Temporary diagnostic (2026-10-27): the matched set/rarity is
        // correct by construction once a code resolves (see
        // YugiohApiService.withPrintInfo), so a wrong set shown to the user
        // means Gemini read a different code than expected, not a logic
        // bug - this is the only way to see what it actually read. Remove
        // once the current round of live reports is resolved.
        // console.log, not .debug - Chrome DevTools hides .debug under its
        // "Verbose" filter level by default (live-confirmed, 2026-10-27:
        // the user's console showed "4 ausgeblendet" with the actual
        // diagnostic line nowhere visible at the default filter level).
        console.log('[YGO scan] OCR read', code, '-> resolved to', card?.name, card?.setName);
        if (card) return { card, finish: 'nonfoil', cardCategory: 'normal', language: extractYugiohLanguage(code) };

        // The code is shaped right but matches nothing real - most likely a
        // misread character (live-confirmed, 2026-10-26: "LEHD-DEB00" read as
        // "LEND-EN008"). Check whether a real code is only a couple of
        // characters away and let the user confirm it themselves instead of
        // just reporting a miss - never auto-added, see
        // showPrintCodeSuggestions/selectCandidate.
        const suggestions = await this.yugiohApi.findSimilarPrintCodes(code);
        if (suggestions.length > 0) {
          this.showPrintCodeSuggestions(suggestions);
          return null;
        }

        // Still nothing - the misread may be split across both the set and
        // the number (live-confirmed: "LEND-EN008" is edit-distance 3 from
        // the real "LEHD-ENB00", past the flat search's budget above, which
        // has to stay tight to avoid suggesting an unrelated set). Narrow it
        // down in two safer steps instead, per the user's own suggestion
        // (2026-10-26): confirm the SET first, then search only within it.
        const setGuesses = await this.yugiohApi.findSimilarSetPrefixes(code);
        if (setGuesses.length === 0) return null;

        if (setGuesses.length > 1) {
          // Genuine tie between two or more unrelated real sets (live-
          // confirmed: "LEND" is equally close to "LEDD"/Legendary Dragon
          // Decks and "LEHD"/Legendary Hero Decks) - there's no single set
          // to ask a yes/no question about. Search within every tied set
          // instead and let the card picker itself disambiguate - the user
          // can recognize their own card by its picture/name even when the
          // code alone can't tell the sets apart.
          const merged = (
            await Promise.all(setGuesses.map((guess) => this.yugiohApi.findSimilarPrintCodesInSet(guess.prefix, code)))
          )
            .flat()
            .sort((a, b) => a.distance - b.distance)
            .slice(0, FUZZY_PRINT_CODE_PICKER_LIMIT);
          if (merged.length > 0) this.showPrintCodeSuggestions(merged);
          return null;
        }

        const setGuess = setGuesses[0];
        if (setGuess.distance === 0) {
          // The set itself was read correctly - nothing to ask about there,
          // just widen the number search within that already-known set.
          const inSetSuggestions = await this.yugiohApi.findSimilarPrintCodesInSet(setGuess.prefix, code);
          if (inSetSuggestions.length > 0) this.showPrintCodeSuggestions(inSetSuggestions);
          return null;
        }

        this.showSetGuess(setGuess, code);
        return null;
      }

      if (game === 'pokemon') {
        const card = (await this.gameService.cardApi().identifyCard(text))?.card ?? null;
        return card ? { card, finish: 'nonfoil', cardCategory: 'normal', language: DEFAULT_CARD_LANGUAGE } : null;
      }

      return await this.mtgApi.identifyByGeminiResult(text);
    } catch (error) {
      console.error('Gemini Vision fehlgeschlagen:', error);
      this.consecutiveOverloadedCount = 0;
      if (!this.geminiErrorShown) {
        this.geminiErrorShown = true;
        this.showToast(
          error instanceof Error ? error.message : this.translate.instant('scanner.geminiErrorFallback'),
          'warning',
          LIMIT_TOAST_DURATION_MS,
          this.translate.instant('scanner.geminiErrorTitle'),
        );
      }
      return null;
    }
  }

  /** Full, unfiltered color frame for Gemini. */
  private captureRawFrame(videoEl: HTMLVideoElement): HTMLCanvasElement | null {
    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;
    if (width < 10 || height < 10) return null;

    this.rawFrameCanvas.width = width;
    this.rawFrameCanvas.height = height;
    const ctx = this.rawFrameCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoEl, 0, 0, width, height);
    return this.rawFrameCanvas;
  }

  private onMatch(
    result: CardIdentification,
    meta?: { finish: CollectorFinish; cardCategory: CardCategory; language: string },
  ) {
    // Guards against landing here after a previous call already matched and
    // the panel is already showing - must be a no-op, not overwrite it.
    if (this.status() !== 'scanning') return;

    this.addError.set(null);
    this.candidateChoices.set(null);
    this.detectedCard.set(result.card);
    this.detectedFinish.set(meta?.finish ?? 'nonfoil');
    this.detectedCardCategory.set(meta?.cardCategory ?? 'normal');
    this.detectedLanguage.set(meta?.language ?? DEFAULT_CARD_LANGUAGE);
    this.status.set('matched');
    if (navigator.vibrate) navigator.vibrate(200);

    this.autoAddArmed.set(true);
    this.autoAddTimeout = setTimeout(() => {
      this.autoAddTimeout = null;
      void this.addToCollection();
    }, AUTO_ADD_DELAY_MS);
  }

  /**
   * Shows a scanned-but-nonexistent Yu-Gi-Oh! print code's closest real
   * matches for confirmation - reuses the same candidate-picker UI/state
   * MTG's own ambiguous-match path uses (status 'choosing' +
   * candidateChoices), just fed from findSimilarPrintCodes instead. Guarded
   * the same way onMatch is: a stale call landing after the panel already
   * moved on must be a no-op.
   */
  private showPrintCodeSuggestions(suggestions: { card: Card; matchedCode: string; distance: number }[]) {
    // Reachable both directly from 'scanning' (the flat search found
    // something) and from confirmSetGuess (the two-step fallback's second
    // stage, called after the user already confirmed the set from
    // 'confirmingSet') - either is a valid hand-off into this picker.
    if (this.status() !== 'scanning' && this.status() !== 'confirmingSet') return;

    this.pendingPrintCodeLanguages.clear();
    const choices: ScoredCandidate[] = suggestions.map(({ card, matchedCode, distance }) => {
      this.pendingPrintCodeLanguages.set(card.id, extractYugiohLanguage(matchedCode));
      return {
        card,
        confidence: 1 - distance / Math.max(matchedCode.length, 1),
        oracleId: card.id,
        thumbnailUrl: card.imageUrlSmall ?? card.imageUrl ?? null,
      };
    });

    this.addError.set(null);
    this.detectedCard.set(null);
    this.candidateChoices.set(choices);
    this.pickerTier.set('printCodeGuess');
    this.status.set('choosing');
  }

  /** First stage of the two-step fallback (see findSimilarSetPrefix's doc) - shows a lightweight yes/no "meintest du Set X?" confirmation rather than jumping straight to a card picker, since nothing about the actual card is known yet. */
  private showSetGuess(guess: { prefix: string; setName: string | null; distance: number }, fullCode: string) {
    if (this.status() !== 'scanning') return;
    this.detectedCard.set(null);
    this.pendingSetGuess.set({ prefix: guess.prefix, setName: guess.setName, fullCode });
    this.status.set('confirmingSet');
  }

  /** "Ja" on the set guess - searches only within that now-confirmed set for the closest number/language match, then hands off into the normal card picker (showPrintCodeSuggestions). A confirmed set with no in-set suggestions at all (shouldn't normally happen - the set itself exists) just falls back to a plain miss. */
  protected async confirmSetGuess() {
    const guess = this.pendingSetGuess();
    this.pendingSetGuess.set(null);
    if (!guess) {
      this.status.set('scanning');
      this.scheduleNextCapture();
      return;
    }

    const suggestions = await this.yugiohApi.findSimilarPrintCodesInSet(guess.prefix, guess.fullCode);
    if (suggestions.length > 0) {
      this.showPrintCodeSuggestions(suggestions);
    } else {
      this.status.set('scanning');
      this.scheduleNextCapture();
    }
  }

  /** "Nein" on the set guess - same resume-scanning shape as cancelChoices. */
  protected rejectSetGuess() {
    this.pendingSetGuess.set(null);
    this.status.set('scanning');
    this.scheduleNextCapture();
  }

  private startGeminiElapsedTimer() {
    const startedAt = Date.now();
    this.geminiElapsedSeconds.set(0);
    this.geminiElapsedTimer = setInterval(() => {
      this.geminiElapsedSeconds.set((Date.now() - startedAt) / 1000);
    }, 100);
  }

  private stopGeminiElapsedTimer() {
    if (this.geminiElapsedTimer) {
      clearInterval(this.geminiElapsedTimer);
      this.geminiElapsedTimer = null;
    }
    this.geminiElapsedSeconds.set(null);
  }

  private clearAutoAddTimeout() {
    if (this.autoAddTimeout) {
      clearTimeout(this.autoAddTimeout);
      this.autoAddTimeout = null;
    }
    this.autoAddArmed.set(false);
  }

  // Picking a candidate is itself the confirming action - add it straight
  // away (quantity 1, no foil) with a success toast, rather than routing
  // through the match panel's auto-add countdown.
  protected async selectCandidate(candidate: ScoredCandidate) {
    // Only ever populated for the printCodeGuess picker (see
    // showPrintCodeSuggestions) - undefined for MTG's own ambiguous-match
    // picker, same as before this existed.
    const language = this.pendingPrintCodeLanguages.get(candidate.oracleId);
    this.pendingPrintCodeLanguages.clear();
    this.candidateChoices.set(null);
    this.status.set('scanning');
    try {
      const result = await this.collectionService.addCard({
        cardId: candidate.card.id,
        quantity: 1,
        foil: false,
        condition: 'NM',
        oracleId: candidate.card.oracleId,
        setCode: setCodeOf(candidate.card),
        ...(language ? { language } : {}),
      });
      this.lastAdded.set({ card: candidate.card, result });
      this.showToast(
        this.translate.instant('scanner.addedToast', { name: candidate.card.name }),
        'success',
        SUCCESS_TOAST_DURATION_MS,
      );
    } catch (error) {
      this.showToast(
        error instanceof Error ? error.message : this.translate.instant('scanner.addFailed'),
        'warning',
        FAILURE_TOAST_DURATION_MS,
      );
    }
    this.scheduleNextCapture();
  }

  protected cancelChoices() {
    this.pendingPrintCodeLanguages.clear();
    this.candidateChoices.set(null);
    this.status.set('scanning');
    this.scheduleNextCapture();
  }

  private showToast(message: string, variant: ScannerToast['variant'], durationMs: number, title?: string) {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ title, message, variant });
    this.toastTimeout = setTimeout(() => this.toast.set(null), durationMs);
  }

  protected async addToCollection() {
    const card = this.detectedCard();
    if (!card) return;
    this.clearAutoAddTimeout();

    this.adding.set(true);
    this.addError.set(null);
    try {
      // Always 1x, non-foil - a physical scan is one copy at a time, and
      // foil status is corrected afterward in the Collection editor rather
      // than editable mid-countdown here (see AUTO_ADD_DELAY_MS).
      const result = await this.collectionService.addCard({
        cardId: card.id,
        quantity: 1,
        foil: false,
        condition: 'NM',
        finish: this.detectedFinish(),
        cardCategory: this.detectedCardCategory(),
        language: this.detectedLanguage(),
        oracleId: card.oracleId,
        setCode: setCodeOf(card),
      });
      this.lastAdded.set({ card, result });
      this.showToast(
        this.translate.instant('scanner.addedToast', { name: card.name }),
        'success',
        SUCCESS_TOAST_DURATION_MS,
      );
      this.autoResumeTimeout = setTimeout(() => this.keepScanning(), AUTO_RESUME_DELAY_MS);
    } catch (error) {
      this.addError.set(
        error instanceof Error ? error.message : this.translate.instant('scanner.addFailed'),
      );
    } finally {
      this.adding.set(false);
    }
  }

  protected keepScanning() {
    if (this.autoResumeTimeout) {
      clearTimeout(this.autoResumeTimeout);
      this.autoResumeTimeout = null;
    }
    this.clearAutoAddTimeout();
    // Fresh baseline for the next card - otherwise its first tick would
    // diff against whatever was in frame before this one was matched/added.
    // Known limitation: if the just-scanned card is still physically in
    // view at this exact moment (not yet swapped out), that frame becomes
    // the new "empty" background estimate - a same-looking card wouldn't
    // then register as new. A genuinely different next card still will,
    // since it won't match that stale estimate either.
    this.lastGateSample = null;
    this.gateStableTicks = 0;
    this.backgroundEstimate = null;
    this.detectedCard.set(null);
    this.detectedFinish.set('nonfoil');
    this.detectedCardCategory.set('normal');
    this.detectedLanguage.set(DEFAULT_CARD_LANGUAGE);
    this.candidateChoices.set(null);
    this.pendingSetGuess.set(null);
    this.status.set('scanning');
    this.scheduleNextCapture();
  }

  /** Reverses the most recent add - the safety net for a wrong auto-add now that nothing pauses for manual confirmation by default (see AUTO_ADD_DELAY_MS). */
  protected async undoLastAdd() {
    const entry = this.lastAdded();
    if (!entry || this.undoingLastAdd()) return;

    this.undoingLastAdd.set(true);
    try {
      await this.collectionService.undoAdd(entry.result);
      this.lastAdded.set(null);
      this.showToast(
        this.translate.instant('scanner.undoToast', { name: entry.card.name }),
        'success',
        SUCCESS_TOAST_DURATION_MS,
      );
    } catch (error) {
      this.showToast(
        error instanceof Error ? error.message : this.translate.instant('scanner.undoFailed'),
        'warning',
        FAILURE_TOAST_DURATION_MS,
      );
    } finally {
      this.undoingLastAdd.set(false);
    }
  }
}
