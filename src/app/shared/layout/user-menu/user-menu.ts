import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-menu',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
})
export class UserMenu {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly avatarButton = viewChild<ElementRef<HTMLButtonElement>>('avatarButton');

  protected readonly open = signal(false);
  // position:fixed (not absolute) and computed here rather than CSS
  // top/right - the header this button lives in has overflow:hidden (for
  // its corner flourishes/background), which would otherwise clip an
  // absolutely-positioned dropdown taller than the header itself.
  protected readonly menuPosition = signal({ top: 0, right: 0 });

  protected toggle() {
    if (!this.open()) {
      const rect = this.avatarButton()?.nativeElement.getBoundingClientRect();
      if (rect) {
        this.menuPosition.set({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
    }
    this.open.update((v) => !v);
  }

  protected close() {
    this.open.set(false);
  }

  // Click-outside-to-close: cheaper than a CDK overlay for a menu this
  // small, and matches the rest of the app's dependency-free dialog pattern
  // (backdrop click) elsewhere.
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  // menuPosition is computed once, at open time - scrolling the page after
  // that leaves the dropdown either detached from the avatar button (if its
  // fixed-positioning containing block turns out to be an ancestor that
  // itself scrolls) or simply stale. Closing on scroll sidesteps having to
  // keep it repositioned live, and matches how most floating menus behave
  // anyway.
  @HostListener('window:scroll')
  protected onWindowScroll() {
    if (this.open()) this.close();
  }

  protected async logout() {
    this.close();
    await this.authService.signOut();
    await this.router.navigateByUrl('/login');
  }
}
