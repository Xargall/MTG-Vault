import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CARD_LANGUAGE_OPTIONS } from '../../../core/constants/card-languages';
import { MTG_LEGALITY_FORMATS, MtgFormatOption } from '../../../core/constants/mtg-formats';
import { Card, MtgCard, PokemonCard, YugiohBanlistStatus, YugiohCard } from '../../../core/models/card.model';
import { AppDialog } from '../../../shared/dialog/dialog';
import { rarityLabelKey } from '../collection-filters';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { FocusOnInitDirective } from '../../../shared/directives/focus-on-init.directive';
import { ATTRIBUTE_CATEGORIES } from '../yugioh-collection-stats';
import { COLOR_CATEGORIES, getEntryPrice } from '../collection-stats';
import { CollectionEntry, CollectionService } from '../collection.service';
import { pokemonCategoryFor, POKEMON_CATEGORIES } from '../pokemon-collection-stats';

const SYMBOL_COLORS = new Map<string, string>(
  COLOR_CATEGORIES.map(({ key, color }) => [key, color]),
);

const ATTRIBUTE_COLORS = new Map<string, string>(
  ATTRIBUTE_CATEGORIES.map(({ key, color }) => [key, color]),
);

const POKEMON_TYPE_COLORS = new Map<string, string>(
  POKEMON_CATEGORIES.map(({ key, color }) => [key, color]),
);

const BANLIST_LABELS: Record<YugiohBanlistStatus, string> = {
  Forbidden: 'yugioh.banlistForbidden',
  Limited: 'yugioh.banlistLimited',
  'Semi-Limited': 'yugioh.banlistSemiLimited',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card-detail-dialog',
  imports: [PricePipe, FormsModule, TranslatePipe, AppDialog, FocusOnInitDirective],
  templateUrl: './card-detail-dialog.html',
  styleUrl: './card-detail-dialog.scss',
})
export class CardDetailDialog {
  private readonly collectionService = inject(CollectionService);
  private readonly translate = inject(TranslateService);

  readonly entry = input.required<CollectionEntry>();
  readonly close = output<void>();
  readonly deleted = output<void>();
  // Emitted after a quantity/foil edit is saved - the parent reloads the
  // collection (same as `deleted`) so the grid/stats reflect the change too,
  // not just this dialog.
  readonly updated = output<void>();

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

  protected readonly languageOptions = CARD_LANGUAGE_OPTIONS;
  // "Your copy" is edited in place - no separate edit mode repeating the same
  // fields as a tall form. Each value follows the entry (and resets to it
  // after a save reloads it) but can be changed locally until then.
  protected readonly editQuantity = linkedSignal(() => this.entry().row.quantity);
  protected readonly editFoil = linkedSignal(() => this.entry().row.foil);
  protected readonly editLanguage = linkedSignal(() => this.entry().row.language);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  /** Save/discard only appear once something actually differs from what's stored. */
  protected readonly dirty = computed(() => {
    const row = this.entry().row;
    return (
      this.editQuantity() !== row.quantity ||
      this.editFoil() !== row.foil ||
      this.editLanguage() !== (row.language)
    );
  });

  protected stepQuantity(delta: number) {
    this.editQuantity.set(Math.max(1, Math.trunc(Number(this.editQuantity()) || 1) + delta));
  }

  protected discardEdit() {
    const row = this.entry().row;
    this.editQuantity.set(row.quantity);
    this.editFoil.set(row.foil);
    this.editLanguage.set(row.language);
    this.saveError.set(null);
  }

  // Unsaved changes and delete-confirm are mutually exclusive - with both
  // pending, "Save" and "Yes, remove" sat a few pixels apart.
  protected startDelete() {
    this.discardEdit();
    this.confirmingDelete.set(true);
  }

  async saveEdit() {
    const quantity = Math.trunc(this.editQuantity());
    if (!Number.isFinite(quantity) || quantity < 1) {
      this.saveError.set(this.translate.instant('cardDetail.invalidQuantity'));
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.collectionService.updateEntry(this.entry().row.id, {
        quantity,
        foil: this.entry().card.game === 'mtg' ? this.editFoil() : this.entry().row.foil,
        language: this.editLanguage(),
      });
      this.updated.emit();
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : this.translate.instant('cardDetail.saveFailed'),
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected readonly rarityLabel = computed(() => {
    const rarity = this.entry().card.rarity;
    if (!rarity) return null;
    return rarityLabelKey(this.entry().card.game, rarity);
  });

  protected readonly price = computed(() => getEntryPrice(this.entry(), 'eur'));

  protected readonly languageLabelKey = computed(() => {
    const code = this.entry().row.language;
    return CARD_LANGUAGE_OPTIONS.find((option) => option.code === code)?.labelKey ?? null;
  });

  protected asMtgCard(card: Card): MtgCard | null {
    return card.game === 'mtg' ? card : null;
  }

  protected asYugiohCard(card: Card): YugiohCard | null {
    return card.game === 'yugioh' ? card : null;
  }

  protected asPokemonCard(card: Card): PokemonCard | null {
    return card.game === 'pokemon' ? card : null;
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

  protected readonly pokemonTypeColor = computed(() => {
    const card = this.asPokemonCard(this.entry().card);
    if (!card) return null;
    return POKEMON_TYPE_COLORS.get(pokemonCategoryFor(card)) ?? 'var(--color-border)';
  });

  /**
   * Every format Scryfall tracks legality for (see MTG_LEGALITY_FORMATS),
   * paired with this card's own status in it - 'not_legal' for a format
   * missing from the raw `legalities` object entirely (shouldn't happen on
   * real data, but a format absent from a card's own legality map reads the
   * same as "not legal here" either way). Empty for a non-MTG card, or an
   * MTG card whose `legalities` hasn't synced yet (see MtgCard.legalities).
   */
  protected readonly formatLegalities = computed<{ format: MtgFormatOption; status: string }[]>(() => {
    const legalities = this.asMtgCard(this.entry().card)?.legalities;
    if (!legalities) return [];
    return MTG_LEGALITY_FORMATS.map((format) => ({ format, status: legalities[format.slug] ?? 'not_legal' }));
  });

  protected legalityStatusLabelKey(status: string): string {
    switch (status) {
      case 'legal':
        return 'cardDetail.legalityLegal';
      case 'restricted':
        return 'cardDetail.legalityRestricted';
      case 'banned':
        return 'cardDetail.legalityBanned';
      default:
        return 'cardDetail.legalityNotLegal';
    }
  }
}
