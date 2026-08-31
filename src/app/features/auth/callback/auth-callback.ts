import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `<p class="callback-message">Anmeldung wird abgeschlossen…</p>`,
  styles: [
    `
      .callback-message {
        display: flex;
        justify-content: center;
        padding: var(--spacing-lg);
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class AuthCallback {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigateByUrl('/');
      }
    });
  }
}
