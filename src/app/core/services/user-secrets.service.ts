import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from './supabase.service';

const GEMINI_SECRET_NAME = 'gemini_api_key';

/**
 * Client for the per-user secrets stored in Supabase Vault (see
 * supabase/sql/012_user_secrets.sql) - currently just the user's own Gemini
 * API key. The decrypted value never comes back to the browser once saved;
 * only has_user_secret's existence check does, so the UI can show "key on
 * file" without ever re-reading the key itself.
 */
@Injectable({ providedIn: 'root' })
export class UserSecretsService {
  private readonly supabase = inject(SupabaseService);

  // null = not checked yet (or the check itself failed) - treated as "don't
  // know", not "no key", so callers can fail open rather than hiding a
  // working feature behind a flaky status check.
  readonly hasGeminiKey = signal<boolean | null>(null);

  async refreshGeminiKeyStatus(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client.rpc('has_user_secret', {
        p_secret_name: GEMINI_SECRET_NAME,
      });
      this.hasGeminiKey.set(error ? null : !!data);
    } catch {
      this.hasGeminiKey.set(null);
    }
  }

  async saveGeminiKey(key: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('set_user_secret', {
      p_secret_name: GEMINI_SECRET_NAME,
      p_secret_value: key,
    });
    if (error) throw error;
    this.hasGeminiKey.set(true);
  }

  async testGeminiKey(key: string): Promise<boolean> {
    const { data, error } = await this.supabase.client.functions.invoke<{ valid?: boolean }>('gemini-ocr', {
      body: { testApiKey: key },
    });
    if (error) return false;
    return !!data?.valid;
  }
}
