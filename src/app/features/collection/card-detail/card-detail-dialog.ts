import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card, MtgCard, PokemonCard, YugiohBanlistStatus, YugiohCard } from '../../../core/models/card.model';
import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';
import { ATTRIBUTE_CATEGORIES } from '../yugioh-collection-stats';
import { COLOR_CATEGORIES, getEntryPrice } from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';
import { pokemonCategoryFor, POKEMON_CATEGORIES } from '../pokemon-collection-stats';

const SYMBOL_COLORS = new Map<string, string>(
  COLOR_CATEGORIES.map(({ key, color }) => [key, color]),
);

const ATTRIBUTE_COLORS = new Map<string, string>(
  ATTRIBUTE_CATEGORIES.map(({ key, color }) => [key, color]),
);

const POKEMON_TYPE_COLORS = new Map<string, string>(
  POKEMON_CATEGORIES.map(({ key, color }) => [key, color]),
);

// Values are i18n keys, resolved via the `translate` pipe in the template -
// same convention as COLOR_CATEGORIES' `label` field.
const RARITY_LABELS: Record<string, string> = {
  common: 'rarity.common',
  uncommon: 'rarity.uncommon',
  rare: 'rarity.rare',
  mythic: 'rarity.mythic',
  special: 'rarity.special',
  bonus: 'rarity.bonus',
};

const BANLIST_LABELS: Record<YugiohBanlistStatus, string> = {
  Forbidden: 'yugioh.banlistForbidden',
  Limited: 'yugioh.banlistLimited',
  'Semi-Limited': 'yugioh.banlistSemiLimited',
};

@Component({
  selector: 'app-card-detail-dialog',
  imports: [DecimalPipe, FormsModule, TranslatePipe, ScrollLockDirective],
  templateUrl: './card-detail-dialog.html',
  styleUrl: './card-detail-dialog.scss',
})
export class CardDetailDialog {
  private readonly collectionService = inject(CollectionService);
  private readonly translate = inject(TranslateService);

  readonly entry = input.required<CollectionEntry>();
  readonly close = output<void>();
  readonly deleted = output<void>();
  // Emitted after a quantity/foil edit is saved - the parent reloads the
  // collection (same as `deleted`) so the grid/stats reflect the change too,
  // not just this dialog.
  readonly updated = output<void>();

  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  async confirmDelete() {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.collectionService.deleteEntry(this.entry().row.id);
      this.deleted.emit();
      this.close.emit();
    } catch (error) {
      this.deleteError.set(
        error instanceof Error ? error.message : this.translate.instant('cardDetail.deleteFailed'),
      );
    } finally {
      this.deleting.set(false);
    }
  }

  protected readonly editing = signal(false);
  protected readonly editQuantity = signal(1);
  protected readonly editFoil = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected startEdit() {
    this.editQuantity.set(this.entry().row.quantity);
    this.editFoil.set(this.entry().row.foil);
    this.saveError.set(null);
    this.editing.set(true);
  }

  protected cancelEdit() {
    this.editing.set(false);
    this.saveError.set(null);
  }

  async saveEdit() {
    const quantity = Math.trunc(this.editQuantity());
    if (!Number.isFinite(quantity) || quantity < 1) {
      this.saveError.set(this.translate.instant('cardDetail.invalidQuantity'));
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.collectionService.updateEntry(this.entry().row.id, {
        quantity,
        foil: this.entry().card.game === 'mtg' ? this.editFoil() : this.entry().row.foil,
      });
      this.editing.set(false);
      this.updated.emit();
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : this.translate.instant('cardDetail.saveFailed'),
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected readonly rarityLabel = computed(() => {
    const rarity = this.entry().card.rarity;
    if (!rarity) return null;
    return this.entry().card.game === 'mtg' ? (RARITY_LABELS[rarity] ?? rarity) : rarity;
  });

  protected readonly price = computed(() => getEntryPrice(this.entry(), 'eur'));

  protected asMtgCard(card: Card): MtgCard | null {
    return card.game === 'mtg' ? card : null;
  }

  protected asYugiohCard(card: Card): YugiohCard | null {
    return card.game === 'yugioh' ? card : null;
  }

  protected asPokemonCard(card: Card): PokemonCard | null {
    return card.game === 'pokemon' ? card : null;
  }

  protected readonly cardmarketUrl = computed(
    () => this.asMtgCard(this.entry().card)?.cardmarketUrl ?? null,
  );

  protected readonly manaSymbols = computed(() => {
    const card = this.asMtgCard(this.entry().card);
    const manaCost = card?.manaCost || '';
    const matches = [...manaCost.matchAll(/\{([^}]+)\}/g)];
    return matches.map((match) => {
      const symbol = match[1];
      return { symbol, color: SYMBOL_COLORS.get(symbol[0]) ?? 'var(--color-border)' };
    });
  });

  protected readonly attributeColor = computed(() => {
    const card = this.asYugiohCard(this.entry().card);
    return card?.attribute ? (ATTRIBUTE_COLORS.get(card.attribute) ?? 'var(--color-border)') : null;
  });

  protected readonly banlistLabel = computed(() => {
    const card = this.asYugiohCard(this.entry().card);
    return card?.banlistStatus ? BANLIST_LABELS[card.banlistStatus] : null;
  });

  protected readonly pokemonTypeColor = computed(() => {
    const card = this.asPokemonCard(this.entry().card);
    if (!card) return null;
    return POKEMON_TYPE_COLORS.get(pokemonCategoryFor(card)) ?? 'var(--color-border)';
  });
}
