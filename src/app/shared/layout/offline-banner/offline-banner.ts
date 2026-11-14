import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * A thin ribbon while the browser reports no connection. Saved card images
 * (service worker cache) and the app itself keep working; collection data and
 * prices always come live, so they are what can be missing - the text says so.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-offline-banner',
  imports: [TranslatePipe],
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.scss',
})
export class OfflineBanner {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly offline = signal(typeof navigator !== 'undefined' && navigator.onLine === false);

  constructor() {
    const goOffline = () => this.offline.set(true);
    const goOnline = () => this.offline.set(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    });
  }
}
