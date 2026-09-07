import { Injectable, inject } from '@angular/core';

import { PreconDeckProvider, PreconIndexData, PreconListEntry } from '../models/precon.model';
import { GameService } from './game.service';
import { MtgApiService } from './mtg-api.service';
import { MtgPreconService } from './mtg-precon.service';
import { PokemonApiService } from './pokemon-api.service';
import { YugiohApiService } from './yugioh-api.service';
import { YugiohPreconService } from './yugioh-precon.service';
import { AddCardInput, CollectionService } from '../../features/collection/collection.service';
import { DeckService } from '../../features/decks/deck.service';
import { UpsertWishlistInput, WishlistService } from '../../features/wishlist/wishlist.service';

const MTG_COLLECTION: Array<{ name: string; quantity: number }> = [
  { name: 'Lightning Bolt', quantity: 3 },
  { name: 'Llanowar Elves', quantity: 2 },
  { name: 'Sol Ring', quantity: 1 },
  { name: 'Counterspell', quantity: 2 },
  { name: 'Doom Blade', quantity: 1 },
  { name: 'Lightning Helix', quantity: 1 },
  { name: 'Wrath of God', quantity: 1 },
  { name: 'Serra Angel', quantity: 1 },
  { name: 'Craterhoof Behemoth', quantity: 1 },
];

const MTG_WISHLIST = ['Cyclonic Rift', 'Rhystic Study', 'Demonic Tutor', 'Swords to Plowshares', 'Mana Crypt'];

const YUGIOH_COLLECTION: Array<{ name: string; quantity: number }> = [
  { name: 'Blue-Eyes White Dragon', quantity: 1 },
  { name: 'Dark Magician', quantity: 1 },
  { name: 'Summoned Skull', quantity: 1 },
  { name: '7 Colored Fish', quantity: 2 },
  { name: 'Celtic Guardian', quantity: 2 },
  { name: 'Harpie Lady', quantity: 1 },
  { name: 'Flame Swordsman', quantity: 1 },
  { name: 'Pot of Greed', quantity: 1 },
  { name: 'Mirror Force', quantity: 1 },
];

const YUGIOH_WISHLIST = [
  'Exodia the Forbidden One',
  'Red-Eyes Black Dragon',
  'Monster Reborn',
  'Change of Heart',
  'Time Wizard',
];

// German names (TCGdex's primary locale - see PokemonApiService) for
// well-known Pokémon, so the demo collection resolves cleanly on the first try.
const POKEMON_COLLECTION: Array<{ name: string; quantity: number }> = [
  { name: 'Glurak', quantity: 1 },
  { name: 'Pikachu', quantity: 2 },
  { name: 'Bisaflor', quantity: 1 },
  { name: 'Turtok', quantity: 1 },
  { name: 'Relaxo', quantity: 2 },
  { name: 'Gengar', quantity: 1 },
  { name: 'Mauzi', quantity: 2 },
  { name: 'Onix', quantity: 1 },
];

const POKEMON_WISHLIST = ['Mewtu', 'Lugia', 'Dragoran', 'Kadabra', 'Zapdos'];

// Picked by exact name rather than dynamically (unlike the MTG Commander
// Decks below) because YGOPRODeck's precon catalog includes edge cases like
// multi-deck bundle products sharing one set_code (see YugiohPreconService) -
// these five are individually verified to resolve cleanly.
const YUGIOH_STRUCTURE_DECK_NAMES = [
  "Dinosmasher's Fury Structure Deck",
  'Machine Reactor Structure Deck',
  'Pendulum Domination Structure Deck',
  'Rise of the True Dragons Structure Deck',
  'Emperor of Darkness Structure Deck',
];

const DECKS_PER_GAME = 5;
const COMPLETE_DECKS_PER_GAME = 3;
const PARTIAL_TRIM_FRACTION = 0.35;

/** Populates a fresh guest account with a realistic-looking collection, decks (some complete, some in progress), and wishlist for every supported game - so "Demo ausprobieren" actually demonstrates the app instead of landing on empty screens. */
@Injectable({ providedIn: 'root' })
export class DemoSeedService {
  private readonly gameService = inject(GameService);
  private readonly collectionService = inject(CollectionService);
  private readonly deckService = inject(DeckService);
  private readonly wishlistService = inject(WishlistService);
  private readonly mtgApi = inject(MtgApiService);
  private readonly yugiohApi = inject(YugiohApiService);
  private readonly pokemonApi = inject(PokemonApiService);
  private readonly mtgPrecon = inject(MtgPreconService);
  private readonly yugiohPrecon = inject(YugiohPreconService);

  async seed(): Promise<void> {
    const originalSlug = this.gameService.currentSlug();
    try {
      this.gameService.setGame('mtg');
      const mtgBaseIds = await this.seedCollection(MTG_COLLECTION, (names) => this.mtgApi.getCardsByNames(names));
      await this.seedWishlist(MTG_WISHLIST, (names) => this.mtgApi.getCardsByNames(names));
      const mtgDecks = await this.pickMtgDecks();
      await this.seedDecks(this.mtgPrecon, mtgDecks, mtgBaseIds);

      this.gameService.setGame('yugioh');
      const yugiohBaseIds = await this.seedCollection(YUGIOH_COLLECTION, (names) =>
        this.yugiohApi.getCardsByNames(names),
      );
      await this.seedWishlist(YUGIOH_WISHLIST, (names) => this.yugiohApi.getCardsByNames(names));
      const yugiohDecks = await this.pickYugiohDecks();
      await this.seedDecks(this.yugiohPrecon, yugiohDecks, yugiohBaseIds);

      // No precon provider for Pokémon yet (see GameService.precon) - just
      // collection + wishlist, no seedDecks step.
      this.gameService.setGame('pokemon');
      await this.seedCollection(POKEMON_COLLECTION, (names) => this.pokemonApi.getCardsByNames(names));
      await this.seedWishlist(POKEMON_WISHLIST, (names) => this.pokemonApi.getCardsByNames(names));
    } finally {
      this.gameService.setGame(originalSlug);
    }
  }

