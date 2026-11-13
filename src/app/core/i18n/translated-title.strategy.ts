import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

const APP_NAME = 'TCG Vault';

/**
 * Route `title` values are translation keys (see app.routes.ts), resolved
 * here into "Sammlung · TCG Vault" - so browser tabs, history entries and
 * screen-reader page announcements name the actual page instead of every
 * route sharing the one static title from index.html.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private subscription: Subscription | null = null;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.subscription?.unsubscribe();
    this.subscription = null;

    const key = this.buildTitle(snapshot);
    if (!key) {
      this.title.setTitle(APP_NAME);
      return;
    }

    // stream() rather than instant(): re-emits on a language switch, so the
    // title follows DE/EN without waiting for the next navigation.
    this.subscription = this.translate
      .stream(key)
      .subscribe((text) => this.title.setTitle(`${text} · ${APP_NAME}`));
  }
}
