import { Component, computed, inject, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { EdhrecService } from '../../../core/services/edhrec.service';
import { getCardImageUrl, ScryfallService } from '../../../core/services/scryfall.service';
import { CollectionEntry, CollectionService } from '../../collection/collection.service';
import { buildOwnedByNameMap, getEdhrecMatch, isLand, isLegendaryCreature } from './commander-recommendations-stats';

const BATCH_SIZE = 5;
// Bounds how many not-yet-owned candidate commanders get a full average-deck
// verification after the reverse card scan - only the most-voted ones are
// worth the extra request, long-tail single-vote candidates rarely reach a
// useful match %.
const CANDIDATE_LIMIT = 20;

type ScanPhase = 'cards' | 'commanders';

interface CommanderRecommendation {
  name: string;
  imageUrl: string | null;
  owned: boolean;
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
  imports: [TranslatePipe],
  templateUrl: './commander-recommendations-dialog.html',
  styleUrl: './commander-recommendations-dialog.scss',
})
export class CommanderRecommendationsDialog {
  private readonly collectionService = inject(CollectionService);
  private readonly scryfall = inject(ScryfallService);
  private readonly edhrec = inject(EdhrecService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly scanPhase = signal<ScanPhase>('cards');
  protected readonly checked = signal(0);
  protected readonly total = signal(0);
  protected readonly recommendations = signal<CommanderRecommendation[]>([]);

  protected readonly hasNoResults = computed(
    () => !this.loading() && !this.errorMessage() && this.recommendations().length === 0,
  );

  constructor() {
    this.load();
  }

  private async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.recommendations.set([]);
    try {
      const collection = await this.collectionService.getCollectionWithCardData();
      const ownedByName = buildOwnedByNameMap(collection);

      const ownedCommanders = dedupeByCardName(
        collection.filter(({ card }) => isLegendaryCreature(card.type_line)),
      );
      const ownedCommanderNames = new Set(ownedCommanders.map((entry) => entry.card.name.toLowerCase()));

      // Reverse scan: for every non-land card owned, ask EDHREC which
      // commanders most often run it, and tally candidates not already owned.
      const signalCards = dedupeByCardName(collection.filter(({ card }) => !isLand(card.type_line)));

      this.scanPhase.set('cards');
      this.checked.set(0);
      this.total.set(signalCards.length);

      const tally = new Map<string, number>();
      for (let i = 0; i < signalCards.length; i += BATCH_SIZE) {
        const batch = signalCards.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async ({ card }) => {
            const hits = await this.edhrec.getCommandersForCard(card.name).catch(() => []);
            for (const hit of hits) {
              if (ownedCommanderNames.has(hit.name.toLowerCase())) continue;
              tally.set(hit.name, (tally.get(hit.name) ?? 0) + 1);
            }
          }),
        );
        this.checked.update((value) => value + batch.length);
      }

      const candidateNames = [...tally.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, CANDIDATE_LIMIT)
        .map(([name]) => name);

      const candidateCards = candidateNames.length
        ? await this.scryfall.getCardsByNames(candidateNames).catch(() => [])
        : [];
      const candidateImageByName = new Map(
        candidateCards.map((card) => [card.name.toLowerCase(), getCardImageUrl(card)]),
      );

      const toVerify = [
        ...ownedCommanders.map((entry) => ({
          name: entry.card.name,
          owned: true,
          imageUrl: getCardImageUrl(entry.card),
        })),
        ...candidateNames.map((name) => ({
          name,
          owned: false,
          imageUrl: candidateImageByName.get(name.toLowerCase()) ?? null,
        })),
      ];

      // Verify each candidate's real match % against the collection.
      this.scanPhase.set('commanders');
      this.checked.set(0);
      this.total.set(toVerify.length);

      const results: CommanderRecommendation[] = [];
      for (let i = 0; i < toVerify.length; i += BATCH_SIZE) {
        const batch = toVerify.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (candidate) => {
            const deckCards = await this.edhrec.getAverageDeck(candidate.name).catch(() => []);
            const { matchedCount, totalCount } = getEdhrecMatch(deckCards, ownedByName);
            const matchPercent = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
            return { ...candidate, matchPercent, matchedCount, totalCount };
          }),
        );
        results.push(...batchResults.filter((result) => result.totalCount > 0));
        this.checked.update((value) => value + batch.length);
        this.recommendations.set([...results].sort((a, b) => b.matchPercent - a.matchPercent));
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : this.translate.instant('commanderRecs.loadFailed'),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
