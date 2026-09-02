import { Injectable } from '@angular/core';
import { createWorker, OEM, PSM, Worker } from 'tesseract.js';

export interface OcrOptions {
  /** Tesseract page segmentation mode, defaults to PSM.SINGLE_BLOCK (a whole card image). */
  pageSegMode?: PSM;
  /** Restrict recognition to these characters (empty string = no restriction). */
  charWhitelist?: string;
}

export interface OcrLine {
  text: string;
  /** Tesseract's confidence in this specific line, 0-100. */
  confidence: number;
}

export interface OcrResult {
  text: string;
  /** Tesseract's own confidence in the whole-image transcription, 0-100. */
  confidence: number;
  lines: OcrLine[];
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private workerPromise: Promise<Worker> | null = null;

  private getWorker(): Promise<Worker> {
    return (this.workerPromise ??= createWorker(['deu', 'eng'], OEM.LSTM_ONLY));
  }

  async recognizeText(source: HTMLCanvasElement, options: OcrOptions = {}): Promise<OcrResult> {
    const worker = await this.getWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: options.pageSegMode ?? PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: options.charWhitelist ?? '',
    });
    const { data } = await worker.recognize(source);
    return {
      text: data.text.trim(),
      confidence: data.confidence,
      lines: data.lines.map((line) => ({ text: line.text.trim(), confidence: line.confidence })),
    };
  }

  /** Shuts down the current worker (if any) so no OCR work continues in the background; a fresh one is created lazily on next use. */
  async terminate(): Promise<void> {
    const workerPromise = this.workerPromise;
    this.workerPromise = null;
    if (workerPromise) {
      const worker = await workerPromise;
      await worker.terminate();
    }
  }
}
