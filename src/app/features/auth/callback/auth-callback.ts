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
  private handled = false;

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated() && !this.handled) {
        this.handled = true;
        void this.finish();
      }
    });
  }

  private async finish() {
    const result = await this.authService.finalizeGoogleSignIn().catch(() => 'rejected' as const);
    if (result === 'ok') {
      await this.router.navigateByUrl('/');
    } else {
      await this.router.navigate(['/login'], { queryParams: { error: 'inviteRequired' } });
    }
  }
}
