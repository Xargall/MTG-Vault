import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PSM } from 'tesseract.js';

import { Card } from '../../core/models/card.model';
import { CardIdentification, MtgIdentificationResult, ScoredCandidate } from '../../core/services/card-api.interface';
import { AddCardResult, CollectionService } from '../collection/collection.service';
import { GameService } from '../../core/services/game.service';
import { GeminiVisionService } from '../../core/services/gemini-vision.service';
import { CardCategory, MtgApiService } from '../../core/services/mtg-api.service';
import { MtgBulkDataService } from '../../core/services/mtg-bulk-data.service';
import { OcrLine, OcrService } from '../../core/services/ocr.service';
import { UserSecretsService } from '../../core/services/user-secrets.service';
import { YugiohApiService } from '../../core/services/yugioh-api.service';
import { ScryfallRateLimitError } from '../../core/utils/scryfall-queue';
import { CollectorFinish } from '../../core/utils/set-code-parser';
import { extractNameFromLines } from '../../core/utils/string-similarity';
import { CardTile } from '../../shared/cards/card-tile/card-tile';

// Queue-based, not a fixed interval: Tesseract itself is the bottleneck, so
// waiting a flat 800ms on top of however long OCR just took only makes
// every frame slower for no benefit. Wait only long enough to keep a
// minimum gap between captures (device doesn't overheat, no back-to-back
// camera reads), never a fixed amount regardless of how long OCR took.
const MIN_CAPTURE_GAP_MS = 300;
const MAX_OCR_WIDTH = 1280;
// Two tiers: set-code+number extraction is exact/structural, so it's worth
// trying even on a shakier frame; the fuzzy name search needs cleaner text
// to avoid false matches, so it only kicks in above a higher bar.
// (Yu-Gi-Oh's name-only path only - see MTG's own crop-based pipeline below.)
const MIN_CONFIDENCE_FOR_SET_CODE = 50;
const MIN_CONFIDENCE_FOR_NAME = 65;
const NO_MATCH_STREAK_FOR_TOAST = 8;

interface CropStrategy {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// MTG's set-code/collector-number corner always prints bottom-left - these
// three crop windows (fractions of the full captured frame) are tried in
// order until one OCRs cleanly enough (see scoreCollectorNumberText),
// covering a card held slightly higher/lower or shifted right of ideal
// instead of requiring exact, precise framing.
const CROP_STRATEGIES: CropStrategy[] = [
  { name: 'optimal', x: 0.0, y: 0.82, w: 0.5, h: 0.1 },
  { name: 'wider', x: 0.0, y: 0.78, w: 0.6, h: 0.15 },
  { name: 'offsetRight', x: 0.1, y: 0.82, w: 0.5, h: 0.1 },
];
// Only a clean, unambiguous read ("U 0082", "0082") is accepted outright -
// anything looser just moves on to the next crop strategy instead of
// risking a wrong exact lookup.
const MIN_SCORE_TO_ACCEPT = 80;
const COLLECTOR_NUMBER_CHAR_WHITELIST = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/*-';
// Yu-Gi-Oh print code as it appears on the card, e.g. "SDAZ-DE001" or
// "LOB-EN001" - set code, two-letter language, then a 2-4 digit number.
const YUGIOH_PRINT_CODE_PATTERN = /^[A-Z0-9]{2,6}-[A-Z]{2}\d{2,4}$/;

/** Gemini's own crop for its collector-number guess - deliberately looser than CROP_STRATEGIES (a vision model reads a wider region fine) and left as unfiltered color, since Gemini isn't Tesseract's binarize-first pipeline. */
function cropCollectorArea(source: HTMLCanvasElement): HTMLCanvasElement {
  const crop = document.createElement('canvas');
  // 20%→25% / 60%→65%: overlay UI elements sitting low on the viewport can
  // clip into this corner on real devices, cutting the collector number out
  // of the captured frame before it ever reached Gemini - widened to give
  // it room.
  const h = Math.floor(source.height * 0.25);
  const y = source.height - h;
  crop.width = Math.floor(source.width * 0.65);
  crop.height = h;
  const ctx = crop.getContext('2d');
  ctx?.drawImage(source, 0, y, crop.width, h, 0, 0, crop.width, h);
  return crop;
}

interface ImageCharacteristics {
  colorVariance: number;
  darkPixelRatio: number;
  brightPixelRatio: number;
  midtonePixelRatio: number;
}

/** Per-pixel brightness/color-variance profile of a crop - foil cards scatter light in a way a plain grayscale+contrast pass handles badly, so this decides which preprocessing pass to use before OCR. */
function analyzeImageCharacteristics(data: Uint8ClampedArray): ImageCharacteristics {
  let colorVariance = 0;
  let darkPixels = 0;
  let brightPixels = 0;
  let midtonePixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    colorVariance += Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
    if (brightness < 85) darkPixels++;
    else if (brightness > 170) brightPixels++;
    else midtonePixels++;
  }

