import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { YugiohApiService } from '../../../core/services/yugioh-api.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';
import { CollectionService } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';

const SUGGESTION_LIMIT = 20;

@Component({
  selector: 'app-archetype-browser-dialog',
  imports: [FormsModule, CardTile, TranslatePipe, ScrollLockDirective],
  templateUrl: './archetype-browser-dialog.html',
  styleUrl: './archetype-browser-dialog.scss',
})
export class ArchetypeBrowserDialog {
  private readonly yugiohApi = inject(YugiohApiService);
  private readonly collectionService = inject(CollectionService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();

  protected readonly query = signal('');
  protected readonly allArchetypes = signal<string[]>([]);
  protected readonly loadingArchetypes = signal(true);
  protected readonly archetypesError = signal<string | null>(null);

  protected readonly selectedArchetype = signal<string | null>(null);
  protected readonly cards = signal<Card[]>([]);
  protected readonly ownedIds = signal<Set<string>>(new Set());
  protected readonly loadingCards = signal(false);
  protected readonly cardsError = signal<string | null>(null);

  protected readonly wishlisting = signal(false);
  protected readonly wishlistError = signal<string | null>(null);
  protected readonly wishlistAdded = signal(false);

  protected readonly suggestions = computed(() => {
    const trimmed = this.query().trim().toLowerCase();
    if (!trimmed) return [];
    return this.allArchetypes()
      .filter((name) => name.toLowerCase().includes(trimmed))
      .slice(0, SUGGESTION_LIMIT);
  });

  protected readonly missingCount = computed(
    () => this.cards().filter((card) => !this.ownedIds().has(card.id)).length,
  );

  constructor() {
    this.loadArchetypes();
  }

  private async loadArchetypes() {
    this.loadingArchetypes.set(true);
    this.archetypesError.set(null);
    try {
      this.allArchetypes.set(await this.yugiohApi.getArchetypes());
    } catch (error) {
      this.archetypesError.set(
        error instanceof Error ? error.message : this.translate.instant('archetypeBrowser.listFailed'),
      );
    } finally {
      this.loadingArchetypes.set(false);
    }
  }

  async selectArchetype(name: string) {
    this.selectedArchetype.set(name);
    this.query.set(name);
    this.loadingCards.set(true);
    this.cardsError.set(null);
    this.wishlistAdded.set(false);
    try {
      const [cards, owned] = await Promise.all([
        this.yugiohApi.getCardsByArchetype(name),
        this.collectionService.getQuantitiesByCardId(),
      ]);
      this.cards.set(cards);
      this.ownedIds.set(new Set(owned.keys()));
    } catch (error) {
      this.cardsError.set(
        error instanceof Error ? error.message : this.translate.instant('archetypeBrowser.cardsFailed'),
      );
    } finally {
      this.loadingCards.set(false);
    }
  }

  backToSearch() {
    this.selectedArchetype.set(null);
    this.cards.set([]);
  }

  async addMissingToWishlist() {
    const archetype = this.selectedArchetype();
    if (!archetype) return;

    this.wishlisting.set(true);
    this.wishlistError.set(null);
    try {
      const existing = await this.wishlistService.getCardIds();
      const inputs: UpsertWishlistInput[] = this.cards()
        .filter((card) => !this.ownedIds().has(card.id) && !existing.has(card.id))
        .map((card) => ({
          cardId: card.id,
          priority: 2,
          notes: this.translate.instant('common.forDeck', { name: archetype }),
        }));

      if (inputs.length > 0) {
        await this.wishlistService.upsertMany(inputs);
      }
      this.wishlistAdded.set(true);
    } catch (error) {
      this.wishlistError.set(
        error instanceof Error ? error.message : this.translate.instant('archetypeBrowser.wishlistFailed'),
      );
    } finally {
      this.wishlisting.set(false);
    }
  }
}
