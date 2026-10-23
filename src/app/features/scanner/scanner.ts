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
import { YugiohApiService } from '../../core/services/yugioh-api.service';
import { CollectorFinish } from '../../core/utils/set-code-parser';
import { CardTile } from '../../shared/cards/card-tile/card-tile';

const MIN_CAPTURE_GAP_MS = 300;
// Yu-Gi-Oh print code as it appears on the card, e.g. "SDAZ-DE001" or
// "LOB-EN001" - set code, two-letter language, then a 2-4 digit number.
const YUGIOH_PRINT_CODE_PATTERN = /^[A-Z0-9]{2,6}-[A-Z]{2}\d{2,4}$/;
const YUGIOH_PRINT_CODE_LANGUAGE_PATTERN = /-([A-Z]{2})\d/;

/** Extracts the language segment already embedded in a Yu-Gi-Oh print code (e.g. "SDAZ-DE001" -> 'de') - unlike MTG, no separate OCR read is needed, it's part of the same code the card is identified by. Falls back to the default (English) for an unrecognized segment rather than failing the whole identification over it. */
function extractYugiohLanguage(printCode: string): string {
  const token = YUGIOH_PRINT_CODE_LANGUAGE_PATTERN.exec(printCode)?.[1];
  return (token && PRINTED_LANGUAGE_CODES[token]) || DEFAULT_CARD_LANGUAGE;
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
 * MTG's collector number/set code always sits bottom-left, so a left-aligned
 * crop is enough. Yu-Gi-Oh's print code can sit bottom-left OR bottom-right
 * depending on the card's exact layout/era (the YUGIOH_PROMPT in the
 * gemini-ocr Edge Function already says so) - a left-aligned crop would
 * silently cut it out of frame on every card where it's actually on the
 * right, which is exactly the kind of miss that looks identical to "no card
 * in view" from the outside. So Yu-Gi-Oh gets the full width instead of
 * guessing a side.
 */
