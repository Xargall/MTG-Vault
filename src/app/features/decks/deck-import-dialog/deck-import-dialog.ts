import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { GameService } from '../../../core/services/game.service';
import { MtgApiService } from '../../../core/services/mtg-api.service';
import { ScrollLockDirective } from '../../../shared/directives/scroll-lock.directive';
import { DeckService } from '../deck.service';

type ImportStatus = 'form' | 'importing' | 'done';

interface ParsedLine {
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
}

// Moxfield/Archidekt-style deck list line: "[quantity] [name] [(SET)] [number]",
// set code and collector number both optional.
const LINE_PATTERN = /^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?(?:\s+(\d+))?$/;

function parseLine(line: string): ParsedLine | null {
  const match = LINE_PATTERN.exec(line);
  if (!match) return null;
  return {
    quantity: parseInt(match[1], 10),
    name: match[2].trim(),
    setCode: match[3]?.toLowerCase(),
    collectorNumber: match[4],
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-import-dialog',
  imports: [FormsModule, TranslatePipe, ScrollLockDirective],
  templateUrl: './deck-import-dialog.html',
  styleUrl: './deck-import-dialog.scss',
})
export class DeckImportDialog {
  private readonly mtgApi = inject(MtgApiService);
  private readonly gameService = inject(GameService);
  private readonly deckService = inject(DeckService);
  private readonly translate = inject(TranslateService);

  readonly close = output<void>();
  readonly imported = output<void>();

  protected readonly deckName = signal('');
  protected readonly listText = signal('');

  protected readonly status = signal<ImportStatus>('form');
  protected readonly current = signal(0);
  protected readonly total = signal(0);
  protected readonly importedCount = signal(0);
  protected readonly failedLines = signal<string[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  protected async startImport() {
    const lines = this.listText()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) return;

    this.status.set('importing');
    this.errorMessage.set(null);
    this.current.set(0);
    this.total.set(lines.length);

    // One at a time, not all lines in parallel - MtgApiService's ScryfallQueue
    // already rate-limits every call, but a deck list can be 100+ lines and
    // this also gives clean, line-accurate "card X of Y" progress.
    const resolved = new Map<string, number>();
    const failed: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      this.current.set(i + 1);
      const line = lines[i];
      const parsed = parseLine(line);
      if (!parsed) {
        failed.push(line);
        continue;
      }

      try {
        const isMtg = this.gameService.currentSlug() === 'mtg';
        // MTG keeps its precise set+number resolution (an exact print, not a
        // fuzzy guess) when the pasted line includes it; every other game -
        // and MTG lines without a set code - falls back to the same
        // fuzzy-name identifyCard() every service already implements for OCR.
        const card =
          isMtg && parsed.setCode && parsed.collectorNumber
            ? await this.mtgApi.getCardBySetAndNumber(parsed.setCode, parsed.collectorNumber)
            : isMtg
              ? await this.mtgApi.getCardByFuzzyName(parsed.name)
              : (await this.gameService.cardApi().identifyCard(parsed.name))?.card ?? null;

        if (!card) {
          failed.push(line);
          continue;
        }
        resolved.set(card.id, (resolved.get(card.id) ?? 0) + parsed.quantity);
      } catch {
        failed.push(line);
      }
    }

    this.failedLines.set(failed);

    const cards = [...resolved.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
    this.importedCount.set(cards.reduce((sum, card) => sum + card.quantity, 0));

    if (cards.length > 0) {
      try {
        const name = this.deckName().trim() || this.translate.instant('deckImport.defaultName');
        await this.deckService.importDeck(name, cards);
        this.imported.emit();
      } catch (error) {
        this.errorMessage.set(
          error instanceof Error ? error.message : this.translate.instant('deckImport.importFailed'),
        );
      }
    }

    this.status.set('done');
  }
}
