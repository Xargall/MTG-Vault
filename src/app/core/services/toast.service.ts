import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'warning';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastMessage {
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

export interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number;
  /** One inline action, typically "Undo" for a just-applied destructive change. */
  action?: ToastAction;
}

const DEFAULT_DURATION_MS = 4000;

/**
 * App-wide toast, distinct from the scanner's own local one (see scanner.ts)
 * - that one is scoped to feedback about a single scan action shown right on
 * the camera view; this one is for background work (e.g. the oracle_id
 * backfill) and undoable actions that can finish while the user is on any
 * page. Rendered once via GlobalToast, mounted in the app shell.
 *
 * The countdown pauses while the tab is hidden, so a message (and its Undo)
 * can't expire unseen in a backgrounded tab.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastMessage | null>(null);
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private remainingMs = 0;
  private startedAt = 0;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (!this.current()) return;
      if (document.hidden) this.pause();
      else this.startTimer(this.remainingMs);
    });
  }

  show(message: string, variantOrOptions: ToastVariant | ToastOptions = 'success', durationMs?: number) {
    const options: ToastOptions =
      typeof variantOrOptions === 'string' ? { variant: variantOrOptions, durationMs } : variantOrOptions;
    this.current.set({ message, variant: options.variant ?? 'success', action: options.action });
    this.startTimer(options.durationMs ?? DEFAULT_DURATION_MS);
  }

  dismiss() {
    this.clearTimer();
    this.current.set(null);
  }

  /** Runs the toast's action (if any) and closes it. */
  runAction() {
    const action = this.current()?.action;
    this.dismiss();
    action?.run();
  }

  private startTimer(ms: number) {
    this.clearTimer();
    this.remainingMs = ms;
    this.startedAt = Date.now();
    this.timeout = setTimeout(() => this.current.set(null), ms);
  }

  private pause() {
    this.clearTimer();
    this.remainingMs = Math.max(0, this.remainingMs - (Date.now() - this.startedAt));
  }

  private clearTimer() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
  }
}
