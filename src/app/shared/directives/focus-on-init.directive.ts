import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Focuses its element once it has rendered. For controls swapped in by an
 * @if (an inline confirm row, an edit form) - the HTML `autofocus` attribute
 * only works on page load, so without this focus falls back to <body> when
 * the button that opened the row disappears.
 */
@Directive({ selector: '[appFocusOnInit]' })
export class FocusOnInitDirective {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => element.focus({ preventScroll: true }));
  }
}
