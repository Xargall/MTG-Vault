import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { EDHREC_COLOR_IDENTITIES, EdhrecService } from '../../../core/services/edhrec.service';
import { MtgApiService } from '../../../core/services/mtg-api.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { AppDialog } from '../../../shared/dialog/dialog';
import { CollectionEntry, CollectionService } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import {
  AverageDeckCardMatch,
  PrintQuantity,
  UnresolvedAverageDeckCard,
  getFreelyOwnedEntries,
  getPreciseAverageDeckMatch,
  mergeCardQuantities,
  splitAverageDeckByAvailability,
} from '../deck-stats';
import { DeckEntry, DeckService } from '../deck.service';
import { isLegendaryCreature } from './commander-recommendations-stats';

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
  // Plain ownership - includes copies already committed to other decks.
  matchPercent: number;
  matchedCount: number;
  totalCount: number;
  // What the deck is actually buildable with right now, i.e. matchPercent
  // minus whatever's tied up elsewhere - the primary, sort-driving number
  // (see the list's dual badge and its sort in load()).
  freeMatchPercent: number;
  freeMatchedCount: number;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-commander-recommendations-dialog',
  imports: [TranslatePipe, CardTile, AppDialog],
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
  // Off by default - cards already committed to another of the user's decks
  // don't count as available. Toggling re-runs the whole scan (see load()):
  // it changes which colors/commanders are even worth considering, not just
  // the displayed percentage.
  protected readonly includeAssignedElsewhere = signal(false);
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
  // ownedCards are free to use as-is; missingCards are everything else the
  // deck needs - genuinely not owned, *and* (while includeAssignedElsewhere
  // is off) copies that are owned but committed to another deck. A card
  // locked elsewhere isn't any more buildable than one never owned at all,
  // so it belongs with the "still need to get this" bucket, not its own
  // half-owned category.
  protected readonly ownedCards = signal<AverageDeckCardMatch[]>([]);
  protected readonly missingCards = signal<AverageDeckCardMatch[]>([]);
  // Deck cards whose name never resolved to a real Card - still counted
  // below (see AverageDeckSplit's own doc comment), just with no tile to
  // render, so the percentages/totals always add up to the deck's real size
  // instead of quietly shrinking.
  protected readonly unresolvedCards = signal<UnresolvedAverageDeckCard[]>([]);
  protected readonly unresolvedCardsLabel = computed(() =>
    this.unresolvedCards()
      .map((c) => `${c.quantity}x ${c.name}`)
      .join(', ') || null,
  );

  protected readonly freeQuantityTotal = computed(() =>
    this.ownedCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  // missingCards' own quantity is already the shortfall (splitAverageDeckByAvailability
  // computes it per card, not the card's full needed amount) - see its own doc comment.
  protected readonly missingQuantityTotal = computed(
    () =>
      this.missingCards().reduce((sum, c) => sum + c.quantity, 0) +
      this.unresolvedCards().reduce((sum, c) => sum + c.quantity, 0),
  );
  private readonly totalQuantityNeeded = computed(() => this.freeQuantityTotal() + this.missingQuantityTotal());

  /** Same split as the list's badge (see load()) - what's actually buildable with free cards alone. */
  protected readonly freeDetailMatchPercent = computed(() => {
    const total = this.totalQuantityNeeded();
    return total > 0 ? Math.round((this.freeQuantityTotal() / total) * 100) : 0;
  });

  protected readonly addingDeck = signal(false);
  protected readonly addDeckError = signal<string | null>(null);
  protected readonly deckAdded = signal(false);
  // "Alle Karten vorhanden" - see DeckService.importDeck's own doc comment.
  protected readonly allCardsOwned = signal(false);

  protected readonly addingToWishlist = signal(false);
  protected readonly wishlistError = signal<string | null>(null);
  protected readonly wishlistAdded = signal(false);

  constructor() {
    this.load();
  }

  /** Re-runs the whole scan - the toggle changes which colors/commanders are considered at all (see discoveryPool in load()), not just the displayed percentage, so a cheap in-place re-sort isn't enough. */
  protected toggleIncludeAssignedElsewhere() {
    this.includeAssignedElsewhere.update((value) => !value);
    void this.load();
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

      // Discovery runs against free cards only by default - a color or
      // commander only owned via a card that's locked into another deck
      // isn't actually buildable, so it shouldn't shape which candidates get
      // considered in the first place (see includeAssignedElsewhere).
      const discoveryPool = this.includeAssignedElsewhere()
        ? collection
        : getFreelyOwnedEntries(collection, allDecks);

      const ownedCommanders = dedupeByCardName(
        discoveryPool.filter(({ card }) => card.game === 'mtg' && isLegendaryCreature(card.typeLine)),
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
        discoveryPool.flatMap(({ card }) => (card.game === 'mtg' ? card.colorIdentity : [])),
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
            const cards = await this.mtgApi.getCardsByNames(deckCards.map((c) => c.name)).catch(() => []);
            const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
            const { matchedCount, totalCount, freeMatchedCount } = getPreciseAverageDeckMatch(
              deckCards,
              cardsByName,
              collection,
              this.includeAssignedElsewhere() ? [] : allDecks,
            );
            const matchPercent = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
            const freeMatchPercent = totalCount > 0 ? Math.round((freeMatchedCount / totalCount) * 100) : 0;
            return { ...candidate, matchPercent, matchedCount, totalCount, freeMatchPercent, freeMatchedCount };
          }),
        );
        results.push(...batchResults.filter((result) => result.totalCount > 0));
        this.checked.update((value) => value + batch.length);
        // Sorted by what's actually buildable right now, not raw ownership -
        // a commander you "match" 95% on but can't build because it's all
        // committed to another deck shouldn't outrank one you can build today.
        this.recommendations.set(
          [...results].sort((a, b) => b.freeMatchPercent - a.freeMatchPercent || b.matchPercent - a.matchPercent),
        );
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
    this.allCardsOwned.set(false);
    this.wishlistAdded.set(false);
    this.wishlistError.set(null);
    this.ownedCards.set([]);
    this.missingCards.set([]);
    this.unresolvedCards.set([]);

    this.loadingDetail.set(true);
    try {
      const deckCards = await this.edhrec.getAverageDeck(rec.name);
      // Already resolving full Card objects here (for images/names in the
      // detail view) means oracleId comes along for free - no separate
      // EDHREC-name oracle lookup needed, unlike the bulk verification pass
      // in load() (which never resolves full cards, for performance).
      const cards = await this.mtgApi.getCardsByNames(deckCards.map((c) => c.name));
      const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));

      const { owned, assignedElsewhere, missing, unresolved } = splitAverageDeckByAvailability(
        deckCards,
        cardsByName,
        this.collectionEntries(),
        this.includeAssignedElsewhere() ? [] : this.allDecks(),
      );
      this.ownedCards.set(owned);
      // Cards locked into another deck aren't buildable right now either -
      // same bucket as genuinely missing ones, no printBreakdown (there's no
      // free printing to name, same reasoning as a never-owned card).
      this.missingCards.set([
        ...missing,
        ...assignedElsewhere.map(({ card, quantity, ownedQty }) => ({ card, quantity, ownedQty, printBreakdown: [] })),
      ]);
      this.unresolvedCards.set(unresolved);
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

  /** Whether a card's printBreakdown is worth rendering at all - a single, exact-print entry means "all of it is the exact printing", the unremarkable default case with nothing to say. */
  protected hasNotablePrintBreakdown(breakdown: PrintQuantity[]): boolean {
    return breakdown.length > 1 || (breakdown.length === 1 && !breakdown[0].isExactPrint);
  }

  protected printBreakdownLabel(print: PrintQuantity): string {
    const label = `${print.quantity}x ${this.printLabel(print.card)}`;
    return print.isExactPrint ? label : `${label} (${this.translate.instant('deckDetail.substitutePrintTag')})`;
  }

  async addDeck() {
    const rec = this.selectedRecommendation();
    if (!rec) return;

    this.addingDeck.set(true);
    this.addDeckError.set(null);
    try {
      const cards = mergeCardQuantities([...this.ownedCards(), ...this.missingCards()]);
      await this.deckService.addEdhrecDeck(rec.name, cards, this.allCardsOwned());
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
        .map(({ card, quantity }) => ({
          cardId: card.id,
          priority: 2,
          notes: this.translate.instant('common.forDeck', { name: rec.name }),
          quantity,
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
