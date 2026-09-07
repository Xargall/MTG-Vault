import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { UserSecretsService } from '../../../core/services/user-secrets.service';

@Component({
  selector: 'app-gemini-key',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './gemini-key.html',
  styleUrl: './gemini-key.scss',
})
export class GeminiKey {
  private readonly userSecrets = inject(UserSecretsService);
  private readonly translate = inject(TranslateService);

  protected readonly hasGeminiKey = this.userSecrets.hasGeminiKey;
  protected readonly geminiKeyInput = signal('');
  protected readonly saving = signal(false);
  protected readonly testing = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveSuccess = signal(false);
  protected readonly testResult = signal<'valid' | 'invalid' | null>(null);

  constructor() {
    void this.userSecrets.refreshGeminiKeyStatus();
  }

  protected async saveGeminiKey() {
    const key = this.geminiKeyInput().trim();
    if (!key) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.testResult.set(null);
    try {
      await this.userSecrets.saveGeminiKey(key);
      this.saveSuccess.set(true);
      this.geminiKeyInput.set('');
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : this.translate.instant('geminiKey.saveFailed'),
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async testGeminiKey() {
    const key = this.geminiKeyInput().trim();
    if (!key) return;

    this.testing.set(true);
    this.testResult.set(null);
    this.saveSuccess.set(false);
    try {
      const valid = await this.userSecrets.testGeminiKey(key);
      this.testResult.set(valid ? 'valid' : 'invalid');
    } finally {
      this.testing.set(false);
    }
  }
}
