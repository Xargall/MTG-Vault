import { Injectable, inject, signal } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

// Gemini's actual free-tier RPM limit for this model turned out lower than
// initially assumed (confirmed via a real 429 in production) - this paces
// the client's own call frequency; it's not a security boundary (that's the
// Edge Function's job), just good citizenship so the shared quota isn't
// burned by rapid scan ticks.
const MIN_CALL_INTERVAL_MS = 10000;
// After a real 429, wait longer than the normal pace before trying Gemini
// again for a subsequent frame - mirrors the same cool-off pattern the
// scanner already uses for Scryfall's rate limit (see ScryfallRateLimitError
// handling in scanner.ts).
const RATE_LIMIT_COOLDOWN_MS = 15000;

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

  // Reflects only the most recent call - reset at the start of each call so
  // a caller can check it right after awaiting to tell a real 429 apart
  // from any other reason recognizeCollectorText returned null.
  readonly rateLimited = signal(false);

  async recognizeCollectorText(canvas: HTMLCanvasElement): Promise<string | null> {
    this.rateLimited.set(false);
    await this.waitForRateLimit();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const imageBase64 = dataUrl.slice(dataUrl.indexOf(',') + 1);

    const { data, error } = await this.supabase.client.functions.invoke<{ text?: string; error?: string }>(
      'gemini-ocr',
      { body: { imageBase64 } },
    );
    if (error) {
      if (error instanceof FunctionsHttpError && error.context?.status === 429) {
        this.lastCallAt = Date.now() + RATE_LIMIT_COOLDOWN_MS - MIN_CALL_INTERVAL_MS;
        this.rateLimited.set(true);
        return null;
      }
      throw error;
    }

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
