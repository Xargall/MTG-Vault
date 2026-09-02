import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card, MtgCard, YugiohBanlistStatus, YugiohCard } from '../../../core/models/card.model';
import { ATTRIBUTE_CATEGORIES } from '../yugioh-collection-stats';
import { COLOR_CATEGORIES, getEntryPrice } from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';

const SYMBOL_COLORS = new Map<string, string>(
  COLOR_CATEGORIES.map(({ key, color }) => [key, color]),
);

const ATTRIBUTE_COLORS = new Map<string, string>(
  ATTRIBUTE_CATEGORIES.map(({ key, color }) => [key, color]),
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
  imports: [DecimalPipe, TranslatePipe],
  templateUrl: './card-detail-dialog.html',
  styleUrl: './card-detail-dialog.scss',
})
export class CardDetailDialog {
  private readonly collectionService = inject(CollectionService);
  private readonly translate = inject(TranslateService);

  readonly entry = input.required<CollectionEntry>();
  readonly close = output<void>();
  readonly deleted = output<void>();

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
}
