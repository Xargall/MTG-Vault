import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { getCardImageUrl } from '../../../core/services/scryfall.service';
import { COLOR_CATEGORIES, getEntryPrice } from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';

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
  selector: 'app-collection-card-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './collection-card-detail.html',
  styleUrl: './collection-card-detail.scss',
})
export class CollectionCardDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly collectionService = inject(CollectionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly entry = signal<CollectionEntry | null>(null);

  protected readonly getCardImageUrl = getCardImageUrl;

  protected readonly imageUrl = computed(() => {
    const entry = this.entry();
    return entry ? getCardImageUrl(entry.card) : null;
  });

  protected readonly rarityLabel = computed(() => {
    const rarity = this.entry()?.card.rarity;
    return rarity ? (RARITY_LABELS[rarity] ?? rarity) : '';
  });

  protected readonly price = computed(() => {
    const entry = this.entry();
    return entry ? getEntryPrice(entry, 'eur') : 0;
  });

  protected readonly cardmarketUrl = computed(() => this.entry()?.card.purchase_uris?.cardmarket ?? null);

  protected readonly manaSymbols = computed(() => {
    const entry = this.entry();
    if (!entry) return [];
    const manaCost = entry.card.mana_cost || entry.card.card_faces?.[0]?.mana_cost || '';
    const matches = [...manaCost.matchAll(/\{([^}]+)\}/g)];
    return matches.map((match) => {
      const symbol = match[1];
      const key = symbol[0];
      return { symbol, color: SYMBOL_COLORS.get(key) ?? 'var(--color-border)' };
    });
  });

  constructor() {
    this.load();
  }

  private async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const id = this.route.snapshot.paramMap.get('id');
      this.entry.set(id ? await this.collectionService.getEntryById(id) : null);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Karte konnte nicht geladen werden.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
