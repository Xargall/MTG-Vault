import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { setAppLanguage } from '../../core/utils/language.util';
import { UserSecretsService } from '../../core/services/user-secrets.service';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly userSecrets = inject(UserSecretsService);
  protected readonly translate = inject(TranslateService);

  protected readonly hasGeminiKey = this.userSecrets.hasGeminiKey;

  constructor() {
    void this.userSecrets.refreshGeminiKeyStatus();
  }

  protected setLang(lang: 'de' | 'en') {
    setAppLanguage(this.translate, lang);
  }
}
