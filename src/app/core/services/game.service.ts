import { Injectable, computed, inject, signal } from '@angular/core';

import { GameSlug, SUPPORTED_GAME_SLUGS } from '../models/card.model';
import { CardApiService } from './card-api.interface';
import { MtgApiService } from './mtg-api.service';
import { SupabaseService } from './supabase.service';
import { YugiohApiService } from './yugioh-api.service';

export interface Game {
  id: string;
  slug: GameSlug;
  name: string;
}

const GAME_STORAGE_KEY = 'tcg-collector-game';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly supabase = inject(SupabaseService);
  private readonly mtgApi = inject(MtgApiService);
  private readonly yugiohApi = inject(YugiohApiService);

  readonly games = signal<Game[]>([]);
  readonly currentSlug = signal<GameSlug>(this.restoreSlug());

  readonly currentGame = computed(
    () => this.games().find((g) => g.slug === this.currentSlug()) ?? null,
  );
  readonly currentGameId = computed(() => this.currentGame()?.id ?? null);

  readonly cardApi = computed<CardApiService>(() =>
    this.currentSlug() === 'yugioh' ? this.yugiohApi : this.mtgApi,
  );

  private resolveReady!: () => void;
  readonly ready: Promise<void> = new Promise((resolve) => {
    this.resolveReady = resolve;
  });

  constructor() {
    this.loadGames();
  }

  setGame(slug: GameSlug) {
    this.currentSlug.set(slug);
    localStorage.setItem(GAME_STORAGE_KEY, slug);
  }

  private async loadGames() {
    const { data, error } = await this.supabase.client
      .from('games')
      .select('id, slug, name')
      .returns<Game[]>();

    if (!error && data) {
      this.games.set(data);
    }
    this.resolveReady();
  }

  private restoreSlug(): GameSlug {
    const saved = localStorage.getItem(GAME_STORAGE_KEY);
    return SUPPORTED_GAME_SLUGS.includes(saved as GameSlug) ? (saved as GameSlug) : 'mtg';
  }
}
