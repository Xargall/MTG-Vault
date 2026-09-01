import { Injectable, inject } from '@angular/core';

import { PreconDeckProvider, PreconDetail, PreconIndexData, PreconListEntry } from '../models/precon.model';
import { MtgjsonService } from './mtgjson.service';

@Injectable({ providedIn: 'root' })
export class MtgPreconService implements PreconDeckProvider {
  private readonly mtgjson = inject(MtgjsonService);

  async getDeckList(): Promise<PreconListEntry[]> {
    const list = await this.mtgjson.getDeckList();
    return list.map((deck) => ({
      fileName: deck.fileName,
      name: deck.name,
      type: deck.type,
      releaseDate: deck.releaseDate,
      bannerImageUrl: null,
    }));
  }

  async getDeckDetail(fileName: string): Promise<PreconDetail> {
    const detail = await this.mtgjson.getDeckDetail(fileName);
    return {
      heroCardId: detail.heroScryfallId,
      cards: detail.cards.map((card) => ({ cardId: card.scryfallId, quantity: card.quantity })),
      skippedCount: detail.skippedCount,
    };
  }

  async getDeckIndexData(fileName: string): Promise<PreconIndexData> {
    const data = await this.mtgjson.getDeckIndexData(fileName);
    return {
      names: data.names,
      heroCardId: data.heroScryfallId,
      cards: data.cards.map((card) => ({ cardId: card.scryfallId, quantity: card.quantity })),
      skippedCount: data.skippedCount,
    };
  }
}
