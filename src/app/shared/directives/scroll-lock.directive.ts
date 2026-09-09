import { Directive, Injectable, OnDestroy, inject } from '@angular/core';

/** Reference-counted so several dialogs open at once (e.g. a confirm dialog opened from within another dialog) don't unlock the body until the last one actually closes. */
@Injectable({ providedIn: 'root' })
export class ScrollLockService {
  private count = 0;

  lock(): void {
    if (this.count === 0) document.body.classList.add('scroll-locked');
    this.count++;
  }

  unlock(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) document.body.classList.remove('scroll-locked');
  }
}

/** Put on a dialog's own backdrop element (`<div class="backdrop" appScrollLock ...>`) - locks page scroll for as long as the dialog is in the DOM, unlocks on close. */
@Directive({ selector: '[appScrollLock]' })
export class ScrollLockDirective implements OnDestroy {
  private readonly scrollLock = inject(ScrollLockService);

  constructor() {
    this.scrollLock.lock();
  }

  ngOnDestroy(): void {
    this.scrollLock.unlock();
  }
}
