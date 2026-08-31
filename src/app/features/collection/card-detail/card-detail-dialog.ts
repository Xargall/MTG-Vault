import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import { getCardImageUrl } from '../../../core/services/scryfall.service';
import { COLOR_CATEGORIES, getEntryPrice } from '../collection-stats';
import { CollectionEntry } from '../collection.service';

const SYMBOL_COLORS = new Map<string, string>(
  COLOR_CATEGORIES.map(({ key, color }) => [key, color]),
);

const RARITY_LABELS: Record<string, string> = {
  common: 'Gewöhnlich',
  uncommon: 'Ungewöhnlich',
  rare: 'Selten',
  mythic: 'Mythisch',
  special: 'Speziell',
  bonus: 'Bonus',
};

@Component({
  selector: 'app-card-detail-dialog',
  imports: [DecimalPipe],
  templateUrl: './card-detail-dialog.html',
  styleUrl: './card-detail-dialog.scss',
})
export class CardDetailDialog {
  readonly entry = input.required<CollectionEntry>();
  readonly close = output<void>();

  protected readonly imageUrl = computed(() => getCardImageUrl(this.entry().card));

  protected readonly rarityLabel = computed(() => {
    const rarity = this.entry().card.rarity;
    return RARITY_LABELS[rarity] ?? rarity;
  });

  protected readonly price = computed(() => getEntryPrice(this.entry(), 'eur'));

  protected readonly cardmarketUrl = computed(() => this.entry().card.purchase_uris?.cardmarket ?? null);

  protected readonly manaSymbols = computed(() => {
    const card = this.entry().card;
    const manaCost = card.mana_cost || card.card_faces?.[0]?.mana_cost || '';
    const matches = [...manaCost.matchAll(/\{([^}]+)\}/g)];
    return matches.map((match) => {
      const symbol = match[1];
      return { symbol, color: SYMBOL_COLORS.get(symbol[0]) ?? 'var(--color-border)' };
    });
  });
}
