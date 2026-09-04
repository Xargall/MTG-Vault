import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Blocks direct navigation to /scan for guest/demo users - the primary UX (grayed-out button + explanatory dialog) lives in CollectionOverview; this is only a safety net against a bookmarked or typed-in URL. */
export const demoScanGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isGuest()) {
    return router.createUrlTree(['/collection']);
  }

  return true;
};
