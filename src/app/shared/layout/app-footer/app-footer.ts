import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-footer',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './app-footer.html',
  styleUrl: './app-footer.scss',
})
export class AppFooter {
  protected readonly year = new Date().getFullYear();
}
