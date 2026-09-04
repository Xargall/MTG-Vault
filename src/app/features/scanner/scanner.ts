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
import { CollectionService } from '../collection/collection.service';
import { GameService } from '../../core/services/game.service';
import { GeminiVisionService } from '../../core/services/gemini-vision.service';
import { MtgApiService } from '../../core/services/mtg-api.service';
import { MtgBulkDataService } from '../../core/services/mtg-bulk-data.service';
import { OcrLine, OcrService } from '../../core/services/ocr.service';
import { ScryfallRateLimitError } from '../../core/utils/scryfall-queue';
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

/** Gemini's own crop for its collector-number guess - deliberately looser than CROP_STRATEGIES (a vision model reads a wider region fine) and left as unfiltered color, since Gemini isn't Tesseract's binarize-first pipeline. */
function cropCollectorArea(source: HTMLCanvasElement): HTMLCanvasElement {
  const crop = document.createElement('canvas');
  const h = Math.floor(source.height * 0.2);
  const y = source.height - h;
  crop.width = Math.floor(source.width * 0.6);
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
const AUTO_RESUME_DELAY_MS = 2000;
const RATE_LIMIT_TOAST_DURATION_MS = 3000;
const LIMIT_TOAST_DURATION_MS = 6000;
// Non-blocking: a 403 sets a "cool off until" timestamp rather than
// awaiting a delay inline, so the loop (and the UI) never freezes for it.
const RATE_LIMIT_PAUSE_MS = 5000;
const RATE_LIMIT_RETRY_DELAY_MS = 1000;

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
  protected readonly bulkData = inject(MtgBulkDataService);
  private readonly collectionService = inject(CollectionService);
  private readonly ocrService = inject(OcrService);
  private readonly geminiVision = inject(GeminiVisionService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly captureCanvas = document.createElement('canvas');
  private readonly rawFrameCanvas = document.createElement('canvas');
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoResumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private isScanning = false;
  private noMatchStreak = 0;
  // Rolling window of the last few frames' resolved cards (null for a frame
  // with no result at all) - see getConsistentResult().
  private frameHistory: Array<{ id: string; card: Card } | null> = [];
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
  // Gemini's 429 is shown to the user only the first time per session -
  // it's already handled gracefully (falls back silently otherwise), so
  // repeating the same explanation every subsequent hit would just be noise.
  private limitWarningShown = false;
  // True while the manual "Jetzt scannen" button's single Gemini call is in
  // flight - drives the button's disabled state and spinner.
  protected readonly geminiLoading = signal(false);
  protected readonly detectedCard = signal<Card | null>(null);
  protected readonly candidateChoices = signal<ScoredCandidate[] | null>(null);
  // Which heading/copy the picker shows - 'medium' (5 options, fairly
  // confident guess) vs 'low' (10 options, weak signal). Derived from how
  // many runners MtgApiService already decided to include, not recomputed
  // from a duplicated threshold here.
  protected readonly pickerTier = signal<'medium' | 'low'>('medium');
  protected readonly quantity = signal(1);
  protected readonly foil = signal(false);
  protected readonly adding = signal(false);
  protected readonly addError = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isScanning = false;
      if (this.timerHandle) clearTimeout(this.timerHandle);
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      if (this.autoResumeTimeout) clearTimeout(this.autoResumeTimeout);
      this.stream?.getTracks().forEach((track) => track.stop());
      void this.ocrService.terminate();
    });

    afterNextRender(() => void this.startCamera());
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

    const start = Date.now();
    try {
      const matched = await this.analyzeFrame();
      // MTG's automatic loop is Tesseract-only now (Gemini only runs on the
      // manual "Jetzt scannen" tap, which already gives its own feedback on
      // a miss) - it runs silently in the background with no "not
      // recognized" noise. Yu-Gi-Oh has no manual alternative, so it keeps
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

  private async analyzeFrame(): Promise<boolean> {
    const videoEl = this.video()?.nativeElement;
    if (!videoEl || videoEl.readyState < 2) return false;

    // MTG no longer OCRs the whole frame at all - only its own cropped
    // set-code/collector-number corner (see handleMtgFrame), so it branches
    // out before the whole-frame capture below even runs.
    if (this.gameService.currentSlug() === 'mtg') {
      return this.handleMtgFrame(videoEl);
    }

    // Yu-Gi-Oh: unchanged, whole-frame OCR feeding the name-only lookup
    // (it has none of MTG's structured Scryfall set-code/collector-number
    // fields to crop toward).
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
   * Gemini is no longer part of this automatic per-tick loop - it only runs
   * on the user's explicit "Jetzt scannen" tap (see onManualScan). The
   * background loop stays Tesseract-only, unchanged otherwise.
   */
  private async handleMtgFrame(videoEl: HTMLVideoElement): Promise<boolean> {
    const card = await this.tryTesseractPath(videoEl);

    const confirmed = this.confirmMtgCard(card);
    if (!confirmed) return false;

    this.onMatch({ card: confirmed, confidence: 1 });
    return true;
  }

  /**
   * Manual, single-shot Gemini scan triggered by the "Jetzt scannen"
   * button - reuses tryGeminiPath as-is (same crop, same rate limiting,
   * same identifyByCroppedText pipeline). A deliberate one-frame user
   * action is trusted immediately on success rather than routed through
   * confirmMtgCard's 2-of-3 sliding window, which exists to smooth out
   * noise across the *automatic* stream of frames - not applicable here.
   * The background Tesseract loop keeps running unaffected.
   */
  protected async onManualScan(): Promise<void> {
    if (this.geminiLoading()) return;
    const videoEl = this.video()?.nativeElement;
    if (!videoEl || videoEl.readyState < 2) return;

    this.geminiLoading.set(true);
    try {
      const card = await this.tryGeminiPath(videoEl);
      if (card) {
        this.onMatch({ card, confidence: 1 });
      } else if (this.ocrEngine() !== 'limit') {
        this.showToast(this.translate.instant('scanner.manualScanNotRecognized'), 'warning', FAILURE_TOAST_DURATION_MS);
      }
    } finally {
      this.geminiLoading.set(false);
    }
  }

  private async tryGeminiPath(videoEl: HTMLVideoElement): Promise<Card | null> {
    try {
      const rawFrame = this.captureRawFrame(videoEl);
      if (!rawFrame) return null;

      const cropped = cropCollectorArea(rawFrame);
      const text = await this.geminiVision.recognizeCollectorText(cropped);

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
      return await this.mtgApi.identifyByCroppedText(text);
    } catch (error) {
      console.error('Gemini Vision fehlgeschlagen, Tesseract-Fallback:', error);
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
  private async tryTesseractPath(videoEl: HTMLVideoElement): Promise<Card | null> {
    let card: Card | null = null;

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
      card = await this.mtgApi.identifyByCroppedText(ocrResult.text);
      break;
    }

    return card;
  }

  private pushFrameHistory(entry: { id: string; card: Card } | null) {
    this.frameHistory.push(entry);
    if (this.frameHistory.length > FRAME_HISTORY_SIZE) this.frameHistory.shift();
  }

  /** Sliding-window consistency check: within the last FRAME_HISTORY_SIZE frames, the same card must appear at least CONSISTENT_MATCHES_REQUIRED times - tolerates a single noisy/no-match frame in between two real hits instead of a strict streak. */
  private confirmMtgCard(card: Card | null): Card | null {
    this.pushFrameHistory(card ? { id: card.id, card } : null);
    if (!card) return null;

    const entries = this.frameHistory.filter((entry): entry is { id: string; card: Card } => entry !== null);

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
    return latest.card;
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

  private onMatch(result: CardIdentification) {
    this.quantity.set(1);
    this.foil.set(false);
    this.addError.set(null);
    this.candidateChoices.set(null);
    this.detectedCard.set(result.card);
    this.status.set('matched');
    if (navigator.vibrate) navigator.vibrate(200);
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
  // through the quantity/foil form the auto-confirm path uses.
  protected async selectCandidate(candidate: ScoredCandidate) {
    this.candidateChoices.set(null);
    this.status.set('scanning');
    try {
      await this.collectionService.addCard({
        cardId: candidate.card.id,
        quantity: 1,
        foil: false,
        condition: 'NM',
      });
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

  protected increaseQuantity() {
    this.quantity.update((q) => q + 1);
  }

  protected decreaseQuantity() {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  protected async addToCollection() {
    const card = this.detectedCard();
    if (!card) return;

    this.adding.set(true);
    this.addError.set(null);
    try {
      await this.collectionService.addCard({
        cardId: card.id,
        quantity: this.quantity(),
        foil: this.foil(),
        condition: 'NM',
      });
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
    this.frameHistory = [];
    this.detectedCard.set(null);
    this.candidateChoices.set(null);
    this.status.set('scanning');
    this.scheduleNextCapture();
  }
}
