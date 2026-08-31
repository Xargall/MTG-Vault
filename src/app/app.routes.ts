import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
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
        loadComponent: () => import('./features/decks/decks').then((m) => m.Decks),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
