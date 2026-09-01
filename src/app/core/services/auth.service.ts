import { Injectable, computed, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';
import { DemoSeedService } from './demo-seed.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly demoSeed = inject(DemoSeedService);

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

    if (data.user) {
      await this.demoSeed.seed();
    }
  }

  async signOut() {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
  }
}
