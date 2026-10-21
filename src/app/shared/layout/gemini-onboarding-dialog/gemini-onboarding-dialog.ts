import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AppDialog } from '../../dialog/dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gemini-onboarding-dialog',
  imports: [RouterLink, TranslatePipe, AppDialog],
  templateUrl: './gemini-onboarding-dialog.html',
  styleUrl: './gemini-onboarding-dialog.scss',
})
export class GeminiOnboardingDialog {
  readonly setup = output<void>();
  readonly dismiss = output<void>();
}
