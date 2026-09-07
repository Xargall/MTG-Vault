import { Component, computed, inject, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { EdhrecCard, EdhrecService } from '../../../core/services/edhrec.service';
import { MtgApiService } from '../../../core/services/mtg-api.service';
import { OracleIdCacheService } from '../../../core/services/oracle-id-cache.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { CollectionEntry, CollectionService } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import { buildOwnedOracleMap, getCardOwnedStatus, getMissingQuantity } from '../deck-stats';
import { DeckService } from '../deck.service';
import {
  buildOwnedByNameMap,
  EdhrecMatchCard,
  getEdhrecMatch,
  isLand,
  isLegendaryCreature,
} from './commander-recommendations-stats';

export interface CommanderDeckCard {
  card: Card;
  quantity: number;
  ownedQty: number;
}

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
  imports: [TranslatePipe, CardTile],
  templateUrl: './commander-recommendations-dialog.html',
  styleUrl: './commander-recommendations-dialog.scss',
})
export class CommanderRecommendationsDialog {
  private readonly collectionService = inject(CollectionService);
  private readonly mtgApi = inject(MtgApiService);
  private readonly edhrec = inject(EdhrecService);
  private readonly oracleIdCache = inject(OracleIdCacheService);
  private readonly deckService = inject(DeckService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly scanPhase = signal<ScanPhase>('cards');
  protected readonly checked = signal(0);
  protected readonly total = signal(0);
  protected readonly recommendations = signal<CommanderRecommendation[]>([]);
  private readonly collectionEntries = signal<CollectionEntry[]>([]);

  protected readonly hasNoResults = computed(
    () => !this.loading() && !this.errorMessage() && this.recommendations().length === 0,
  );

  // Detail (single commander's average decklist) - shown once a
  // recommendation row is clicked, replacing the list the same way
  // BrowseDecksDialog toggles between search results and a deck preview.
  protected readonly selectedRecommendation = signal<CommanderRecommendation | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);
  protected readonly ownedCards = signal<CommanderDeckCard[]>([]);
  protected readonly missingCards = signal<CommanderDeckCard[]>([]);

