import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { AppFooter } from '../app-footer/app-footer';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterOutlet, AppFooter],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async logout() {
    await this.authService.signOut();
    await this.router.navigateByUrl('/login');
  }
}
