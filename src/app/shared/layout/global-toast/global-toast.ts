import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-global-toast',
  templateUrl: './global-toast.html',
  styleUrl: './global-toast.scss',
})
export class GlobalToast {
  protected readonly toastService = inject(ToastService);
}
