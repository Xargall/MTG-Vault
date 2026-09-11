import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { setAppLanguage } from '../../core/utils/language.util';
import { MtgBulkDataService } from '../../core/services/mtg-bulk-data.service';
import { UserSecretsService } from '../../core/services/user-secrets.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly userSecrets = inject(UserSecretsService);
  protected readonly translate = inject(TranslateService);
  protected readonly bulkData = inject(MtgBulkDataService);

  protected readonly hasGeminiKey = this.userSecrets.hasGeminiKey;

  // Own success flag rather than reading bulkData.ready() straight after a
  // reload - ready() is also true from a merely-still-fresh cache the
  // button never touched, which would otherwise claim credit for a reload
  // that never actually ran.
  protected readonly bulkDataReloadSuccess = signal(false);

  constructor() {
    void this.userSecrets.refreshGeminiKeyStatus();
  }

  protected setLang(lang: 'de' | 'en') {
    setAppLanguage(this.translate, lang);
  }

  protected async reloadBulkData() {
    this.bulkDataReloadSuccess.set(false);
    try {
      await this.bulkData.forceReload();
      this.bulkDataReloadSuccess.set(true);
    } catch {
      // bulkData.errorMessage() already reflects the failure for display.
    }
  }
}