  const total = data.length / 4;
  return {
    colorVariance: colorVariance / total,
    darkPixelRatio: darkPixels / total,
    brightPixelRatio: brightPixels / total,
    midtonePixelRatio: midtonePixels / total,
  };
}

function isFoilImage(stats: ImageCharacteristics): boolean {
  return (
    [
      stats.colorVariance > 15,
      stats.midtonePixelRatio > 0.4,
      stats.darkPixelRatio < 0.3 && stats.brightPixelRatio < 0.3,
    ].filter(Boolean).length >= 2
  );
}

/** Normal (non-foil) crop: grayscale, contrast boost, then a flat threshold - a plain card's info strip is high-contrast enough that a single global cutoff reads cleanly. */
function processNormalCropPixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const enhanced = Math.max(0, Math.min(255, (gray - 128) * 2.5 + 128));
    const binarized = enhanced >= 128 ? 255 : 0;
    data[i] = binarized;
    data[i + 1] = binarized;
    data[i + 2] = binarized;
  }
}

/** Foil crop: grayscale, sigmoid smoothing (softens the holofoil pattern's harsh local contrast), then thresholded against the crop's own average brightness instead of a fixed cutoff - the foil surface's brightness varies too much frame-to-frame for one hardcoded value to work. */
function processFoilCropPixels(data: Uint8ClampedArray): void {
  const pixelCount = data.length / 4;
  const smoothed = new Float32Array(pixelCount);
  const sigmoidSteepness = 20;
  let sum = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = 255 / (1 + Math.exp(-(gray - 128) / sigmoidSteepness));
    smoothed[p] = value;
    sum += value;
  }

  const dynamicThreshold = sum / pixelCount;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const binarized = smoothed[p] >= dynamicThreshold ? 255 : 0;
    data[i] = binarized;
    data[i + 1] = binarized;
    data[i + 2] = binarized;
  }
}

