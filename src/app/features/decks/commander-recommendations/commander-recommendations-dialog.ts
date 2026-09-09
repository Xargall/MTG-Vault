import { Component, computed, inject, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { EDHREC_COLOR_IDENTITIES, EdhrecService } from '../../../core/services/edhrec.service';
import { MtgApiService } from '../../../core/services/mtg-api.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { CollectionEntry, CollectionService } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import {
  AssignedElsewhereEntry,
  buildAssignedElsewhereMaps,
  buildOwnedOracleMap,
  findSubstitute,
  getAssignedElsewhereDecks,
  getCardOwnedStatus,
  getMissingQuantity,
  getOwnedQuantity,
} from '../deck-stats';
import { DeckEntry, DeckService } from '../deck.service';
import {
  buildOwnedByNameMap,
  buildPlainOwnedByNameMap,
  getEdhrecMatch,
  isLegendaryCreature,
} from './commander-recommendations-stats';

export interface CommanderDeckCard {
  card: Card;
  quantity: number;
  ownedQty: number;
  substitute: CollectionEntry | null;
}

/** A "free" card, further split out from CommanderDeckCard's owned bucket - fully owned, but some/all copies are already `is_assigned` to one of the user's *other* decks (see deck-stats.ts's Feature 2). Display-only here: unlike DeckDetailDialog, this preview offers no "Freigeben" action - releasing a commitment still happens from the deck it's actually assigned to. */
export interface CommanderAssignedCard extends CommanderDeckCard {
  available: number;
  assignedElsewhere: AssignedElsewhereEntry[];
}

