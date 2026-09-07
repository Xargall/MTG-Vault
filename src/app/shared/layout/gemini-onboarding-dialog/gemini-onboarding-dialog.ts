import { Component, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-gemini-onboarding-dialog',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './gemini-onboarding-dialog.html',
  styleUrl: './gemini-onboarding-dialog.scss',
})
export class GeminiOnboardingDialog {
  readonly setup = output<void>();
  readonly dismiss = output<void>();
}
