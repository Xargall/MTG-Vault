import { Component, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';

@Component({
  selector: 'app-demo-scan-blocked-dialog',
  imports: [RouterLink, TranslatePipe, ScrollLockDirective],
  templateUrl: './demo-scan-blocked-dialog.html',
  styleUrl: './demo-scan-blocked-dialog.scss',
})
export class DemoScanBlockedDialog {
  readonly close = output<void>();
}
