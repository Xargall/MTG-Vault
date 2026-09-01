import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { GameService } from '../services/game.service';

export const mtgOnlyGuard: CanActivateFn = async () => {
  const gameService = inject(GameService);
  const router = inject(Router);

  await gameService.ready;

  if (gameService.currentSlug() === 'mtg') {
    return true;
  }

  return router.createUrlTree(['/']);
};
