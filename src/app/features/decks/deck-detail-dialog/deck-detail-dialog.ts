import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Card } from '../../../core/models/card.model';
import { CardOwnedStatus, CardTile } from '../../../shared/cards/card-tile/card-tile';
import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';
import { CollectionEntry } from '../../collection/collection.service';
import { UpsertWishlistInput, WishlistService } from '../../wishlist/wishlist.service';
import {
  AssignedElsewhereEntry,
  buildAssignedElsewhereMaps,
  buildOwnedMap,
  buildOwnedOracleMap,
  CardAvailabilityStatus,
  findSubstitute,
  getAvailabilityMatch,
  getCardAvailability,
  getAssignedElsewhereDecks,
  getCardOwnedStatus,
  getDeckCardCount,
  getDeckShowcase,
  getDeckTotalValue,
  getMissingQuantity,
  getOwnedQuantity,
} from '../deck-stats';
import { DeckCardEntry, DeckEntry, DeckService } from '../deck.service';

export interface DeckCardWithStatus {
  entry: DeckCardEntry;
  status: CardOwnedStatus;
}

/** A deck card's full binding picture - availability status/count, an owned-under-a-different-printing substitute (Feature 1), and which other decks already claim copies of it (Feature 2). Only cards with something noteworthy to say (not fully, simply available) actually render a detail line - see the template. */
export interface DeckCardBindingDetail {
  entry: DeckCardEntry;
  status: CardAvailabilityStatus;
  available: number;
  substitute: CollectionEntry | null;
  assignedElsewhere: AssignedElsewhereEntry[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-detail-dialog',
  imports: [CardTile, DecimalPipe, TranslatePipe, ScrollLockDirective],
  templateUrl: './deck-detail-dialog.html',
  styleUrl: './deck-detail-dialog.scss',
})
export class DeckDetailDialog {
  private readonly deckService = inject(DeckService);
  private readonly wishlistService = inject(WishlistService);
  private readonly translate = inject(TranslateService);

  readonly entry = input.required<DeckEntry>();
  readonly collectionEntries = input.required<CollectionEntry[]>();
  // Every one of the user's decks (this one included) - needed to compute
  // how many of this deck's cards are already committed to the *other*
  // ones (see buildAssignedElsewhereMaps). Passed down from Decks, which
  // already loads the full list for its own deck grid.
  readonly allDecks = input.required<DeckEntry[]>();
  readonly close = output<void>();
  readonly deleted = output<void>();
  // Emitted after a "Freigeben" release actually goes through - the parent
  // (Decks) reloads every deck so both this dialog's own availability and
  // the freed-from deck's own status recompute (see decks.ts's onDeckAdded,
  // reused for this too - reloading is reloading).
  readonly released = output<void>();

  protected readonly showcase = computed(() => getDeckShowcase(this.entry()));
  protected readonly showcaseImageUrl = computed(() => this.showcase()?.card.imageUrl ?? null);

  protected readonly cardCount = computed(() => getDeckCardCount(this.entry()));
  protected readonly totalValue = computed(() => getDeckTotalValue(this.entry()));

  protected readonly year = computed(() => this.entry().deck.release_date?.slice(0, 4) ?? null);

  protected readonly sortedCards = computed<DeckCardEntry[]>(() =>
    [...this.entry().cards].sort((a, b) => a.card.name.localeCompare(b.card.name)),
  );

  private readonly ownedMap = computed(() => buildOwnedMap(this.collectionEntries()));
  private readonly ownedOracleMap = computed(() => buildOwnedOracleMap(this.collectionEntries()));
  private readonly assignedMaps = computed(() =>
    buildAssignedElsewhereMaps(this.allDecks(), this.entry().deck.id),
  );

  // Never mutated - only ever .get() against, to make getOwnedQuantity/
  // getCardAvailability's oracle term resolve to 0 (see matchingMaps).
  private static readonly EMPTY_MAP: Map<string, number> = new Map();

  /** Every collection row's quantity keyed by its own exact card_id, regardless of whether it also carries an oracle_id - unlike ownedMap (which deliberately excludes any row that has one, see buildOwnedMap's own doc comment), this is needed for precon matching (see matchingMaps): a modern MTG row always has an oracle_id, so ownedMap alone is practically always empty for MTG. */
  private readonly ownedByExactCardId = computed(() => {
    const map = new Map<string, number>();
    for (const { row } of this.collectionEntries()) {
      map.set(row.card_id, (map.get(row.card_id) ?? 0) + row.quantity);
    }
    return map;
  });

