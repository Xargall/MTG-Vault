import { Component, computed, inject } from '@angular/core';
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

  // Guests can't reach the scanner at all (see demoScanGuard), so a Gemini
  // key would be useless to them - only ever nag/offer this to real accounts.
  protected readonly showGeminiOnboarding = computed(
    () =>
      this.authService.isAuthenticated() &&
      !this.authService.isGuest() &&
      !this.authService.hasSeenGeminiOnboarding(),
  );

  setLang(lang: 'de' | 'en') {
    setAppLanguage(this.translate, lang);
  }

  setGame(slug: string) {
    this.gameService.setGame(slug as GameSlug);
  }

  async dismissGeminiOnboarding() {
    await this.authService.markGeminiOnboardingSeen();
  }
}
