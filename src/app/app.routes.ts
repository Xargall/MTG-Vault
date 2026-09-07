import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { decksSupportedGuard } from './core/guards/decks-supported.guard';
import { demoScanGuard } from './core/guards/demo-scan.guard';
import { selectGameGuard } from './core/guards/select-game.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'select-game',
    canActivate: [selectGameGuard],
    loadComponent: () =>
      import('./features/auth/select-game/select-game').then((m) => m.SelectGame),
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
      {
        path: 'scan',
        canActivate: [demoScanGuard],
        loadComponent: () => import('./features/scanner/scanner').then((m) => m.Scanner),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
          },
          {
            path: 'gemini',
            loadComponent: () =>
              import('./features/settings/gemini-key/gemini-key').then((m) => m.GeminiKey),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