/** How closely OCR'd text matches the expected "[rarity] collector-number" shape - a clean match (100) accepts the crop outright, a loose one (70) still moves on to try the next crop strategy rather than risking a wrong exact lookup. U/C/R/M are the normal rarities; T marks a token card, S a Scryfall "special" rarity (un-sets/masterpieces) - both print the same way. */
function scoreCollectorNumberText(text: string): number {
  const trimmed = text.trim();
  if (/^[UCRMTS]?\s*\d{3,4}$/.test(trimmed)) return 100;
  // Pre-2023 fraction format ("017/017", optionally with a trailing T/H
  // token/halo flag) - just as exact a read as the plain 4-digit form
  // above, see parseCollectorNumber.
  if (/^\d{3,5}\/\d{3,5}(\s+[A-Z])?$/.test(trimmed)) return 100;
  if (/\d{3,4}/.test(trimmed)) return 70;
  return 0;
}
// MTG's multi-field scoring is a per-frame best guess, not a certainty - a
// sliding window over the last few frames confirms a result once the same
// oracle_id wins enough of them, tolerating a single noisy/no-match frame
// in between instead of resetting the whole streak over one outlier.
const FRAME_HISTORY_SIZE = 3;
const CONSISTENT_MATCHES_REQUIRED = 2;
// A filter-sourced top score at or above this auto-confirms just like an
// exact set+number match; below it, MtgApiService already sized `runners`
// to the right picker tier (5 for medium confidence, 10 for low).
const AUTO_CONFIRM_THRESHOLD = 70;
const SUCCESS_TOAST_DURATION_MS = 3000;
const FAILURE_TOAST_DURATION_MS = 2000;
// Just long enough that "added" doesn't feel like an instant UI flash -
// not a "let the user read the confirmation" delay, since the toast (its
// own SUCCESS_TOAST_DURATION_MS) and the top-left undo thumbnail both keep
// that confirmation visible well after scanning has already resumed.
const AUTO_RESUME_DELAY_MS = 400;
const RATE_LIMIT_TOAST_DURATION_MS = 3000;
const LIMIT_TOAST_DURATION_MS = 6000;
// Non-blocking: a 403 sets a "cool off until" timestamp rather than
// awaiting a delay inline, so the loop (and the UI) never freezes for it.
const RATE_LIMIT_PAUSE_MS = 5000;
const RATE_LIMIT_RETRY_DELAY_MS = 1000;

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
  private readonly ocrService = inject(OcrService);
  private readonly geminiVision = inject(GeminiVisionService);
  private readonly userSecrets = inject(UserSecretsService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly captureCanvas = document.createElement('canvas');
  private readonly rawFrameCanvas = document.createElement('canvas');
  private readonly gateCanvas = document.createElement('canvas');
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoResumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoAddTimeout: ReturnType<typeof setTimeout> | null = null;
  private isScanning = false;
  private noMatchStreak = 0;
  // Tick-to-tick baseline for the Gemini trigger gate (see GATE_* constants
  // above) - reset whenever the frame stream restarts (camera switch) or a
  // card finishes its cycle (keepScanning), so a stale comparison from
  // before never leaks into the next card's stability check.
  private lastGateSample: Uint8ClampedArray | null = null;
  private gateStableTicks = 0;
  private geminiInFlight = false;
  // Rolling window of the last few frames' resolved cards (null for a frame
  // with no result at all) - see getConsistentResult(). Carries the parsed
  // finish/category alongside each card, so confirming a match doesn't lose
  // that signal across the sliding window (see confirmMtgCard).
  private frameHistory: Array<{ id: string; card: Card; finish: CollectorFinish; cardCategory: CardCategory } | null> =
    [];
  private rateLimitedUntil = 0;

  protected readonly status = signal<ScannerStatus>('starting');
  protected readonly cameraErrorMessage = signal<string | null>(null);
  protected readonly toast = signal<ScannerToast | null>(null);
  protected readonly availableCameras = signal<MediaDeviceInfo[]>([]);
  protected readonly selectedDeviceId = signal<string | null>(null);
  protected readonly supportsManualFocus = signal(false);
  protected readonly focusRange = signal<FocusRange>({ min: 0, max: 1, step: 0.05 });
  protected readonly focusDistance = signal(0.5);

  // Which engine most recently produced an OCR reading - drives the small
  // "🤖 Gemini" / "📝 Tesseract" / "⚠️ Limit" indicator; null while nothing
  // has read yet.
  protected readonly ocrEngine = signal<'gemini' | 'tesseract' | 'limit' | null>(null);
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
  // Set alongside detectedCard whenever the crop-based MTG path resolved it
  // (Tesseract auto-loop or the gate-triggered Gemini scan) - stays at the
  // defaults for every other path (picker selection, Yu-Gi-Oh, Pokémon),
  // since only MTG's collector-number corner carries a token/halo flag to read.
  protected readonly detectedFinish = signal<CollectorFinish>('nonfoil');
  protected readonly detectedCardCategory = signal<CardCategory>('normal');
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
      void this.ocrService.terminate();
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

  private async captureAndAnalyze() {
    if (!this.isScanning || this.status() !== 'scanning') return;

    // Non-blocking rate-limit cool-off: a prior 403 set a "retry after"
    // timestamp rather than awaiting a delay inline, so a tick that lands
    // during the cool-off just reschedules itself further out instead of
    // doing any work (or freezing the loop/UI while waiting it out).
    if (Date.now() < this.rateLimitedUntil) {
      this.scheduleNextCapture(RATE_LIMIT_RETRY_DELAY_MS);
      return;
    }

    const videoEl = this.video()?.nativeElement;
    if (!videoEl || videoEl.readyState < 2) {
      this.scheduleNextCapture();
      return;
    }

    // Fire-and-forget: the gate's own Gemini call paces and awaits itself
    // (see GeminiVisionService), so it must never block this tick's fast
    // local OCR path below it.
    this.updateGeminiGate(videoEl);

    const start = Date.now();
    try {
      const matched = await this.analyzeFrame(videoEl);
      // MTG has two silent local/automatic paths (Tesseract crop loop above,
      // gate-triggered Gemini below) with no "not recognized" noise, so a
      // miss there just means "keep holding it steady." Yu-Gi-Oh/Pokémon's
      // whole-frame Tesseract path has no such local fallback, so it keeps
      // this streak-based toast as its only feedback.
      if (matched) {
        this.noMatchStreak = 0;
      } else if (this.gameService.currentSlug() !== 'mtg') {
        this.noMatchStreak++;
        if (this.noMatchStreak >= NO_MATCH_STREAK_FOR_TOAST) {
          this.showToast(this.translate.instant('scanner.notRecognized'), 'warning', FAILURE_TOAST_DURATION_MS);
          this.noMatchStreak = 0;
        }
      }
    } catch (error) {
      if (error instanceof ScryfallRateLimitError) {
        this.rateLimitedUntil = Date.now() + RATE_LIMIT_PAUSE_MS;
        this.showToast(this.translate.instant('scanner.rateLimited'), 'warning', RATE_LIMIT_TOAST_DURATION_MS);
      }
      // Bad lighting, blur, no text, a network hiccup on the lookup - all
      // expected and transient otherwise. Stay silent and just keep scanning.
    } finally {
      if (this.isScanning && this.status() === 'scanning') {
        if (Date.now() < this.rateLimitedUntil) {
          this.scheduleNextCapture(RATE_LIMIT_RETRY_DELAY_MS);
        } else {
          const elapsed = Date.now() - start;
          this.scheduleNextCapture(Math.max(0, MIN_CAPTURE_GAP_MS - elapsed));
        }
      }
    }
  }

  private async analyzeFrame(videoEl: HTMLVideoElement): Promise<boolean> {
    // MTG no longer OCRs the whole frame at all - only its own cropped
    // set-code/collector-number corner (see handleMtgFrame), so it branches
    // out before the whole-frame capture below even runs.
    if (this.gameService.currentSlug() === 'mtg') {
      return this.handleMtgFrame(videoEl);
    }

    // Yu-Gi-Oh and Pokémon: whole-frame OCR feeding the name-only lookup -
    // neither has MTG's structured Scryfall set-code/collector-number
    // fields to crop toward.
    const canvas = this.captureFrame(videoEl);
    if (!canvas) return false;

    const ocrResult = await this.ocrService.recognizeText(canvas);
    if (ocrResult.confidence < MIN_CONFIDENCE_FOR_SET_CODE) return false;

    if (ocrResult.confidence >= MIN_CONFIDENCE_FOR_NAME) {
      const byName = await this.tryIdentifyByName(ocrResult.lines);
      if (byName) {
        this.onMatch(byName);
        return true;
      }
    }

    return false;
  }

  /**
   * MTG's own crop-based Tesseract pass, run on every tick regardless of the
   * Gemini gate below - it's cheap, local, and often confirms a match before
   * Gemini's rate-limited call would even have fired.
   */
  private async handleMtgFrame(videoEl: HTMLVideoElement): Promise<boolean> {
    const result = await this.tryTesseractPath(videoEl);

    const confirmed = this.confirmMtgCard(result);
    if (!confirmed) return false;

    this.onMatch({ card: confirmed.card, confidence: 1 }, confirmed);
    return true;
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
   * landing after the Tesseract path (or a previous call) already matched.
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
  ): Promise<{ card: Card; finish: CollectorFinish; cardCategory: CardCategory } | null> {
    try {
      const rawFrame = this.captureRawFrame(videoEl);
      if (!rawFrame) return null;

      const game = this.gameService.currentSlug();
      // MTG's collector number and Yu-Gi-Oh's print code both print in the
      // bottom corner, so both crop toward it (see cropCollectorArea).
      // Pokémon has neither - no compact code to read at all, just its
      // printed name up top - so it gets the full, uncropped frame instead.
      const cropped = game === 'pokemon' ? rawFrame : cropCollectorArea(rawFrame);
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
        return card ? { card, finish: 'nonfoil', cardCategory: 'normal' } : null;
      }

      if (game === 'pokemon') {
        const card = (await this.gameService.cardApi().identifyCard(text))?.card ?? null;
        return card ? { card, finish: 'nonfoil', cardCategory: 'normal' } : null;
      }

      return await this.mtgApi.identifyByGeminiResult(text);
    } catch (error) {
      console.error('Gemini Vision fehlgeschlagen, Tesseract-Fallback:', error);
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

  /**
   * Crop-based collector-number scan (mtgscan-derived): tries each of
   * CROP_STRATEGIES's bottom-left corner windows in turn, foil-detects the
   * crop to pick the right adaptive preprocessing pass, OCRs it with a
   * numeric-only Tesseract config, and stops at the first strategy whose
   * result scores well enough (see scoreCollectorNumberText). That text is
   * then resolved to an exact set+number hit only - no name/power-
   * toughness/keyword fallback, since a crop this tight never has those
   * fields in it anyway.
   */
  private async tryTesseractPath(
    videoEl: HTMLVideoElement,
  ): Promise<{ card: Card; finish: CollectorFinish; cardCategory: CardCategory } | null> {
    let result: { card: Card; finish: CollectorFinish; cardCategory: CardCategory } | null = null;

    for (const strategy of CROP_STRATEGIES) {
      const cropCanvas = this.cropToStrategy(videoEl, strategy);
      if (!cropCanvas) continue;

      const ctx = cropCanvas.getContext('2d');
      if (!ctx) continue;

      const imageData = ctx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
      const stats = analyzeImageCharacteristics(imageData.data);
      if (isFoilImage(stats)) {
        processFoilCropPixels(imageData.data);
      } else {
        processNormalCropPixels(imageData.data);
      }
      ctx.putImageData(imageData, 0, 0);

      const ocrResult = await this.ocrService.recognizeText(cropCanvas, {
        pageSegMode: PSM.SINGLE_LINE,
        charWhitelist: COLLECTOR_NUMBER_CHAR_WHITELIST,
      });
      const score = scoreCollectorNumberText(ocrResult.text);
      if (score < MIN_SCORE_TO_ACCEPT) continue;

      // Only claim the badge once Tesseract actually found something -
      // this runs continuously in the background, so setting it unconditionally
      // at the top of this method would immediately overwrite a "gemini" badge
      // from the very next tick, regardless of whether this attempt succeeds.
      this.ocrEngine.set('tesseract');
      result = await this.mtgApi.identifyByCroppedText(ocrResult.text);
      break;
    }

    return result;
  }

  private pushFrameHistory(entry: { id: string; card: Card; finish: CollectorFinish; cardCategory: CardCategory } | null) {
    this.frameHistory.push(entry);
    if (this.frameHistory.length > FRAME_HISTORY_SIZE) this.frameHistory.shift();
  }

  /** Sliding-window consistency check: within the last FRAME_HISTORY_SIZE frames, the same card must appear at least CONSISTENT_MATCHES_REQUIRED times - tolerates a single noisy/no-match frame in between two real hits instead of a strict streak. */
  private confirmMtgCard(
    result: { card: Card; finish: CollectorFinish; cardCategory: CardCategory } | null,
  ): { card: Card; finish: CollectorFinish; cardCategory: CardCategory } | null {
    this.pushFrameHistory(result ? { id: result.card.id, ...result } : null);
    if (!result) return null;

    const entries = this.frameHistory.filter(
      (entry): entry is { id: string; card: Card; finish: CollectorFinish; cardCategory: CardCategory } =>
        entry !== null,
    );

    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);

    let topId: string | null = null;
    let topCount = 0;
    for (const [id, count] of counts) {
      if (count > topCount) {
        topId = id;
        topCount = count;
      }
    }

    if (!topId || topCount < CONSISTENT_MATCHES_REQUIRED) return null;

    // Use the most recent frame that agreed, not the oldest - its OCR read
    // is the freshest one.
    const latest = [...entries].reverse().find((entry) => entry.id === topId);
    if (!latest) return null;

    this.frameHistory = [];
    return latest;
  }

  /** Full, unfiltered color frame for Gemini - unlike captureFrame() below, no grayscale/contrast pass, since that's a Tesseract-specific preprocessing step a general vision model doesn't need. */
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

  private cropToStrategy(videoEl: HTMLVideoElement, strategy: CropStrategy): HTMLCanvasElement | null {
    const videoWidth = videoEl.videoWidth;
    const videoHeight = videoEl.videoHeight;
    if (!videoWidth || !videoHeight) return null;

    const sx = Math.round(strategy.x * videoWidth);
    const sy = Math.round(strategy.y * videoHeight);
    const sw = Math.round(strategy.w * videoWidth);
    const sh = Math.round(strategy.h * videoHeight);
    // Same guard as captureFrame() - a transiently tiny reported video size
    // while the stream settles would otherwise produce a near-zero crop.
    if (sw < 10 || sh < 10) return null;

    this.captureCanvas.width = sw;
    this.captureCanvas.height = sh;
    const ctx = this.captureCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, sw, sh);
    return this.captureCanvas;
  }

  private async tryIdentifyByName(lines: OcrLine[]): Promise<CardIdentification | null> {
    const candidate = extractNameFromLines(lines);
    if (!candidate) return null;

    return this.gameService.cardApi().identifyCard(candidate);
  }

  private captureFrame(videoEl: HTMLVideoElement): HTMLCanvasElement | null {
    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;
    if (!width || !height) return null;

    // Cap the OCR input at 1280px wide - a bigger image doesn't meaningfully
    // help Tesseract's accuracy but costs a lot more CPU time per frame,
    // which matters a lot more on mobile hardware than on a desktop.
    const scale = width > MAX_OCR_WIDTH ? MAX_OCR_WIDTH / width : 1;
    const outWidth = Math.round(width * scale);
    const outHeight = Math.round(height * scale);

    this.captureCanvas.width = outWidth;
    this.captureCanvas.height = outHeight;

    // Some browsers briefly report a tiny placeholder videoWidth/videoHeight
    // while the stream is still settling - drawing from that produces a
    // near-zero canvas Tesseract can't handle. Skip the frame; the next
    // capture tick will have real dimensions.
    if (this.captureCanvas.width < 10 || this.captureCanvas.height < 10) return null;

    const ctx = this.captureCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.filter = 'grayscale(1) contrast(1.4)';
    ctx.drawImage(videoEl, 0, 0, width, height, 0, 0, outWidth, outHeight);
    return this.captureCanvas;
  }

  private onMatch(result: CardIdentification, meta?: { finish: CollectorFinish; cardCategory: CardCategory }) {
    // Guards against a race between the two concurrent auto-detection paths
    // (MTG's per-tick Tesseract crop and the gate-triggered Gemini call) -
    // whichever resolves first wins; the other lands here after the panel
    // is already showing and must be a no-op instead of overwriting it.
    if (this.status() !== 'scanning') return;

    this.addError.set(null);
    this.candidateChoices.set(null);
    this.detectedCard.set(result.card);
    this.detectedFinish.set(meta?.finish ?? 'nonfoil');
    this.detectedCardCategory.set(meta?.cardCategory ?? 'normal');
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

  private onAmbiguousMatch(result: MtgIdentificationResult) {
    // MtgApiService already sized `runners` to the tier (4 for medium
    // confidence -> 5 total, 9 for low -> 10 total) - read the tier back
    // from that instead of re-checking the score threshold here too.
    this.pickerTier.set(result.runners.length <= 4 ? 'medium' : 'low');
    this.candidateChoices.set([result.topCandidate, ...result.runners]);
    this.status.set('choosing');
    if (navigator.vibrate) navigator.vibrate(200);
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
    this.frameHistory = [];
    // Fresh baseline for the next card - otherwise its first tick would
    // diff against whatever was in frame before this one was matched/added.
    this.lastGateSample = null;
    this.gateStableTicks = 0;
    this.detectedCard.set(null);
    this.detectedFinish.set('nonfoil');
    this.detectedCardCategory.set('normal');
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
