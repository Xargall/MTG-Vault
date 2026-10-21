import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AppDialog } from '../../../shared/dialog/dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-demo-scan-blocked-dialog',
  imports: [RouterLink, TranslatePipe, AppDialog],
  templateUrl: './demo-scan-blocked-dialog.html',
  styleUrl: './demo-scan-blocked-dialog.scss',
})
export class DemoScanBlockedDialog {
  readonly close = output<void>();
}
