import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { demoScanGuard } from './core/guards/demo-scan.guard';
import { selectGameGuard } from './core/guards/select-game.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'auth.loginTitle',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'select-game',
    title: 'selectGame.title',
    canActivate: [selectGameGuard],
    loadComponent: () =>
      import('./features/auth/select-game/select-game').then((m) => m.SelectGame),
  },
  {
    path: 'invite',
    title: 'auth.inviteTitle',
    loadComponent: () => import('./features/auth/invite/invite').then((m) => m.Invite),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/callback/auth-callback').then((m) => m.AuthCallback),
  },
  {
    // Outside the authGuard-protected shell on purpose - a German Impressum
    // (§ 5 TMG) must be reachable without logging in first.
    path: 'impressum',
    title: 'footer.impressum',
    loadComponent: () => import('./features/legal/impressum/impressum').then((m) => m.Impressum),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        title: 'nav.overview',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'collection',
        title: 'collection.title',
        loadComponent: () =>
          import('./features/collection/overview/collection-overview').then(
            (m) => m.CollectionOverview,
          ),
      },
      {
        path: 'decks',
        title: 'decks.title',
        loadComponent: () => import('./features/decks/decks').then((m) => m.Decks),
      },
      {
        path: 'wishlist',
        title: 'wishlist.title',
        loadComponent: () => import('./features/wishlist/wishlist').then((m) => m.Wishlist),
      },
      {
        path: 'scan',
        title: 'nav.scan',
        canActivate: [demoScanGuard],
        loadComponent: () => import('./features/scanner/scanner').then((m) => m.Scanner),
      },
      {
        path: 'playtest',
        title: 'playtest.title',
        loadComponent: () => import('./features/playtest/playtest').then((m) => m.Playtest),
      },
      {
        path: 'profile',
        title: 'profile.title',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'help',
        title: 'help.title',
        loadComponent: () => import('./features/help/help').then((m) => m.Help),
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            title: 'settings.title',
            loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
          },
          {
            path: 'gemini',
            title: 'geminiKey.title',
            loadComponent: () =>
              import('./features/settings/gemini-key/gemini-key').then((m) => m.GeminiKey),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
