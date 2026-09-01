import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  imports: [TranslatePipe],
  template: `<p class="callback-message">{{ 'auth.completing' | translate }}</p>`,
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