  /** Total copies, not distinct cards - a card needing 2 counts as 2 toward this. */
  protected readonly ownedQuantityTotal = computed(() =>
    this.ownedCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  protected readonly missingQuantityTotal = computed(() =>
    this.missingCards().reduce((sum, c) => sum + getMissingQuantity(c.quantity, c.ownedQty), 0),
  );
  private readonly totalQuantityNeeded = computed(
    () => this.ownedQuantityTotal() + this.missingCards().reduce((sum, c) => sum + c.quantity, 0),
  );

  protected readonly detailMatchPercent = computed(() => {
    const total = this.totalQuantityNeeded();
    return total > 0 ? Math.round((this.ownedQuantityTotal() / total) * 100) : 0;
  });

  protected readonly addingDeck = signal(false);
  protected readonly addDeckError = signal<string | null>(null);
  protected readonly deckAdded = signal(false);

  protected readonly addingToWishlist = signal(false);
  protected readonly wishlistError = signal<string | null>(null);
  protected readonly wishlistAdded = signal(false);

  constructor() {
    this.load();
  }

  private async load() {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.recommendations.set([]);
    try {
      const collection = (await this.collectionService.getCollectionWithCardData()).filter(
        (entry) => entry.card.game === 'mtg',
      );
      this.collectionEntries.set(collection);
      const ownedByName = buildOwnedByNameMap(collection);
      const ownedByOracle = buildOwnedOracleMap(collection);

      const ownedCommanders = dedupeByCardName(
        collection.filter(({ card }) => card.game === 'mtg' && isLegendaryCreature(card.typeLine)),
      );
      const ownedCommanderNames = new Set(ownedCommanders.map((entry) => entry.card.name.toLowerCase()));

      // Reverse scan: for every non-land card owned, ask EDHREC which
      // commanders most often run it, and tally candidates not already owned.
      const signalCards = dedupeByCardName(
        collection.filter(({ card }) => card.game === 'mtg' && !isLand(card.typeLine)),
      );

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
        ? await this.mtgApi.getCardsByNames(candidateNames).catch(() => [])
        : [];
      const candidateImageByName = new Map(
        candidateCards.map((card) => [card.name.toLowerCase(), card.imageUrl]),
      );

      const toVerify = [
        ...ownedCommanders.map((entry) => ({
          name: entry.card.name,
          owned: true,
          imageUrl: entry.card.imageUrl,
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
            const enriched = await this.enrichWithOracleIds(deckCards, ownedByName);
            const { matchedCount, totalCount } = getEdhrecMatch(enriched, ownedByName, ownedByOracle);
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

  /**
   * Resolves each deck card's oracle_id via OracleIdCacheService, but only
   * when the plain name match doesn't already cover the needed quantity -
   * oracle matching only ever helps a card owned under a name EDHREC
   * doesn't use (a different printing, or a localized/German print name),
   * so a card that's already fully matched by name has nothing to gain
   * from the extra lookup. Keeps the verification pass from resolving
   * hundreds of names per commander when most of them don't need it.
   */
  private async enrichWithOracleIds(
    deckCards: EdhrecCard[],
    ownedByName: Map<string, number>,
  ): Promise<EdhrecMatchCard[]> {
    const needsResolve = deckCards.filter(
      (card) => (ownedByName.get(card.name.toLowerCase()) ?? 0) < card.quantity,
    );
    const oracleIds = await this.oracleIdCache.resolveMany(needsResolve.map((card) => card.name));
    return deckCards.map((card) => ({ ...card, oracleId: oracleIds.get(card.name) ?? null }));
  }

  async selectRecommendation(rec: CommanderRecommendation) {
    this.selectedRecommendation.set(rec);
    this.detailError.set(null);
    this.deckAdded.set(false);
    this.addDeckError.set(null);
    this.wishlistAdded.set(false);
    this.wishlistError.set(null);
    this.ownedCards.set([]);
    this.missingCards.set([]);

    this.loadingDetail.set(true);
    try {
      const deckCards = await this.edhrec.getAverageDeck(rec.name);
      // Already resolving full Card objects here (for images/names in the
      // detail view) means oracleId comes along for free - no separate
      // EDHREC-name oracle lookup needed, unlike the bulk verification pass
      // in load() (which never resolves full cards, for performance).
      const cards = await this.mtgApi.getCardsByNames(deckCards.map((c) => c.name));
      const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
      const ownedByName = buildOwnedByNameMap(this.collectionEntries());
      const ownedByOracle = buildOwnedOracleMap(this.collectionEntries());

      const owned: CommanderDeckCard[] = [];
      const missing: CommanderDeckCard[] = [];
      for (const { name, quantity } of deckCards) {
        const card = cardsByName.get(name.toLowerCase());
        if (!card) continue;
        const oracleQty = card.oracleId ? (ownedByOracle.get(card.oracleId) ?? 0) : 0;
        const ownedQty = oracleQty + (ownedByName.get(name.toLowerCase()) ?? 0);
        const entry: CommanderDeckCard = { card, quantity, ownedQty };
        (getCardOwnedStatus(quantity, ownedQty) === 'owned' ? owned : missing).push(entry);
      }
      owned.sort((a, b) => a.card.name.localeCompare(b.card.name));
      missing.sort((a, b) => a.card.name.localeCompare(b.card.name));

      this.ownedCards.set(owned);
      this.missingCards.set(missing);
    } catch (error) {
      this.detailError.set(
        error instanceof Error ? error.message : this.translate.instant('commanderRecs.detailFailed'),
      );
    } finally {
      this.loadingDetail.set(false);
    }
  }

  backToList() {
    this.selectedRecommendation.set(null);
  }

  async addDeck() {
    const rec = this.selectedRecommendation();
    if (!rec) return;

    this.addingDeck.set(true);
    this.addDeckError.set(null);
    try {
      const cards = [...this.ownedCards(), ...this.missingCards()].map(({ card, quantity }) => ({
        cardId: card.id,
        quantity,
      }));
      await this.deckService.addEdhrecDeck(rec.name, cards);
      this.deckAdded.set(true);
      this.added.emit();
    } catch (error) {
      this.addDeckError.set(
        error instanceof Error ? error.message : this.translate.instant('commanderRecs.addDeckFailed'),
      );
    } finally {
      this.addingDeck.set(false);
    }
  }

  async addMissingToWishlist() {
    const rec = this.selectedRecommendation();
    if (!rec) return;

    this.addingToWishlist.set(true);
    this.wishlistError.set(null);
    try {
      const existing = await this.wishlistService.getCardIds();
      const inputs: UpsertWishlistInput[] = this.missingCards()
        .filter(({ card }) => !existing.has(card.id))
        .map(({ card, quantity, ownedQty }) => ({
          cardId: card.id,
          priority: 2,
          notes: this.translate.instant('common.forDeck', { name: rec.name }),
          quantity: getMissingQuantity(quantity, ownedQty),
        }));

      if (inputs.length > 0) {
        await this.wishlistService.upsertMany(inputs);
      }
      this.wishlistAdded.set(true);
    } catch (error) {
      this.wishlistError.set(
        error instanceof Error ? error.message : this.translate.instant('deckDetail.wishlistFailed'),
      );
    } finally {
      this.addingToWishlist.set(false);
    }
  }
}
