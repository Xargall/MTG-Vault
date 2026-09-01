import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { GameService } from '../../../core/services/game.service';

@Component({
  selector: 'app-footer',
  imports: [TranslatePipe],
  templateUrl: './app-footer.html',
  styleUrl: './app-footer.scss',
})
export class AppFooter {
  protected readonly gameService = inject(GameService);
  protected readonly year = new Date().getFullYear();
}
