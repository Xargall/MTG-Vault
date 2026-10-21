import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { GameSlug } from '../../../core/models/card.model';
import { GameService } from '../../../core/services/game.service';
import { setAppLanguage } from '../../../core/utils/language.util';
import { AppFooter } from '../app-footer/app-footer';
import { GeminiOnboardingDialog } from '../gemini-onboarding-dialog/gemini-onboarding-dialog';
import { GuestBanner } from '../guest-banner/guest-banner';
import { UserMenu } from '../user-menu/user-menu';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    AppFooter,
    GuestBanner,
    GeminiOnboardingDialog,
    UserMenu,
    TranslatePipe,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly authService = inject(AuthService);
  protected readonly translate = inject(TranslateService);
  protected readonly gameService = inject(GameService);
  private readonly destroyRef = inject(DestroyRef);

  // Guests can't reach the scanner at all (see demoScanGuard), so a Gemini
  // key would be useless to them - only ever nag/offer this to real accounts.
  protected readonly showGeminiOnboarding = computed(
    () =>
      this.authService.isAuthenticated() &&
      !this.authService.isGuest() &&
      !this.authService.hasSeenGeminiOnboarding(),
  );

  /** True once (most of) the full header plaque is out of view - drives the slim plaque shown on phones. */
  protected readonly headerScrolledAway = signal(false);
  private readonly shellHeader = viewChild.required<ElementRef<HTMLElement>>('shellHeader');

  constructor() {
    // An observer rather than a scroll listener: the full header stays in
    // normal flow and scrolls away as-is, so swapping in the slim plaque
    // never changes layout height (no scroll-anchoring jitter at the edge).
    afterNextRender(() => {
      const observer = new IntersectionObserver(
        ([entry]) => this.headerScrolledAway.set(entry.intersectionRatio < 0.25),
        { threshold: [0, 0.25, 1] },
      );
      observer.observe(this.shellHeader().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Reflects the active game on <body> (not just this component's own
    // template) so the global, var()-driven color theme in styles.scss can
    // re-skin the whole app per game, not just the header.
    effect(() => {
      document.body.dataset['game'] = this.gameService.currentSlug();
      syncThemeColor();
    });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setLang(lang: 'de' | 'en') {
    setAppLanguage(this.translate, lang);
  }

  /**
   * Switching games re-skins the whole app - "turning to another chapter" -
   * so it gets the one authored transition: a cross-fade of the old skin
   * into the new. The skin is applied synchronously inside the callback
   * (the effect above would only do it a tick later) so the transition
   * captures it as its "after" state.
   */
  setGame(slug: string) {
    const apply = () => {
      this.gameService.setGame(slug as GameSlug);
      document.body.dataset['game'] = slug;
      syncThemeColor();
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduceMotion) {
      apply();
      return;
    }
    document.startViewTransition(apply);
  }

  async dismissGeminiOnboarding() {
    await this.authService.markGeminiOnboardingSeen();
  }
}

/** Browser chrome (mobile status bar, installed-PWA title bar) follows the active game's background instead of always showing the MTG brown. */
function syncThemeColor() {
  const background = getComputedStyle(document.body).getPropertyValue('--color-bg').trim();
  if (background) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
}
