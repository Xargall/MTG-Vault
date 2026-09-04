import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';

// Gemini free tier caps requests at 15/min - this paces the client's own
// call frequency; it's not a security boundary (that's the Edge Function's
// job), just good citizenship so the shared quota isn't burned by rapid
// scan ticks.
const MIN_CALL_INTERVAL_MS = 4000;

/**
 * Thin client for the `gemini-ocr` Supabase Edge Function. The Gemini API
 * key never reaches this file or the browser bundle - it lives only in the
 * Edge Function's server-side secrets. This service just ships a cropped
 * JPEG to that function and hands back the raw recognized text (or null),
 * so callers can feed it into the exact same MtgApiService.identifyByCroppedText
 * pipeline Tesseract's output already goes through.
 */
@Injectable({ providedIn: 'root' })
export class GeminiVisionService {
  private readonly supabase = inject(SupabaseService);
  private lastCallAt = 0;

  async recognizeCollectorText(canvas: HTMLCanvasElement): Promise<string | null> {
    await this.waitForRateLimit();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const imageBase64 = dataUrl.slice(dataUrl.indexOf(',') + 1);

    const { data, error } = await this.supabase.client.functions.invoke<{ text?: string; error?: string }>(
      'gemini-ocr',
      { body: { imageBase64 } },
    );
    if (error) throw error;

    const text = data?.text?.trim();
    if (!text || text === 'UNKNOWN') return null;
    return text;
  }

  private async waitForRateLimit(): Promise<void> {
    const wait = MIN_CALL_INTERVAL_MS - (Date.now() - this.lastCallAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastCallAt = Date.now();
  }
}
