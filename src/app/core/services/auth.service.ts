import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SupabaseService } from './supabase.service';
import { DemoSeedService } from './demo-seed.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly demoSeed = inject(DemoSeedService);
  private readonly router = inject(Router);

  readonly session = this.supabase.session;
  readonly isAuthenticated = computed(() => this.session() !== null);

  constructor() {
    // Catches the OAuth (Google) redirect back into the app: that's a fresh
    // page load at /auth/callback, not a navigation triggered by our own
    // sign-in calls, so nothing else in the app would otherwise notice the
    // session becoming ready and move off that page.
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const redirectTo = new URLSearchParams(window.location.search).get('redirectTo') || '/';
        this.router.navigateByUrl(redirectTo);
      }
    });
  }

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
