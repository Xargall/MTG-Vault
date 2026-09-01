import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { AppFooter } from '../app-footer/app-footer';

const LANG_STORAGE_KEY = 'mtg-vault-lang';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterOutlet, AppFooter, TranslatePipe],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly translate = inject(TranslateService);

  setLang(lang: 'de' | 'en') {
    this.translate.use(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }

  async logout() {
    await this.authService.signOut();
    await this.router.navigateByUrl('/login');
  }
}