  /**
   * A precon is a sealed physical product - every card inside it is granted
   * into the collection as its own exact printing (see
   * DeckService.grantAllCards), so matching it against the collection (and
   * against other decks' own claims) should only ever recognize that exact
   * same printing, never "an equivalent card via a different print" -
   * explicit user call ("Wir nutzen bei Precons KEINE Substitute").
   *
   * The first attempt at this passed oracleId: null into
   * getOwnedQuantity/getCardAvailability instead - live-confirmed as a real
   * regression (every precon card read as entirely missing): those
   * functions' two maps are keyed by whichever of card_id/oracle_id a row
   * actually carries, and a modern MTG row always has an oracle_id, so its
   * quantity lives in ownedOracleMap, never in ownedMap - passing a null
   * oracleId doesn't redirect the lookup back to ownedMap, it just zeroes
   * the oracle term out and finds nothing either way.
   *
   * This swaps in a purpose-built ownedByExactCardId/assignedByCardId pair
   * (real data, keyed correctly regardless of oracle_id) alongside an
   * always-empty stand-in for the oracle maps instead - the oracle term in
   * getOwnedQuantity/getCardAvailability then always resolves to 0, so only
   * the exact-card_id term ever contributes, for a precon. A non-precon
   * deck gets the real, oracle-aware maps unchanged.
   */
  private matchingMaps(): {
    owned: Map<string, number>;
    ownedByOracle: Map<string, number>;
    assignedByCardId: Map<string, number>;
    assignedByOracle: Map<string, number>;
  } {
    const { byCardId, byOracleId } = this.assignedMaps();
    if (!this.entry().deck.is_precon) {
      return { owned: this.ownedMap(), ownedByOracle: this.ownedOracleMap(), assignedByCardId: byCardId, assignedByOracle: byOracleId };
    }
    return {
      owned: this.ownedByExactCardId(),
      ownedByOracle: DeckDetailDialog.EMPTY_MAP,
      assignedByCardId: byCardId,
      assignedByOracle: DeckDetailDialog.EMPTY_MAP,
    };
  }

  /** Every deck card paired with its owned/partial/missing status, for the status-badged card grid - so an incomplete deck shows exactly *which* cards are missing, not just a count. Ownership is oracle-aware for a non-precon deck (any printing counts, see getOwnedQuantity), exact-print-only for a precon (see matchingMaps) - this is plain ownership, not availability; see cardBindingDetails below for the "already claimed by another deck" picture. */
  protected readonly cardsWithStatus = computed<DeckCardWithStatus[]>(() => {
    const { owned, ownedByOracle } = this.matchingMaps();
    return this.sortedCards().map((entry) => ({
      entry,
      status: getCardOwnedStatus(
        entry.row.quantity,
        getOwnedQuantity({ cardId: entry.row.card_id, oracleId: entry.card.oracleId }, owned, ownedByOracle),
      ),
    }));
  });

  /**
   * Splits the status-badged grid into the deck's actual decklist and any
   * bonus tokens a precon box ships with (see the mtgjson tokens-parsing
   * fix) - shown as its own section instead of mixed in alphabetically, so
   * e.g. 10 Thopter tokens next to Sai, Master Thopterist don't read as a
   * data error. Scryfall's own type_line reliably starts with "Token" for
   * every token card object (confirmed live), so no extra data is needed -
   * token-ness is MTG-only (see card.model.ts), same as everything else
   * deck-detail is scoped to.
   */
  protected readonly mainCards = computed(() =>
    this.cardsWithStatus().filter((item) => !(item.entry.card.game === 'mtg' && item.entry.card.typeLine.startsWith('Token'))),
  );
  protected readonly tokenCards = computed(() =>
    this.cardsWithStatus().filter((item) => item.entry.card.game === 'mtg' && item.entry.card.typeLine.startsWith('Token')),
  );

  /** The real, weighted "can I actually build this" match - a card that's owned but fully claimed by another deck doesn't count as free, matching the flexible (half-credit) scoring the deck-search toggle defaults to. See getAvailabilityMatch. Exact-print-only for a precon (see matchingMaps). */
  protected readonly availabilityMatch = computed(() => {
    const { owned, ownedByOracle, assignedByCardId, assignedByOracle } = this.matchingMaps();
    const required = this.entry().cards.map(({ row, card }) => ({
      cardId: row.card_id,
      oracleId: card.oracleId,
      quantity: row.quantity,
    }));
    return getAvailabilityMatch(required, owned, ownedByOracle, assignedByCardId, assignedByOracle, 'flexible');
  });

  /**
   * Only cards with a substitution note and/or an "assigned elsewhere" note
   * - a fully, simply available card has nothing worth calling out here
   * (see the template's binding-details section). The substitute note is
   * gated per card, not on the whole deck's percent - live-confirmed bug:
   * gating on availabilityMatch===100 left a card's own substitute note
   * showing whenever *any other, unrelated* card in the same deck was still
   * short (e.g. claimed by another deck), even though that specific card
   * was already fully covered by its own substitute print. An
   * assigned-elsewhere note still stays regardless of this card's own
   * status, since releasing a card to/from another deck remains a real
   * action independent of whether this card itself already reads as
   * available. A precon never gets a substitute note at all (see
   * matchingMaps) - it's always exact-print-only, so there's never an
   * "equivalent" print to call out in the first place.
   */
  protected readonly cardBindingDetails = computed<DeckCardBindingDetail[]>(() => {
    const { owned, ownedByOracle, assignedByCardId, assignedByOracle } = this.matchingMaps();
    const collectionEntries = this.collectionEntries();
    const allDecks = this.allDecks();
    const currentDeckId = this.entry().deck.id;
    const isPrecon = this.entry().deck.is_precon;

    return this.sortedCards()
      .map((entry) => {
        const { row, card } = entry;
        const availability = getCardAvailability(
          { cardId: row.card_id, oracleId: card.oracleId },
          row.quantity,
          owned,
          ownedByOracle,
          assignedByCardId,
          assignedByOracle,
        );
        const substitute =
          isPrecon || availability.status === 'available' ? null : findSubstitute(card, row.quantity, collectionEntries);
        const assignedElsewhere = getAssignedElsewhereDecks(
          { cardId: row.card_id, oracleId: isPrecon ? null : card.oracleId },
          allDecks,
          currentDeckId,
        );
        return {
          entry,
          status: availability.status,
          available: availability.available,
          substitute,
          assignedElsewhere,
        };
      })
      .filter((detail) => detail.substitute !== null || detail.assignedElsewhere.length > 0);
  });

