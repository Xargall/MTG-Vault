import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  booleanAttribute,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ScrollLockDirective } from '../directives/scroll-lock.directive';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let nextId = 0;

/**
 * Shared modal shell: backdrop, panel, header with title + close button.
 * Owns everything every dialog needs and used to re-implement (or skip):
 * scroll lock, role="dialog"/aria-modal, Escape and backdrop dismissal,
 * initial focus (the first [autofocus] element, else the panel), a Tab
 * focus trap, and returning focus to whatever opened it. Below 480px the
 * panel docks to the bottom edge as a sheet, within thumb reach.
 *
 * Usage:
 *   <app-dialog [heading]="'addCard.title' | translate" maxWidth="720px" (closeRequest)="close.emit()">
 *     ...body...
 *   </app-dialog>
 *
 * `bare` drops the built-in header for dialogs that draw their own (the deck
 * detail hero) - pass `labelledBy` with the id of that dialog's own heading.
 * Extra header controls go in an element marked `dialogHeaderActions`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dialog',
  imports: [TranslatePipe, ScrollLockDirective],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class AppDialog implements OnDestroy {
  readonly heading = input<string>('');
  readonly maxWidth = input<string>('560px');
  /** false while the dialog must not be dismissed (e.g. mid-import): hides the close button and ignores Escape/backdrop. */
  readonly closable = input(true, { transform: booleanAttribute });
  readonly bare = input(false, { transform: booleanAttribute });
  readonly labelledBy = input<string | null>(null);

  readonly closeRequest = output<void>();

  protected readonly headingId = `dialog-heading-${nextId++}`;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  // Only the topmost open dialog reacts to Escape/Tab, so a dialog opened from
  // within another one doesn't close both on a single keypress.
  private static readonly stack: AppDialog[] = [];
  private readonly returnFocusTo: HTMLElement | null =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  constructor() {
    AppDialog.stack.push(this);
    afterNextRender(() => {
      const panel = this.panel().nativeElement;
      const initial = panel.querySelector<HTMLElement>('[autofocus]');
      (initial ?? panel).focus({ preventScroll: true });
    });
  }

  ngOnDestroy(): void {
    const index = AppDialog.stack.indexOf(this);
    if (index !== -1) AppDialog.stack.splice(index, 1);
    if (this.returnFocusTo?.isConnected) this.returnFocusTo.focus({ preventScroll: true });
  }

  protected requestClose(): void {
    if (this.closable()) this.closeRequest.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (AppDialog.stack.at(-1) !== this) return;

    if (event.key === 'Escape') {
      event.stopPropagation();
      this.requestClose();
      return;
    }

    if (event.key === 'Tab') this.trapFocus(event);
  }

  private trapFocus(event: KeyboardEvent): void {
    const panel = this.panel().nativeElement;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