function cropCollectorArea(source: HTMLCanvasElement, game: 'mtg' | 'yugioh' | 'pokemon'): HTMLCanvasElement {
  const crop = document.createElement('canvas');
  // 20%→25%: overlay UI elements sitting low on the viewport can clip into
  // this corner on real devices, cutting the collector number out of the
  // captured frame before it ever reached Gemini - widened to give it room.
  const h = Math.floor(source.height * 0.25);
  const y = source.height - h;
  // 60%→65% for MTG specifically - same reasoning as the height widening
  // above, kept narrower than full width since MTG's code is reliably
  // bottom-left.
  const widthFraction = game === 'yugioh' ? 1 : 0.65;
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

type ScannerStatus = 'starting' | 'scanning' | 'matched' | 'choosing' | 'error';
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
  imports: [FormsModule, RouterLink, CardTile, TranslatePipe],
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
  // Gates the automatic Gemini path (see updateGeminiGate) and drives the
  // "set up your own key" hint - null (not checked yet) fails open, so a
  // flaky/unmigrated status check never silently disables a working feature.
  protected readonly hasGeminiKey = this.userSecrets.hasGeminiKey;
  // Gemini's 429 is shown to the user only the first time per session -
  // it's already handled gracefully (falls back silently otherwise), so
  // repeating the same explanation every subsequent hit would just be noise.
  private limitWarningShown = false;
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
  // from a duplicated threshold here.
  protected readonly pickerTier = signal<'medium' | 'low'>('medium');
  protected readonly adding = signal(false);
  protected readonly addError = signal<string | null>(null);
  // Last card added this session, kept around (top-left, next to the camera
  // picker) so a wrong auto-add can be caught and undone even after the
  // scanner has already moved on to the next card - not just during that
  // card's own brief match-panel window.
  protected readonly lastAdded = signal<{ card: Card; result: AddCardResult } | null>(null);
  protected readonly undoingLastAdd = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isScanning = false;
      if (this.timerHandle) clearTimeout(this.timerHandle);
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      if (this.autoResumeTimeout) clearTimeout(this.autoResumeTimeout);
      if (this.autoAddTimeout) clearTimeout(this.autoAddTimeout);
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
   * fire this tick (see GATE_* constants). Two independent signals must both
   * hold for a few consecutive ticks: low tick-to-tick diff (the image has
   * stopped changing - a card was just placed and is being held still, not
   * swapped or in motion) and high variance (there's actual detail in view,
   * not a blank hand/table/background). Only edge-triggers a single Gemini
   * attempt per stable session - as long as the card stays in view it keeps
   * retrying (paced by GeminiVisionService's own call-interval), but a miss
   * doesn't turn into a tight retry loop within the same tick.
   */
  private updateGeminiGate(videoEl: HTMLVideoElement): void {
    const sample = this.sampleGateFrame(videoEl);
    if (!sample) return;

    const previous = this.lastGateSample;
    this.lastGateSample = sample;
    if (!previous) return;

    const pixelCount = sample.length / 4;
    let mean = 0;
    for (let i = 0; i < sample.length; i += 4) mean += sample[i];
    mean /= pixelCount;

    let diffSum = 0;
    let variance = 0;
    for (let i = 0; i < sample.length; i += 4) {
      diffSum += Math.abs(sample[i] - previous[i]);
      variance += (sample[i] - mean) ** 2;
    }

    const isStable = diffSum / pixelCount < GATE_STABILITY_THRESHOLD;
    const hasContent = variance / pixelCount > GATE_MIN_VARIANCE;

    if (!isStable || !hasContent) {
      this.gateStableTicks = 0;
      return;
    }

    this.gateStableTicks++;
    if (this.gateStableTicks < GATE_STABLE_TICKS_REQUIRED) return;
    if (this.geminiInFlight || this.hasGeminiKey() === false) return;

    void this.autoGeminiScan(videoEl);
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
      // MTG's collector number and Yu-Gi-Oh's print code both print in the
      // bottom corner, so both crop toward it (see cropCollectorArea).
      // Pokémon has neither - no compact code to read at all, just its
      // printed name up top - so it gets the full, uncropped frame instead.
      const cropped = game === 'pokemon' ? rawFrame : cropCollectorArea(rawFrame, game);
      const text = await this.geminiVision.recognizeCollectorText(cropped, game);

      if (this.geminiVision.rateLimited()) {
        this.ocrEngine.set('limit');
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

      if (!text) return null;

      this.ocrEngine.set('gemini');

      // Yu-Gi-Oh and Pokémon have no token/halo concept - wrap their plain
      // Card result at the defaults so every path returns the same shape.
      if (game === 'yugioh') {
        const code = text.toUpperCase().trim();
        if (!YUGIOH_PRINT_CODE_PATTERN.test(code)) return null;
        const card = await this.yugiohApi.identifyByPrintCode(code);
        return card ? { card, finish: 'nonfoil', cardCategory: 'normal', language: extractYugiohLanguage(code) } : null;
      }

      if (game === 'pokemon') {
        const card = (await this.gameService.cardApi().identifyCard(text))?.card ?? null;
        return card ? { card, finish: 'nonfoil', cardCategory: 'normal', language: DEFAULT_CARD_LANGUAGE } : null;
      }

      return await this.mtgApi.identifyByGeminiResult(text);
    } catch (error) {
      console.error('Gemini Vision fehlgeschlagen:', error);
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
    this.candidateChoices.set(null);
    this.status.set('scanning');
    try {
      const result = await this.collectionService.addCard({
        cardId: candidate.card.id,
        quantity: 1,
        foil: false,
        condition: 'NM',
        oracleId: candidate.card.oracleId,
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
    this.lastGateSample = null;
    this.gateStableTicks = 0;
    this.detectedCard.set(null);
    this.detectedFinish.set('nonfoil');
    this.detectedCardCategory.set('normal');
    this.detectedLanguage.set(DEFAULT_CARD_LANGUAGE);
    this.candidateChoices.set(null);
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
