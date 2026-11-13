import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

// Shown once the page is scrolled further than this many viewport heights.
const VISIBLE_AFTER_VIEWPORTS = 1.5;

/** Floating "back to top" coin for the long pages (collection grid, help lexicon). Sits above the phone tab bar and stays out of the tab order while hidden. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-back-to-top',
  imports: [TranslatePipe],
  templateUrl: './back-to-top.html',
  styleUrl: './back-to-top.scss',
})
export class BackToTop {
  protected readonly visible = signal(false);

  constructor() {
    const onScroll = () => this.visible.set(window.scrollY > window.innerHeight * VISIBLE_AFTER_VIEWPORTS);
    window.addEventListener('scroll', onScroll, { passive: true });
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', onScroll));
  }

  protected scrollToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    // The button is about to disappear - hand focus to the page instead of
    // letting it fall back to <body>.
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }
}