  protected readonly missingCards = computed<DeckCardEntry[]>(() => {
    const { owned, ownedByOracle } = this.matchingMaps();
    return this.entry().cards.filter(
      ({ row, card }) =>
        getOwnedQuantity({ cardId: row.card_id, oracleId: card.oracleId }, owned, ownedByOracle) < row.quantity,
    );
  });

  /** Total missing *copies* (needed minus owned, summed) - not the number of distinct cards that are short, which is what missingCards().length would give. */
  protected readonly missingQuantityTotal = computed(() => {
    const { owned, ownedByOracle } = this.matchingMaps();
    return this.entry().cards.reduce(
      (sum, { row, card }) =>
        sum +
        getMissingQuantity(
          row.quantity,
          getOwnedQuantity({ cardId: row.card_id, oracleId: card.oracleId }, owned, ownedByOracle),
        ),
      0,
    );
  });

  protected readonly confirmingDelete = signal(false);
  protected readonly removeCardsOnDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  // Which "Freigeben" button (if any) is mid-confirmation - keyed by the
  // current deck's own deck_cards row id plus the target deck's id, so two
  // different cards (or the same card claimed by two different other
  // decks) never get confused with each other.
  protected readonly confirmingRelease = signal<{
    key: string;
    cardName: string;
    deckId: string;
    deckName: string;
    cardIds: string[];
  } | null>(null);
  protected readonly releasing = signal(false);
  protected readonly releaseError = signal<string | null>(null);

  protected releaseKey(detailRowId: string, assigned: AssignedElsewhereEntry): string {
    return `${detailRowId}:${assigned.deckId}`;
  }

  protected requestRelease(detail: DeckCardBindingDetail, assigned: AssignedElsewhereEntry) {
    this.releaseError.set(null);
    this.confirmingRelease.set({
      key: this.releaseKey(detail.entry.row.id, assigned),
      cardName: detail.entry.card.name,
      deckId: assigned.deckId,
      deckName: assigned.deckName,
      cardIds: assigned.cardIds,
    });
  }

  protected cancelRelease() {
    this.confirmingRelease.set(null);
  }

  protected async confirmRelease() {
    const pending = this.confirmingRelease();
    if (!pending) return;

    this.releasing.set(true);
    this.releaseError.set(null);
    try {
      await this.deckService.releaseAssignment(pending.deckId, pending.cardIds);
      this.confirmingRelease.set(null);
      this.released.emit();
    } catch (error) {
      this.releaseError.set(error instanceof Error ? error.message : this.translate.instant('deckDetail.releaseFailed'));
    } finally {
      this.releasing.set(false);
    }
  }

  protected readonly addingToWishlist = signal(false);
  protected readonly wishlistAdded = signal(false);
  protected readonly wishlistError = signal<string | null>(null);

  /** "MSH #142" style short print label for the substitute callout - substitution is an MTG-only concept (see findSubstitute's oracle_id requirement), so every card reaching this is an MtgCard in practice, but the type is the general Card union. */
  protected printLabel(card: Card): string {
    return card.game === 'mtg' ? `${card.setCode.toUpperCase()} #${card.collectorNumber}` : card.name;
  }

  async addMissingToWishlist() {
    this.addingToWishlist.set(true);
    this.wishlistError.set(null);
    try {
      const existing = await this.wishlistService.getCardIds();
      const deckName = this.entry().deck.name;
      const { owned, ownedByOracle } = this.matchingMaps();
      const inputs: UpsertWishlistInput[] = this.missingCards()
        .filter(({ row }) => !existing.has(row.card_id))
        .map(({ row, card }) => ({
          cardId: row.card_id,
          priority: 2,
          notes: this.translate.instant('common.forDeck', { name: deckName }),
          quantity: getMissingQuantity(
            row.quantity,
            getOwnedQuantity({ cardId: row.card_id, oracleId: card.oracleId }, owned, ownedByOracle),
          ),
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

  async confirmDelete() {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.deckService.deleteDeck(this.entry().deck.id, this.removeCardsOnDelete());
      this.deleted.emit();
      this.close.emit();
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : this.translate.instant('deckDetail.deleteFailed'));
    } finally {
      this.deleting.set(false);
    }
  }
}
