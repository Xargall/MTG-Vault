import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PSM } from 'tesseract.js';

import { Card } from '../../core/models/card.model';
import { CardIdentification } from '../../core/services/card-api.interface';
import { CollectionService } from '../collection/collection.service';
import { GameService } from '../../core/services/game.service';
import { MtgApiService } from '../../core/services/mtg-api.service';
import { OcrService } from '../../core/services/ocr.service';
import { extractNameCandidate, fixUmlauts } from '../../core/utils/string-similarity';
import { parseSetCode } from '../../core/utils/set-code-parser';
import { CardTile } from '../../shared/cards/card-tile/card-tile';

const CAPTURE_INTERVAL_MS = 800;
// Sized generously (rather than tight to the printed name/collector strip)
// so the card doesn't have to fill the whole frame to give OCR enough
// resolution - holding it that close pushes most cameras past their
// minimum focus distance and the image comes out blurry.
const NAME_BAND = { from: 0, to: 0.28 };
const SET_CODE_BAND = { from: 0.8, to: 1 };
const NAME_UPSCALE = 2;
const NAME_CONTRAST = 1.6;
const SET_CODE_CONTRAST = 1.4;
const OCR_CONFIDENCE_THRESHOLD = 70;
const ADD_CONFIRMATION_MS = 1500;
const NAME_CHAR_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß ,'-";

type ScannerStatus = 'starting' | 'scanning' | 'matched' | 'error';

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
  private readonly cropCanvas = document.createElement('canvas');
  private stream: MediaStream | null = null;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;

  protected readonly status = signal<ScannerStatus>('starting');
  protected readonly cameraErrorMessage = signal<string | null>(null);

  protected readonly nameZoneHeightPercent = NAME_BAND.to * 100;
  protected readonly setCodeZoneHeightPercent = (1 - SET_CODE_BAND.from) * 100;
  protected readonly dimOverlayBottomPercent = computed(() =>
    this.gameService.currentSlug() === 'mtg' ? this.setCodeZoneHeightPercent : 0,
  );

  protected readonly detectedCard = signal<Card | null>(null);
  protected readonly quantity = signal(1);
  protected readonly foil = signal(false);
  protected readonly adding = signal(false);
  protected readonly addError = signal<string | null>(null);
  protected readonly justAdded = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.timerHandle) clearTimeout(this.timerHandle);
      this.stream?.getTracks().forEach((track) => track.stop());
    });

    afterNextRender(() => void this.startCamera());
  }

  private async startCamera() {
    const videoEl = this.video()?.nativeElement;
    if (!videoEl) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
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

    this.status.set('scanning');
    this.scheduleNextCapture();
  }

  private scheduleNextCapture() {
    this.timerHandle = setTimeout(() => void this.captureAndAnalyze(), CAPTURE_INTERVAL_MS);
  }

  private async captureAndAnalyze() {
    if (this.status() !== 'scanning') return;

    try {
      await this.analyzeFrame();
    } catch {
      // Bad lighting, blur, no text, a network hiccup on the lookup - all
      // expected and transient. Stay silent and just keep scanning.
    } finally {
      if (this.status() === 'scanning') this.scheduleNextCapture();
    }
  }

  private async analyzeFrame() {
    const videoEl = this.video()?.nativeElement;
    if (!videoEl || videoEl.readyState < 2) return;

    // Primary path (MTG only): the set code + collector number printed at
    // the bottom of the card is exact and language-independent, so it's
    // tried first. Yu-Gi-Oh has no equivalent structured identifier.
    if (this.gameService.currentSlug() === 'mtg') {
      const bySetCode = await this.tryIdentifyBySetCode(videoEl);
      if (bySetCode) {
        this.onMatch(bySetCode);
        return;
      }
    }

    // Fallback: OCR the printed name and search for it (used for Yu-Gi-Oh
    // always, and for MTG whenever the set-code strip wasn't readable).
    const byName = await this.tryIdentifyByName(videoEl);
    if (byName) {
      this.onMatch(byName);
    }
  }

  private async tryIdentifyBySetCode(videoEl: HTMLVideoElement): Promise<CardIdentification | null> {
    const canvas = this.cropRegion(videoEl, SET_CODE_BAND.from, SET_CODE_BAND.to, {
      contrast: SET_CODE_CONTRAST,
    });
    if (!canvas) return null;

    const { text, confidence } = await this.ocrService.recognizeText(canvas);
    if (confidence <= OCR_CONFIDENCE_THRESHOLD) return null;

    const parsed = parseSetCode(text);
    if (!parsed) return null;

    const card = await this.mtgApi.getCardBySetAndNumber(parsed.setCode, parsed.collectorNumber);
    if (!card) return null;

    // Exact structural match, not a fuzzy text guess - always full confidence.
    return { card, confidence: 1 };
  }

  private async tryIdentifyByName(videoEl: HTMLVideoElement): Promise<CardIdentification | null> {
    const canvas = this.cropRegion(videoEl, NAME_BAND.from, NAME_BAND.to, {
      scale: NAME_UPSCALE,
      contrast: NAME_CONTRAST,
    });
    if (!canvas) return null;

    const { text, confidence } = await this.ocrService.recognizeText(canvas, {
      pageSegMode: PSM.SINGLE_LINE,
      charWhitelist: NAME_CHAR_WHITELIST,
    });
    if (confidence <= OCR_CONFIDENCE_THRESHOLD) return null;

    const candidate = extractNameCandidate(fixUmlauts(text));
    if (!candidate) return null;

    return this.gameService.cardApi().identifyCard(candidate);
  }

  private cropRegion(
    videoEl: HTMLVideoElement,
    fromRatio: number,
    toRatio: number,
    options: { scale?: number; contrast?: number } = {},
  ): HTMLCanvasElement | null {
    const { scale = 1, contrast = 1.4 } = options;
    const width = videoEl.videoWidth;
    const totalHeight = videoEl.videoHeight;
    if (!width || !totalHeight) return null;

    const sourceY = Math.round(totalHeight * fromRatio);
    const height = Math.round(totalHeight * (toRatio - fromRatio));
    if (!height) return null;

    this.cropCanvas.width = Math.round(width * scale);
    this.cropCanvas.height = Math.round(height * scale);

    // Some browsers briefly report a tiny placeholder videoWidth/videoHeight
    // while the stream is still settling - drawing/upscaling from that
    // produces a near-zero canvas Tesseract can't handle. Skip the frame;
    // the next capture tick will have real dimensions.
    if (this.cropCanvas.width < 10 || this.cropCanvas.height < 10) return null;

    const ctx = this.cropCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.filter = `grayscale(1) contrast(${contrast})`;
    ctx.drawImage(videoEl, 0, sourceY, width, height, 0, 0, this.cropCanvas.width, this.cropCanvas.height);
    return this.cropCanvas;
  }

  private onMatch(result: CardIdentification) {
    this.quantity.set(1);
    this.foil.set(false);
    this.addError.set(null);
    this.justAdded.set(false);
    this.detectedCard.set(result.card);
    this.status.set('matched');
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
      this.justAdded.set(true);
      setTimeout(() => this.justAdded.set(false), ADD_CONFIRMATION_MS);
    } catch (error) {
      this.addError.set(
        error instanceof Error ? error.message : this.translate.instant('scanner.addFailed'),
      );
    } finally {
      this.adding.set(false);
    }
  }

  protected keepScanning() {
    this.detectedCard.set(null);
    this.status.set('scanning');
    this.scheduleNextCapture();
  }
}
