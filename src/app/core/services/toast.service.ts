import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'warning';
export interface ToastMessage {
  message: string;
  variant: ToastVariant;
}

const DEFAULT_DURATION_MS = 4000;

/**
 * App-wide toast, distinct from the scanner's own local one (see scanner.ts)
 * - that one is scoped to feedback about a single scan action shown right on
 * the camera view; this one is for background work (e.g. the oracle_id
 * backfill) that can finish while the user is on any page. Rendered once via
 * GlobalToast, mounted in the app shell.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastMessage | null>(null);
  private timeout: ReturnType<typeof setTimeout> | null = null;

  show(message: string, variant: ToastVariant = 'success', durationMs = DEFAULT_DURATION_MS) {
    if (this.timeout) clearTimeout(this.timeout);
    this.current.set({ message, variant });
    this.timeout = setTimeout(() => this.current.set(null), durationMs);
  }
}
