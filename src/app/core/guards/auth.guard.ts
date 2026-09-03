import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  await supabase.ready;

  if (authService.isAuthenticated()) {
    if (authService.isGuestExpired()) {
      await authService.signOut();
      return router.createUrlTree(['/login'], { queryParams: { error: 'demoExpired' } });
    }
    if (!authService.hasChosenGame()) {
      return router.createUrlTree(['/select-game'], { queryParams: { redirectTo: state.url } });
    }
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
};
