import { Injectable, computed, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';
import { ScryfallService } from './scryfall.service';

const DEMO_CARDS: Array<{ name: string; quantity: number }> = [
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly scryfall = inject(ScryfallService);

  readonly session = this.supabase.session;
  readonly isAuthenticated = computed(() => this.session() !== null);

  async signUpWithEmail(email: string, password: string) {
    const { error } = await this.supabase.client.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signInWithEmail(email: string, password: string) {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signInWithGoogle() {
    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }

  async signInAsGuest() {
    const { data, error } = await this.supabase.client.auth.signInAnonymously();
    if (error) throw error;

    const userId = data.user?.id;
    if (userId) {
      await this.seedDemoCollection(userId);
    }
  }

  private async seedDemoCollection(userId: string) {
    try {
      const cards = await this.scryfall.getCardsByNames(DEMO_CARDS.map((entry) => entry.name));
      const quantityByName = new Map(
        DEMO_CARDS.map((entry) => [entry.name.toLowerCase(), entry.quantity]),
      );

      const rows = cards.map((card) => ({
        user_id: userId,
        scryfall_id: card.id,
        quantity: quantityByName.get(card.name.toLowerCase()) ?? 1,
      }));

      if (rows.length > 0) {
        await this.supabase.client.from('collection_cards').insert(rows);
      }
    } catch (error) {
      console.warn('Demo-Sammlung konnte nicht angelegt werden:', error);
    }
  }

  async signOut() {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
  }
}
