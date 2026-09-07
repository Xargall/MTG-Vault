import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-profile',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  protected readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly nameInput = signal(this.authService.displayName());
  protected readonly savingName = signal(false);
  protected readonly nameError = signal<string | null>(null);
  protected readonly nameSaved = signal(false);

  protected readonly uploadingAvatar = signal(false);
  protected readonly avatarError = signal<string | null>(null);

  protected triggerFileSelect() {
    this.fileInput()?.nativeElement.click();
  }

  protected async saveName() {
    const name = this.nameInput().trim();
    if (!name) return;

    this.savingName.set(true);
    this.nameError.set(null);
    this.nameSaved.set(false);
    try {
      await this.authService.updateDisplayName(name);
      this.nameSaved.set(true);
    } catch (error) {
      this.nameError.set(
        error instanceof Error ? error.message : this.translate.instant('profile.saveFailed'),
      );
    } finally {
      this.savingName.set(false);
    }
  }

  protected async onAvatarSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.avatarError.set(null);
    if (!file.type.startsWith('image/')) {
      this.avatarError.set(this.translate.instant('profile.avatarInvalidType'));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      this.avatarError.set(this.translate.instant('profile.avatarTooLarge'));
      return;
    }

    this.uploadingAvatar.set(true);
    try {
      await this.authService.uploadAvatar(file);
    } catch (error) {
      this.avatarError.set(
        error instanceof Error ? error.message : this.translate.instant('profile.avatarUploadFailed'),
      );
    } finally {
      this.uploadingAvatar.set(false);
    }
  }
}