const BATCH_SIZE = 5;
// Bounds how many not-yet-owned candidate commanders get a full average-deck
// verification after color-identity discovery - only the most-popular ones
// (by EDHREC's own num_decks) are worth the extra request, long-tail
// candidates rarely reach a useful match %.
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
  // Every one of the user's decks - needed for the "already planned
  // elsewhere" split below (see buildAssignedElsewhereMaps). Fetched once
  // alongside the collection, not per recommendation click.
  private readonly allDecks = signal<DeckEntry[]>([]);

  protected readonly hasNoResults = computed(
    () => !this.loading() && !this.errorMessage() && this.recommendations().length === 0,
  );

  // Detail (single commander's average decklist) - shown once a
  // recommendation row is clicked, replacing the list the same way
  // BrowseDecksDialog toggles between search results and a deck preview.
  protected readonly selectedRecommendation = signal<CommanderRecommendation | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);
  // "Owned" is further split three ways: ownedCards are free to use as-is,
  // assignedElsewhereCards are fully owned but committed to another deck
  // (see CommanderAssignedCard), missingCards aren't owned in sufficient
  // quantity at all regardless of assignment.
  protected readonly ownedCards = signal<CommanderDeckCard[]>([]);
  protected readonly assignedElsewhereCards = signal<CommanderAssignedCard[]>([]);
  protected readonly missingCards = signal<CommanderDeckCard[]>([]);

  /** Total copies, not distinct cards - a card needing 2 counts as 2 toward this. Plain ownership, same as before this feature - includes assignedElsewhereCards too (still "owned", just not free), unaffected by the free/assigned-elsewhere split below. Drives detailMatchPercent; the section headers below use their own, narrower totals. */
  protected readonly ownedQuantityTotal = computed(() =>
    [...this.ownedCards(), ...this.assignedElsewhereCards()].reduce((sum, c) => sum + c.quantity, 0),
  );
  protected readonly freeQuantityTotal = computed(() =>
    this.ownedCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  protected readonly assignedElsewhereQuantityTotal = computed(() =>
    this.assignedElsewhereCards().reduce((sum, c) => sum + c.quantity, 0),
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
      const [allCollection, allDecks] = await Promise.all([
        this.collectionService.getCollectionWithCardData(),
        this.deckService.getMyDecks(),
      ]);
      const collection = allCollection.filter((entry) => entry.card.game === 'mtg');
      this.collectionEntries.set(collection);
      this.allDecks.set(allDecks);
      // Plain name matching for the bulk scan below (not oracle-aware) -
      // resolving oracle_id for every card across every candidate's average
      // decklist at once used to fire far too many Scryfall lookups
      // concurrently and trigger 429s. The oracle-aware match still happens
      // once the user actually opens a single commander - see
      // selectRecommendation(), which already has full Card objects (and
      // their oracleId) for free at that point.
      const ownedByName = buildPlainOwnedByNameMap(collection);

      const ownedCommanders = dedupeByCardName(
        collection.filter(({ card }) => card.game === 'mtg' && isLegendaryCreature(card.typeLine)),
      );
      const ownedCommanderNames = new Set(ownedCommanders.map((entry) => entry.card.name.toLowerCase()));

      // Candidate discovery: rather than asking EDHREC which commanders run
      // each owned card (one request per card, unbounded - tripped EDHREC's
      // own bot-protection on any collection past a couple dozen cards),
      // pull EDHREC's own per-color-identity commander rankings instead -
      // fixed at 32 possible identities total, independent of collection
      // size, and narrowed further to just the identities this collection's
      // own colors could actually cast (colorless always qualifies).
      const ownedColors = new Set(
        collection.flatMap(({ card }) => (card.game === 'mtg' ? card.colorIdentity : [])),
      );
      const relevantIdentities = EDHREC_COLOR_IDENTITIES.filter((identity) =>
        identity.colors.every((color) => ownedColors.has(color)),
      );

      this.scanPhase.set('cards');
      this.checked.set(0);
      this.total.set(relevantIdentities.length);

      const tally = new Map<string, number>();
      for (let i = 0; i < relevantIdentities.length; i += BATCH_SIZE) {
        const batch = relevantIdentities.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (identity) => {
            const hits = await this.edhrec.getCommandersByColorIdentity(identity.slug).catch(() => []);
            for (const hit of hits) {
              if (ownedCommanderNames.has(hit.name.toLowerCase())) continue;
              tally.set(hit.name, Math.max(tally.get(hit.name) ?? 0, hit.numDecks ?? 0));
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

  async selectRecommendation(rec: CommanderRecommendation) {
    this.selectedRecommendation.set(rec);
    this.detailError.set(null);
    this.deckAdded.set(false);
    this.addDeckError.set(null);
    this.wishlistAdded.set(false);
    this.wishlistError.set(null);
    this.ownedCards.set([]);
    this.assignedElsewhereCards.set([]);
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
      const collectionEntries = this.collectionEntries();
      const ownedByName = buildOwnedByNameMap(collectionEntries);
      const ownedByOracle = buildOwnedOracleMap(collectionEntries);
      // null-equivalent "no current deck to exclude" - this recommended
      // deck doesn't exist yet, same reasoning as browse-decks-dialog.ts's
      // precon preview (see buildAssignedElsewhereMaps's own doc comment).
      const { byCardId: assignedByCardId, byOracleId: assignedByOracle } = buildAssignedElsewhereMaps(
        this.allDecks(),
        null,
      );

      const owned: CommanderDeckCard[] = [];
      const assignedElsewhere: CommanderAssignedCard[] = [];
      const missing: CommanderDeckCard[] = [];
      for (const { name, quantity } of deckCards) {
        const card = cardsByName.get(name.toLowerCase());
        if (!card) continue;
        const oracleQty = card.oracleId ? (ownedByOracle.get(card.oracleId) ?? 0) : 0;
        const ownedQty = oracleQty + (ownedByName.get(name.toLowerCase()) ?? 0);
        const substitute = findSubstitute(card, quantity, collectionEntries);

        if (getCardOwnedStatus(quantity, ownedQty) !== 'owned') {
          missing.push({ card, quantity, ownedQty, substitute });
          continue;
        }

        // Fully owned overall - but is it actually *free*, or is some/all
        // of it already committed to another deck? Oracle-based match
        // catches any assigned printing of the same card; the exact
        // card_id match additionally covers the (rare, MTG-only-relevant)
        // case where a legacy row with no recorded oracle_id is the one
        // that's assigned.
        const assignedQty = getOwnedQuantity(
          { cardId: card.id, oracleId: card.oracleId },
          assignedByCardId,
          assignedByOracle,
        );
        const available = Math.max(0, ownedQty - assignedQty);
        if (available >= quantity) {
          owned.push({ card, quantity, ownedQty, substitute });
        } else {
          assignedElsewhere.push({
            card,
            quantity,
            ownedQty,
            substitute,
            available,
            assignedElsewhere: getAssignedElsewhereDecks({ cardId: card.id, oracleId: card.oracleId }, this.allDecks(), ''),
          });
        }
      }
      owned.sort((a, b) => a.card.name.localeCompare(b.card.name));
      assignedElsewhere.sort((a, b) => a.card.name.localeCompare(b.card.name));
      missing.sort((a, b) => a.card.name.localeCompare(b.card.name));

      this.ownedCards.set(owned);
      this.assignedElsewhereCards.set(assignedElsewhere);
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

  /** "MSH #142" style short print label for the substitute callout - same as DeckDetailDialog.printLabel. */
  protected printLabel(card: Card): string {
    return card.game === 'mtg' ? `${card.setCode.toUpperCase()} #${card.collectorNumber}` : card.name;
  }

  async addDeck() {
    const rec = this.selectedRecommendation();
    if (!rec) return;

    this.addingDeck.set(true);
    this.addDeckError.set(null);
    try {
      const cards = [...this.ownedCards(), ...this.assignedElsewhereCards(), ...this.missingCards()].map(
        ({ card, quantity }) => ({ cardId: card.id, quantity }),
      );
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
