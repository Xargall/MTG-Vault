import { Injectable } from '@angular/core';
import { createWorker, PSM, Worker } from 'tesseract.js';

export interface OcrOptions {
  /** Tesseract page segmentation mode, e.g. PSM.SINGLE_LINE for a single tight text strip. */
  pageSegMode?: PSM;
  /** Restrict recognition to these characters (empty string = no restriction). */
  charWhitelist?: string;
}

export interface OcrResult {
  text: string;
  /** Tesseract's own confidence in the transcription, 0-100. */
  confidence: number;
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private workerPromise: Promise<Worker> | null = null;

  private getWorker(): Promise<Worker> {
    return (this.workerPromise ??= createWorker(['eng', 'deu']));
  }

  async recognizeText(source: HTMLCanvasElement, options: OcrOptions = {}): Promise<OcrResult> {
    const worker = await this.getWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: options.pageSegMode ?? PSM.SINGLE_LINE,
      tessedit_char_whitelist: options.charWhitelist ?? '',
    });
    const { data } = await worker.recognize(source);
    return { text: data.text.trim(), confidence: data.confidence };
  }
}
