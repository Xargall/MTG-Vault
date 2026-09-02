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
import { parseSetCode } from '../../core/utils/set-code-parser';
import { CardTile } from '../../shared/cards/card-tile/card-tile';

const CAPTURE_INTERVAL_MS = 800;
const OCR_CONFIDENCE_THRESHOLD = 55;
const NO_MATCH_STREAK_FOR_TOAST = 10;
const SUCCESS_TOAST_DURATION_MS = 3000;
const FAILURE_TOAST_DURATION_MS = 2000;
const AUTO_RESUME_DELAY_MS = 2000;

type ScannerStatus = 'starting' | 'scanning' | 'matched' | 'error';
type ScannerToast = { message: string; variant: 'success' | 'warning' };

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
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoResumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private isScanning = false;
  private noMatchStreak = 0;

  protected readonly status = signal<ScannerStatus>('starting');
  protected readonly cameraErrorMessage = signal<string | null>(null);
  protected readonly toast = signal<ScannerToast | null>(null);
  protected readonly availableCameras = signal<MediaDeviceInfo[]>([]);
  protected readonly selectedDeviceId = signal<string | null>(null);

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

    this.selectedDeviceId.set(this.stream.getVideoTracks()[0]?.getSettings().deviceId ?? null);
    // Now that permission is granted, labels are populated - (re-)populate
    // the camera picker.
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras.set(devices.filter((d) => d.kind === 'videoinput'));
    } catch {
      // Picker just stays empty; not fatal.
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

  private scheduleNextCapture() {
    if (!this.isScanning) return;
    this.timerHandle = setTimeout(() => void this.captureAndAnalyze(), CAPTURE_INTERVAL_MS);
  }

  private async captureAndAnalyze() {
    console.log('analyzing frame');
    if (!this.isScanning || this.status() !== 'scanning') return;

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
      if (this.isScanning && this.status() === 'scanning') this.scheduleNextCapture();
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
    if (ocrResult.confidence <= OCR_CONFIDENCE_THRESHOLD) return false;

    // Primary path (MTG only): the set code + collector number printed at
    // the bottom of the card is exact and language-independent. Yu-Gi-Oh
    // has no equivalent structured identifier.
    if (this.gameService.currentSlug() === 'mtg') {
      const bySetCode = await this.tryIdentifyBySetCode(ocrResult.text);
      if (bySetCode) {
        this.onMatch(bySetCode);
        return true;
      }
    }

    // Fallback: search for the printed name (used for Yu-Gi-Oh always, and
    // for MTG whenever the set-code strip wasn't in/readable in this frame).
    const byName = await this.tryIdentifyByName(ocrResult.lines);
    if (byName) {
      this.onMatch(byName);
      return true;
    }

    return false;
  }

  private async tryIdentifyBySetCode(text: string): Promise<CardIdentification | null> {
    const parsed = parseSetCode(text);
    if (!parsed) return null;

    const card = await this.mtgApi.getCardBySetAndNumber(parsed.setCode, parsed.collectorNumber);
    if (!card) return null;

    // Exact structural match, not a fuzzy text guess - always full confidence.
    return { card, confidence: 1 };
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

    this.captureCanvas.width = width;
    this.captureCanvas.height = height;

    // Some browsers briefly report a tiny placeholder videoWidth/videoHeight
    // while the stream is still settling - drawing from that produces a
    // near-zero canvas Tesseract can't handle. Skip the frame; the next
    // capture tick will have real dimensions.
    if (this.captureCanvas.width < 10 || this.captureCanvas.height < 10) return null;

    const ctx = this.captureCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.filter = 'grayscale(1) contrast(1.4)';
    ctx.drawImage(videoEl, 0, 0, width, height);
    return this.captureCanvas;
  }

  private onMatch(result: CardIdentification) {
    this.quantity.set(1);
    this.foil.set(false);
    this.addError.set(null);
    this.detectedCard.set(result.card);
    this.status.set('matched');
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
    this.detectedCard.set(null);
    this.status.set('scanning');
    this.scheduleNextCapture();
  }
}
