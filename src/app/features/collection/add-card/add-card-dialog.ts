import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ScryfallCard, ScryfallService } from '../../../core/services/scryfall.service';
import { CardTile } from '../../../shared/cards/card-tile/card-tile';
import { CollectionService } from '../collection.service';

const SEARCH_DEBOUNCE_MS = 300;
const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

@Component({
  selector: 'app-add-card-dialog',
  imports: [FormsModule, CardTile],
  templateUrl: './add-card-dialog.html',
  styleUrl: './add-card-dialog.scss',
})
export class AddCardDialog {
  private readonly scryfall = inject(ScryfallService);
  private readonly collectionService = inject(CollectionService);

  readonly close = output<void>();
  readonly added = output<void>();

  protected readonly conditions = CONDITIONS;

  protected readonly query = signal('');
  protected readonly results = signal<ScryfallCard[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);

  protected readonly selectedCard = signal<ScryfallCard | null>(null);
  protected readonly quantity = signal(1);
  protected readonly foil = signal(false);
  protected readonly condition = signal('NM');
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  onQueryChange(value: string) {
    this.query.set(value);

    if (this.debounceHandle) clearTimeout(this.debounceHandle);

    const trimmed = value.trim();
    if (!trimmed) {
      this.results.set([]);
      this.searching.set(false);
      return;
    }

    this.searching.set(true);
    this.debounceHandle = setTimeout(() => this.search(trimmed), SEARCH_DEBOUNCE_MS);
  }

  private async search(query: string) {
    this.searchError.set(null);
    try {
      this.results.set(await this.scryfall.searchCards(query));
    } catch (error) {
      this.searchError.set(error instanceof Error ? error.message : 'Suche fehlgeschlagen.');
    } finally {
      this.searching.set(false);
    }
  }

  selectCard(card: ScryfallCard) {
    this.selectedCard.set(card);
    this.quantity.set(1);
    this.foil.set(false);
    this.condition.set('NM');
    this.submitError.set(null);
  }

  backToSearch() {
    this.selectedCard.set(null);
  }

  async submit() {
    const card = this.selectedCard();
    if (!card) return;

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      await this.collectionService.addCard({
        scryfallId: card.id,
        quantity: this.quantity(),
        foil: this.foil(),
        condition: this.condition(),
      });
      this.added.emit();
      this.close.emit();
    } catch (error) {
      this.submitError.set(
        error instanceof Error ? error.message : 'Karte konnte nicht hinzugefügt werden.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
