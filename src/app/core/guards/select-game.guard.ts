import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';

/**
 * Guards /select-game itself: same base auth checks as authGuard, but
 * deliberately without the hasChosenGame redirect - that route sends users
 * here in the first place, and this page is also reachable voluntarily
 * (the header's "switch game" link) after a game has already been chosen.
 */
export const selectGameGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  await supabase.ready;

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
  }
  if (authService.isGuestExpired()) {
    await authService.signOut();
    return router.createUrlTree(['/login'], { queryParams: { error: 'demoExpired' } });
  }

  return true;
};