  private async pickMtgDecks(): Promise<PreconListEntry[]> {
    try {
      const list = await this.mtgPrecon.getDeckList();
      // Challenger Decks (60 cards, ~20-25 unique) rather than Commander
      // Decks (100 singleton cards each) - 3-5 Commander decks would bloat
      // the demo collection to 300+ cards, which then makes every page load
      // batch-fetch that many cards from Scryfall at once.
      return list
        .filter((deck) => deck.type === 'Challenger Deck' && !/collector/i.test(deck.name))
        .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
        .slice(0, DECKS_PER_GAME);
    } catch (error) {
      console.warn('MTG-Demo-Decks konnten nicht geladen werden:', error);
      return [];
    }
  }

  private async pickYugiohDecks(): Promise<PreconListEntry[]> {
    try {
      const list = await this.yugiohPrecon.getDeckList();
      const byName = new Map(list.map((deck) => [deck.name, deck]));
      return YUGIOH_STRUCTURE_DECK_NAMES.map((name) => byName.get(name)).filter(
        (deck): deck is PreconListEntry => !!deck,
      );
    } catch (error) {
      console.warn('Yu-Gi-Oh-Demo-Decks konnten nicht geladen werden:', error);
      return [];
    }
  }

  private async seedCollection(
    cards: Array<{ name: string; quantity: number }>,
    getCardsByNames: (names: string[]) => Promise<{ id: string; name: string }[]>,
  ): Promise<Set<string>> {
    try {
      const resolved = await getCardsByNames(cards.map((c) => c.name));
      const quantityByName = new Map(cards.map((c) => [c.name.toLowerCase(), c.quantity]));

      const inputs: AddCardInput[] = resolved.map((card) => ({
        cardId: card.id,
        quantity: quantityByName.get(card.name.toLowerCase()) ?? 1,
        foil: false,
        condition: 'NM',
      }));

      if (inputs.length > 0) await this.collectionService.addCards(inputs);
      return new Set(resolved.map((card) => card.id));
    } catch (error) {
      console.warn('Demo-Sammlung konnte nicht angelegt werden:', error);
      return new Set();
    }
  }

  private async seedWishlist(
    names: string[],
    getCardsByNames: (names: string[]) => Promise<{ id: string; name: string }[]>,
  ) {
    try {
      const resolved = await getCardsByNames(names);
      const inputs: UpsertWishlistInput[] = resolved.map((card, index) => ({
        cardId: card.id,
        priority: (index % 3) + 1,
        notes: null,
      }));
      if (inputs.length > 0) await this.wishlistService.upsertMany(inputs);
    } catch (error) {
      console.warn('Demo-Wunschliste konnte nicht angelegt werden:', error);
    }
  }

  private async seedDecks(precon: PreconDeckProvider, entries: PreconListEntry[], protectedCardIds: Set<string>) {
    if (entries.length === 0) return;

    const details: Array<{ entry: PreconListEntry; data: PreconIndexData }> = [];
    for (const entry of entries) {
      try {
        const data = await precon.getDeckIndexData(entry.fileName);
        details.push({ entry, data });
      } catch (error) {
        console.warn(`Demo-Deck "${entry.name}" konnte nicht geladen werden:`, error);
      }
    }

    for (const { entry, data } of details) {
      try {
        await this.deckService.addPreconDeck(entry.name, entry.type, entry.releaseDate, entry.fileName, {
          heroCardId: data.heroCardId,
          cards: data.cards,
          skippedCount: data.skippedCount,
        });
      } catch (error) {
        console.warn(`Demo-Deck "${entry.name}" konnte nicht hinzugefügt werden:`, error);
      }
    }

    // Every deck above was just synced to 100% - trim a portion of the last
    // few decks' cards that no *other* selected deck (or the base
    // collection) needs, so they end up realistically "in progress" instead
    // of complete, without risking touching a card another deck relies on.
    const partialDetails = details.slice(COMPLETE_DECKS_PER_GAME);
    for (const { entry, data } of partialDetails) {
      const otherRequired = new Set([
        ...protectedCardIds,
        ...details
          .filter((other) => other.entry.fileName !== entry.fileName)
          .flatMap((other) => other.data.cards.map((card) => card.cardId)),
      ]);
      const uniqueCardIds = data.cards.map((card) => card.cardId).filter((id) => !otherRequired.has(id));
      const trimCount = Math.round(uniqueCardIds.length * PARTIAL_TRIM_FRACTION);

      for (const cardId of uniqueCardIds.slice(0, trimCount)) {
        try {
          await this.collectionService.removeCard(cardId);
        } catch {
          // Non-fatal - that deck just stays a bit more complete than intended.
        }
      }
    }
  }
}
