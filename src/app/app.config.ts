import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { InlineTranslateLoader } from './core/i18n/inline-translate-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideTranslateService({
      // A bare class here still works (ngx-translate auto-wraps it), but
      // triggers a one-line console.warn nudging toward this explicit form.
      loader: provideTranslateLoader(InlineTranslateLoader),
      lang: 'de',
      fallbackLang: 'de',
    }),
  ],
};
