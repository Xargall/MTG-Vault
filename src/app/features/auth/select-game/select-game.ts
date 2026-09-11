import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GameSlug } from '../../../core/models/card.model';
import { GameService } from '../../../core/services/game.service';
import { CollectionService } from '../../collection/collection.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-select-game',
  imports: [TranslatePipe],
  templateUrl: './select-game.html',
  styleUrl: './select-game.scss',
})
export class SelectGame {
  protected readonly gameService = inject(GameService);
  private readonly collectionService = inject(CollectionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  protected readonly loading = signal(true);
  protected readonly choosing = signal<GameSlug | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly cardCountsByGameId = signal<Map<string, number>>(new Map());

  protected readonly cardCountFor = (slug: GameSlug) => {
    const gameId = this.gameService.games().find((g) => g.slug === slug)?.id;
    return gameId ? (this.cardCountsByGameId().get(gameId) ?? 0) : 0;
  };

  constructor() {
    this.load();
  }

  private async load() {
    try {
      await this.gameService.ready;
      this.cardCountsByGameId.set(await this.collectionService.getQuantityTotalsByGame());
    } catch {
      // Tiles just show 0 cards if this fails - not worth blocking the picker over.
    } finally {
      this.loading.set(false);
    }
  }

  protected async choose(slug: GameSlug) {
    if (this.choosing()) return;
    this.choosing.set(slug);
    this.errorMessage.set(null);
    try {
      await this.gameService.chooseGame(slug);
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/';
      await this.router.navigateByUrl(redirectTo);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : this.translate.instant('selectGame.chooseFailed'),
      );
      this.choosing.set(null);
    }
  }
}
