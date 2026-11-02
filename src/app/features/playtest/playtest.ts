import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  WritableSignal,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { DeckEntry } from '../decks/deck.service';
import { Battlefield } from './battlefield/battlefield';
import { Hand } from './hand/hand';
import { PlaytestCard } from './playtest-card/playtest-card';
import { BattlefieldCard, PlaytestCardInstance, buildLibrary, shuffle, snapToBand } from './playtest-library';
import { PlaytestPreviewService } from './playtest-preview.service';
import { PlaytestService } from './playtest.service';
import { ZonePile } from './zone-pile/zone-pile';

const STARTING_HAND_SIZE = 7;
const DEFAULT_LIFE = 40; // this app leans Commander-heavy (see its bracket system)
// The signature "page-turn" draw move (see DESIGN.md's Motion section,
// "blättern um") - half reveals the face at the midpoint, full removes the
// card from the library pile into hand. Kept under the dialog-tier 220ms-ish
// budget DESIGN.md's Motion section sets for "Ebenen" transitions.
const DRAW_FLIP_HALF_MS = 130;
const DRAW_FLIP_FULL_MS = 260;

/** The playtest route (not a dialog - needs real screen space, same reasoning as /scan). Owns every gameplay signal itself: a game in progress has no reason to survive leaving the route (see PlaytestService's own doc). Reads its deck once from PlaytestService - a direct /playtest deep link with nothing handed off shows the "kein Deck ausgewählt" state instead. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-playtest',
  imports: [RouterLink, FormsModule, TranslatePipe, PlaytestCard, ZonePile, Hand, Battlefield],
  templateUrl: './playtest.html',
  styleUrl: './playtest.scss',
})
export class Playtest {
  private readonly playtestService = inject(PlaytestService);
  private readonly previewService = inject(PlaytestPreviewService);

  protected readonly deckEntry = this.playtestService.deckEntry;
  protected readonly previewCard = this.previewService.hoveredCard;

  protected readonly library = signal<PlaytestCardInstance[]>([]);
  protected readonly hand = signal<PlaytestCardInstance[]>([]);
  protected readonly battlefield = signal<BattlefieldCard[]>([]);
  protected readonly graveyard = signal<PlaytestCardInstance[]>([]);
  protected readonly exile = signal<PlaytestCardInstance[]>([]);
  protected readonly commandZone = signal<PlaytestCardInstance | null>(null);
  protected readonly life = signal(DEFAULT_LIFE);
  protected readonly turn = signal(1);
  // Highlights the battlefield while a hand card is being dragged over it
  // (see Hand's own cardDragMoved output) - CDK's drag preview already
  // follows the cursor, but gave no feedback on whether *this* drop would
  // actually register as playing the card (live-reported: "ich sehe nicht,
  // wohin ich die ziehe").
  protected readonly handDragActive = signal(false);

  protected readonly topLibraryCard = computed(() => this.library()[0] ?? null);
  protected readonly isDrawing = signal(false);
  protected readonly drawRevealed = signal(false);
  private readonly drawTimeouts: ReturnType<typeof setTimeout>[] = [];

  private readonly battlefieldHost = viewChild('battlefieldHost', { read: ElementRef<HTMLElement> });

  constructor() {
    const entry = this.deckEntry();
    if (entry) this.resetGame(entry);

    inject(DestroyRef).onDestroy(() => this.drawTimeouts.forEach(clearTimeout));
  }

  private resetGame(entry: DeckEntry): void {
    const { library, commander } = buildLibrary(entry);
    this.library.set(shuffle(library));
    this.commandZone.set(commander);
    this.hand.set([]);
    this.battlefield.set([]);
    this.graveyard.set([]);
    this.exile.set([]);
    this.life.set(DEFAULT_LIFE);
    this.turn.set(1);
    this.drawStartingHand();
  }

  private drawStartingHand(): void {
    const drawn = this.library().slice(0, STARTING_HAND_SIZE);
    this.library.update((lib) => lib.slice(STARTING_HAND_SIZE));
    this.hand.set(drawn);
  }

  protected onNewGame(): void {
    const entry = this.deckEntry();
    if (entry) this.resetGame(entry);
  }

  protected onShuffle(): void {
    this.library.update(shuffle);
  }

  protected onNextTurn(): void {
    this.turn.update((t) => t + 1);
  }

  /** Mid-drag position of a hand card, reported continuously (CDK's cdkDragMoved) - only used to toggle the battlefield's own drop-target highlight, not to decide the actual drop (onHandCardDropped re-checks the final point itself). */
  protected onHandCardDragMoved(payload: { clientX: number; clientY: number }): void {
    const rect = this.battlefieldHost()?.nativeElement.getBoundingClientRect();
    if (!rect) {
      this.handDragActive.set(false);
      return;
    }
    const { clientX, clientY } = payload;
    this.handDragActive.set(clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom);
  }

  /** Puts the whole hand back, reshuffles, draws 7 again - repeatable, no London-mulligan partial-hand logic (see plan doc: out of scope for v1). */
  protected onMulligan(): void {
    this.library.update((lib) => shuffle([...lib, ...this.hand()]));
    this.hand.set([]);
    this.drawStartingHand();
  }

  /** The one signature-move draw action - see DRAW_FLIP_*_MS's doc. Clicking the library mid-flip is a no-op (isDrawing guards it) rather than queuing, so a flipped card always finishes its own animation before the next one starts. */
  protected draw(): void {
    if (this.isDrawing() || this.library().length === 0) return;
    this.isDrawing.set(true);
    this.drawRevealed.set(false);
    this.drawTimeouts.push(
      setTimeout(() => this.drawRevealed.set(true), DRAW_FLIP_HALF_MS),
      setTimeout(() => {
        const [card, ...rest] = this.library();
        this.library.set(rest);
        this.hand.update((h) => [...h, card]);
        this.isDrawing.set(false);
        this.drawRevealed.set(false);
      }, DRAW_FLIP_FULL_MS),
    );
  }

  /** A card dragged out of hand only actually gets played if it's dropped over the battlefield's own bounds - otherwise CDK's default "spring back to the fan" behavior already handles "you didn't play it" (see hand.ts's own doc), so this silently no-ops rather than needing an explicit rejection path. */
  protected onHandCardDropped(payload: { instanceId: string; clientX: number; clientY: number }): void {
    this.handDragActive.set(false);
    const rect = this.battlefieldHost()?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    const { clientX, clientY } = payload;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;

    const card = this.hand().find((c) => c.instanceId === payload.instanceId);
    if (!card) return;
    this.hand.update((items) => items.filter((c) => c.instanceId !== payload.instanceId));
    const fallback = { x: clientX - rect.left, y: clientY - rect.top };
    this.battlefield.update((items) => [...items, { ...card, ...(snapToBand(card.card, items, rect.height) ?? fallback) }]);
  }

  protected onBattlefieldPositionChanged(payload: { instanceId: string; x: number; y: number }): void {
    this.battlefield.update((items) =>
      items.map((c) => (c.instanceId === payload.instanceId ? { ...c, x: payload.x, y: payload.y } : c)),
    );
  }

  protected onSentToGraveyard(instanceId: string): void {
    this.moveFromBattlefield(instanceId, this.graveyard);
  }

  protected onSentToExile(instanceId: string): void {
    this.moveFromBattlefield(instanceId, this.exile);
  }

  private moveFromBattlefield(instanceId: string, target: WritableSignal<PlaytestCardInstance[]>): void {
    const card = this.battlefield().find((c) => c.instanceId === instanceId);
    if (!card) return;
    this.battlefield.update((items) => items.filter((c) => c.instanceId !== instanceId));
    const { x: _x, y: _y, ...instance } = card;
    target.update((items) => [instance, ...items]);
  }

  protected onReturnFromGraveyard(): void {
    this.returnTopToBattlefield(this.graveyard);
  }

  protected onReturnFromExile(): void {
    this.returnTopToBattlefield(this.exile);
  }

  protected onCastCommander(): void {
    const commander = this.commandZone();
    if (!commander) return;
    this.commandZone.set(null);
    this.placeOnBattlefield(commander);
  }

  private returnTopToBattlefield(zone: WritableSignal<PlaytestCardInstance[]>): void {
    const [top, ...rest] = zone();
    if (!top) return;
    zone.set(rest);
    this.placeOnBattlefield(top);
  }

  /** Shared by every "enters the battlefield from somewhere else" path (commander cast, graveyard/exile return) - snaps into its band (land/creature) the same way a hand drop does; falls back to a fixed top-left spot (there's no drop point to fall back to here, unlike onHandCardDropped's own pointer coordinates). */
  private placeOnBattlefield(instance: PlaytestCardInstance): void {
    const rect = this.battlefieldHost()?.nativeElement.getBoundingClientRect();
    const fallback = { x: 20, y: 20 };
    this.battlefield.update((items) => [
      ...items,
      { ...instance, ...(rect ? (snapToBand(instance.card, items, rect.height) ?? fallback) : fallback) },
    ]);
  }

  protected onLifeChange(value: number): void {
    this.life.set(value);
  }
}
