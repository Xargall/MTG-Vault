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

import { Card } from '../../core/models/card.model';
import { CardIdentification } from '../../core/services/card-api.interface';
import { CollectionService } from '../collection/collection.service';
import { GameService } from '../../core/services/game.service';
import { MtgApiService } from '../../core/services/mtg-api.service';
import { OcrLine, OcrService } from '../../core/services/ocr.service';
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
const MIN_CONFIDENCE_FOR_SET_CODE = 50;
const MIN_CONFIDENCE_FOR_NAME = 65;
const NO_MATCH_STREAK_FOR_TOAST = 8;
// MTG's multi-field scoring is a per-frame best guess, not a certainty - an
// OCR outlier on one frame could still score above the match threshold, so
// the same oracle_id must win 3 frames in a row before it's confirmed.
const CONSECUTIVE_MATCHES_REQUIRED = 3;
const SUCCESS_TOAST_DURATION_MS = 3000;
const FAILURE_TOAST_DURATION_MS = 2000;
const AUTO_RESUME_DELAY_MS = 2000;

type ScannerStatus = 'starting' | 'scanning' | 'matched' | 'error';
type ScannerToast = { message: string; variant: 'success' | 'warning' };

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
  private readonly collectionService = inject(CollectionService);
  private readonly ocrService = inject(OcrService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly captureCanvas = document.createElement('canvas');
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoResumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private isScanning = false;
  private noMatchStreak = 0;
  private lastOracleId: string | null = null;
  private consecutiveMatches = 0;

  protected readonly status = signal<ScannerStatus>('starting');
  protected readonly cameraErrorMessage = signal<string | null>(null);
  protected readonly toast = signal<ScannerToast | null>(null);
  protected readonly availableCameras = signal<MediaDeviceInfo[]>([]);
  protected readonly selectedDeviceId = signal<string | null>(null);
  protected readonly supportsManualFocus = signal(false);
  protected readonly focusRange = signal<FocusRange>({ min: 0, max: 1, step: 0.05 });
  protected readonly focusDistance = signal(0.5);

  protected readonly detectedCard = signal<Card | null>(null);
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
    console.log('analyzing frame');
    if (!this.isScanning || this.status() !== 'scanning') return;

    const start = Date.now();
    try {
      const matched = await this.analyzeFrame();
      if (matched) {
        this.noMatchStreak = 0;
      } else {
        this.noMatchStreak++;
        if (this.noMatchStreak >= NO_MATCH_STREAK_FOR_TOAST) {
          this.showToast(this.translate.instant('scanner.notRecognized'), 'warning', FAILURE_TOAST_DURATION_MS);
          this.noMatchStreak = 0;
        }
      }
    } catch {
      // Bad lighting, blur, no text, a network hiccup on the lookup - all
      // expected and transient. Stay silent and just keep scanning.
    } finally {
      if (this.isScanning && this.status() === 'scanning') {
        const elapsed = Date.now() - start;
        this.scheduleNextCapture(Math.max(0, MIN_CAPTURE_GAP_MS - elapsed));
      }
    }
  }

  private async analyzeFrame(): Promise<boolean> {
    const videoEl = this.video()?.nativeElement;
    if (!videoEl || videoEl.readyState < 2) return false;

    // No cropping - Tesseract gets the whole card image as context, which
    // reads far more reliably than a thin, tightly-cropped strip (and lets
    // the card be held at a normal, in-focus distance instead of filling
    // the frame).
    const canvas = this.captureFrame(videoEl);
    if (!canvas) return false;

    const ocrResult = await this.ocrService.recognizeText(canvas);
    console.log('OCR result:', ocrResult.text, 'confidence:', ocrResult.confidence);
    if (ocrResult.confidence < MIN_CONFIDENCE_FOR_SET_CODE) return false;

    // MTG: multi-field scoring across every recognizable field (name, set
    // code, collector number, type line, P/T, mana cost, artist) instead of
    // trusting a single one - see handleMtgFrame. Yu-Gi-Oh has none of
    // those structured Scryfall fields, so it keeps the simpler name-only
    // path below.
    if (this.gameService.currentSlug() === 'mtg') {
      return this.handleMtgFrame(ocrResult);
    }

    if (ocrResult.confidence >= MIN_CONFIDENCE_FOR_NAME) {
      const byName = await this.tryIdentifyByName(ocrResult.lines);
      if (byName) {
        this.onMatch(byName);
        return true;
      }
    }

    return false;
  }

  private async handleMtgFrame(ocrResult: { text: string; lines: OcrLine[] }): Promise<boolean> {
    const result = await this.mtgApi.identifyCardWithScoring(ocrResult.text, ocrResult.lines);

    if (!result?.oracleId) {
      this.lastOracleId = null;
      this.consecutiveMatches = 0;
      return false;
    }

    if (result.oracleId === this.lastOracleId) {
      this.consecutiveMatches++;
    } else {
      this.lastOracleId = result.oracleId;
      this.consecutiveMatches = 1;
    }

    if (this.consecutiveMatches < CONSECUTIVE_MATCHES_REQUIRED) {
      return false;
    }

    this.lastOracleId = null;
    this.consecutiveMatches = 0;
    this.onMatch(result);
    return true;
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
    this.detectedCard.set(result.card);
    this.status.set('matched');
    if (navigator.vibrate) navigator.vibrate(200);
  }

  private showToast(message: string, variant: ScannerToast['variant'], durationMs: number) {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ message, variant });
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
    this.lastOracleId = null;
    this.consecutiveMatches = 0;
    this.detectedCard.set(null);
    this.status.set('scanning');
    this.scheduleNextCapture();
  }
}
