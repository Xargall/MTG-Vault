import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { decksSupportedGuard } from './core/guards/decks-supported.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'invite',
    loadComponent: () => import('./features/auth/invite/invite').then((m) => m.Invite),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/callback/auth-callback').then((m) => m.AuthCallback),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'collection',
        loadComponent: () =>
          import('./features/collection/overview/collection-overview').then(
            (m) => m.CollectionOverview,
          ),
      },
      {
        path: 'decks',
        canActivate: [decksSupportedGuard],
        loadComponent: () => import('./features/decks/decks').then((m) => m.Decks),
      },
      {
        path: 'wishlist',
        loadComponent: () => import('./features/wishlist/wishlist').then((m) => m.Wishlist),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
