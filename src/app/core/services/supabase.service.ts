import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );

  readonly session = signal<Session | null>(null);

  private resolveReady!: () => void;
  readonly ready: Promise<void> = new Promise((resolve) => {
    this.resolveReady = resolve;
  });

  constructor() {
    this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.resolveReady();
    });

    this.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }
}
