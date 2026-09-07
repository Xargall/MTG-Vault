import { Injectable, computed, inject, signal } from '@angular/core';

import { GameSlug, SUPPORTED_GAME_SLUGS } from '../models/card.model';
import { PreconDeckProvider } from '../models/precon.model';
import { CardApiService } from './card-api.interface';
import { MtgApiService } from './mtg-api.service';
import { MtgPreconService } from './mtg-precon.service';
import { PokemonApiService } from './pokemon-api.service';
import { SupabaseService } from './supabase.service';
import { YugiohApiService } from './yugioh-api.service';
import { YugiohPreconService } from './yugioh-precon.service';

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
  private readonly pokemonApi = inject(PokemonApiService);
  private readonly mtgPrecon = inject(MtgPreconService);
  private readonly yugiohPrecon = inject(YugiohPreconService);

  readonly games = signal<Game[]>([]);
  readonly currentSlug = signal<GameSlug>(this.restoreSlug());

  readonly currentGame = computed(
    () => this.games().find((g) => g.slug === this.currentSlug()) ?? null,
  );
  readonly currentGameId = computed(() => this.currentGame()?.id ?? null);

  readonly cardApi = computed<CardApiService>(() => {
    const slug = this.currentSlug();
    if (slug === 'yugioh') return this.yugiohApi;
    if (slug === 'pokemon') return this.pokemonApi;
    return this.mtgApi;
  });

  readonly precon = computed<PreconDeckProvider | null>(() => {
    const slug = this.currentSlug();
    if (slug === 'mtg') return this.mtgPrecon;
    if (slug === 'yugioh') return this.yugiohPrecon;
    return null;
  });
  // Every game supports *some* deck functionality now (own decks + manual
  // import, see DeckImportDialog) - this just gates the Decks nav tab/route,
  // not precon/community browsing specifically. Use hasPreconBrowsing for that.
  readonly decksSupported = computed(() => true);
  /** Whether the active game has a precon/community deck provider to browse - Pokémon doesn't (no viable data source yet), so its Decks page only offers manual import. */
  readonly hasPreconBrowsing = computed(() => this.precon() !== null);

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

  /** Explicit game pick from the select-game screen (or the header's "switch game" link) - unlike setGame(), also records the choice in Supabase so AuthService.hasChosenGame() is true from then on, on any device. */
  async chooseGame(slug: GameSlug): Promise<void> {
    this.setGame(slug);
    const { error } = await this.supabase.client.auth.updateUser({ data: { active_game: slug } });
    if (error) throw error;
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
