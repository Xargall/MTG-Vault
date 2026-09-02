import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SupabaseService } from './supabase.service';
import { DemoSeedService } from './demo-seed.service';

const PENDING_INVITE_TOKEN_KEY = 'tcgvault.pendingInviteToken';
const GUEST_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly demoSeed = inject(DemoSeedService);
  private readonly router = inject(Router);

  readonly session = this.supabase.session;
  readonly isAuthenticated = computed(() => this.session() !== null);

  readonly isGuest = computed(() => this.session()?.user.is_anonymous === true);

  readonly guestExpiresAt = computed<Date | null>(() => {
    const user = this.session()?.user;
    if (!user?.is_anonymous) return null;
    return new Date(new Date(user.created_at).getTime() + GUEST_TTL_MS);
  });

  readonly isGuestExpired = computed(() => {
    const expiresAt = this.guestExpiresAt();
    return expiresAt !== null && expiresAt.getTime() <= Date.now();
  });

  constructor() {
    // Catches the OAuth (Google) redirect back into the app: that's a fresh
    // page load at /auth/callback, not a navigation triggered by our own
    // sign-in calls, so nothing else in the app would otherwise notice the
    // session becoming ready and move off that page. Skip /auth/callback
    // itself here - that page runs its own async invite check first and
    // decides where to go (see finalizeGoogleSignIn).
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && window.location.pathname !== '/auth/callback') {
        const redirectTo = new URLSearchParams(window.location.search).get('redirectTo') || '/';
        this.router.navigateByUrl(redirectTo);
      }
    });

    setInterval(() => this.checkGuestExpiry(), 60_000);
  }

  private async checkGuestExpiry() {
    if (this.isGuestExpired()) {
      await this.signOut();
      await this.router.navigate(['/login'], { queryParams: { error: 'demoExpired' } });
    }
  }

  async verifyInviteCode(code: string): Promise<string> {
    const { data, error } = await this.supabase.client.rpc('verify_invite_code', { p_code: code });
    if (error || !data) throw new Error('invite_invalid');
    return data as string;
  }

  recordPendingInviteToken(token: string) {
    localStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
  }

  private consumePendingInviteToken(): string | null {
    const token = localStorage.getItem(PENDING_INVITE_TOKEN_KEY);
    localStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
    return token;
  }

  async isCurrentUserInvited(): Promise<boolean> {
    const uid = this.session()?.user.id;
    if (!uid) return false;
    const { data } = await this.supabase.client
      .from('invited_users')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle();
    return !!data;
  }

  async finalizeGoogleSignIn(): Promise<'ok' | 'rejected'> {
    if (await this.isCurrentUserInvited()) return 'ok';

    const pendingToken = this.consumePendingInviteToken();
    if (pendingToken) {
      const { data } = await this.supabase.client.rpc('redeem_invite_for_current_user', {
        p_token: pendingToken,
      });
      if (data) return 'ok';
    }

    try {
      await this.supabase.client.rpc('delete_unprivileged_account');
    } catch {
      // best-effort cleanup; signOut() below still runs regardless
    }
    await this.signOut();
    return 'rejected';
  }

  async signUpWithEmail(email: string, password: string, inviteToken: string) {
    const { error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { invite_token: inviteToken } },
    });
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
