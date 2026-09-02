import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-guest-banner',
  imports: [TranslatePipe],
  templateUrl: './guest-banner.html',
  styleUrl: './guest-banner.scss',
})
export class GuestBanner {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = signal(Date.now());

  readonly remainingHours = computed(() => {
    const expiresAt = this.authService.guestExpiresAt();
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((expiresAt.getTime() - this.now()) / (60 * 60 * 1000)));
  });

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }
}
