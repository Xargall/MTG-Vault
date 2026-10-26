import { Injectable, inject } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { CommanderSpellbookResult } from '../../features/decks/commander-bracket';
import { SupabaseService } from './supabase.service';

// Same reasoning as EdhrecService/MoxfieldService's own cooldown - if the
// commanderspellbook-proxy itself gets blocked (or errors) once, pausing
// further calls for a while beats hammering it again immediately. Shorter
// than EDHREC's 30min: this is a single, user-triggered, on-demand call (see
// DeckDetailDialog's "check combos" button), not a burst of automatic ones,
// so a failure is far more likely a transient network blip worth retrying
// soon than an IP-level block.
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;

export interface CardInDeckRequest {
  card: string;
  quantity: number;
}

/**
 * Client for the `commanderspellbook-proxy` Supabase Edge Function -
 * Commander Spellbook's public `/estimate-bracket` endpoint (see that
 * proxy's own doc comment for why a proxy is needed at all: no CORS header
 * on its preflight response, even though the endpoint itself needs no auth).
 * Only ever used on-demand (a deck-detail button click), never eager on page
 * load - same caution as the EDHREC-proxy incident that shaped every other
 * proxy service in this file's family.
 */
@Injectable({ providedIn: 'root' })
export class CommanderSpellbookService {
  private readonly supabase = inject(SupabaseService);

  private rateLimitedUntil = 0;

  async estimateBracket(
    main: CardInDeckRequest[],
    commanders: CardInDeckRequest[],
  ): Promise<CommanderSpellbookResult> {
    if (Date.now() < this.rateLimitedUntil) {
      throw new Error('Commander Spellbook ist gerade nicht erreichbar - bitte später erneut versuchen.');
    }

    const { data, error } = await this.supabase.client.functions.invoke<CommanderSpellbookResult & { error?: string }>(
      'commanderspellbook-proxy',
      { body: { main, commanders } },
    );

    if (error) {
      if (error instanceof FunctionsHttpError) {
        this.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        const responseBody = await error.context
          .clone()
          .json()
          .catch(() => null);
        throw new Error(responseBody?.error ?? error.message);
      }
      throw error;
    }
    if (!data || data.error) {
      throw new Error(data?.error ?? 'Commander-Spellbook-Anfrage fehlgeschlagen');
    }

    return data;
  }
}
