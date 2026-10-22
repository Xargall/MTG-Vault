import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { App } from './app';
import { InlineTranslateLoader } from './core/i18n/inline-translate-loader';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideTranslateService({ loader: InlineTranslateLoader, lang: 'de', fallbackLang: 'de' }),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
