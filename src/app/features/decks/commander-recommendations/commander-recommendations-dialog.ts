import { Component, computed, inject, output, signal } from '@angular/core';

import { EdhrecService } from '../../../core/services/edhrec.service';
import { getCardImageUrl } from '../../../core/services/scryfall.service';
import { CollectionEntry, CollectionService } from '../../collection/collection.service';
import { buildOwnedByNameMap, getEdhrecMatch, isLegendaryCreature } from './commander-recommendations-stats';

const BATCH_SIZE = 5;

interface CommanderRecommendation {
  commander: CollectionEntry;
  matchPercent: number;
  matchedCount: number;
  totalCount: number;
}

function dedupeByCardName(entries: CollectionEntry[]): CollectionEntry[] {
  const seen = new Set<string>();
  const result: CollectionEntry[] = [];
  for (const entry of entries) {
    const key = entry.card.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

@Component({
  selector: 'app-commander-recommendations-dialog',
  templateUrl: './commander-recommendations-dialog.html',
  styleUrl: './commander-recommendations-dialog.scss',
})
export class CommanderRecommendationsDialog {
  private readonly collectionService = inject(CollectionService);
  private readonly edhrec = inject(EdhrecService);

  readonly close = output<void>();
  protected readonly getCardImageUrl = getCardImageUrl;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly checked = signal(0);
  protected readonly total = signal(0);
  protected readonly recommendations = signal<CommanderRecommendation[]>([]);

  protected readonly hasNoLegendaries = computed(
    () => !this.loading() && !this.errorMessage() && this.total() === 0,
  );

  constructor() {
    this.load();
  }

  private async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const collection = await this.collectionService.getCollectionWithCardData();
      const ownedByName = buildOwnedByNameMap(collection);
      const commanders = dedupeByCardName(
        collection.filter(({ card }) => isLegendaryCreature(card.type_line)),
      );

      this.total.set(commanders.length);
      this.checked.set(0);

      const results: CommanderRecommendation[] = [];
      for (let i = 0; i < commanders.length; i += BATCH_SIZE) {
        const batch = commanders.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (commander) => {
            const deckCards = await this.edhrec.getAverageDeck(commander.card.name).catch(() => []);
            const { matchedCount, totalCount } = getEdhrecMatch(deckCards, ownedByName);
            const matchPercent = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
            return { commander, matchPercent, matchedCount, totalCount };
          }),
        );
        results.push(...batchResults.filter((result) => result.totalCount > 0));
        this.checked.update((value) => value + batch.length);
        this.recommendations.set([...results].sort((a, b) => b.matchPercent - a.matchPercent));
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Empfehlungen konnten nicht geladen werden.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
