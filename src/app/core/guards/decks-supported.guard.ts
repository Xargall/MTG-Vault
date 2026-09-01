import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { GameService } from '../services/game.service';

export const decksSupportedGuard: CanActivateFn = async () => {
  const gameService = inject(GameService);
  const router = inject(Router);

  await gameService.ready;

  if (gameService.decksSupported()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
