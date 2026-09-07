-- Per-user Gemini API keys via Supabase Vault, so the OCR edge function
-- doesn't have to run every user's scans through one shared app-level key.
--
-- REQUIRES Supabase Vault (schema `vault`, built on pgsodium). It ships
-- enabled by default on hosted Supabase projects; if this errors with
-- "schema vault does not exist", enable the `supabase_vault` extension
-- first (Dashboard -> Database -> Extensions).
--
-- No separate table: each secret's vault row is named deterministically as
-- "<secret_name>:<user_id>", so it can be looked up directly in
-- vault.secrets/vault.decrypted_secrets without an extra mapping table.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

-- 1. set_user_secret: upserts the current user's own secret by name. Called
-- directly from the Angular Settings page.
create or replace function public.set_user_secret(p_secret_name text, p_secret_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_name := p_secret_name || ':' || v_uid::text;

  select id into v_id from vault.secrets where name = v_name;

  if v_id is null then
    perform vault.create_secret(p_secret_value, v_name);
  else
    perform vault.update_secret(v_id, p_secret_value);
  end if;
end;
$$;

revoke all on function public.set_user_secret(text, text) from public;
grant execute on function public.set_user_secret(text, text) to authenticated;

-- 2. has_user_secret: lets the UI (Settings, Scanner) check whether a key is
-- on file without ever reading the decrypted value back to the client.
create or replace function public.has_user_secret(p_secret_name text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select exists (
    select 1 from vault.secrets where name = p_secret_name || ':' || auth.uid()::text
  );
$$;

revoke all on function public.has_user_secret(text) from public;
grant execute on function public.has_user_secret(text) to authenticated;

-- 3. get_user_secret_for_service: the only function that can ever read a
-- decrypted secret back out - deliberately NOT granted to authenticated/anon,
-- only to service_role, so it's reachable exclusively from the gemini-ocr
-- edge function (which authenticates the caller from their JWT itself,
-- then calls this with that verified user_id).
create or replace function public.get_user_secret_for_service(p_user_id uuid, p_secret_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = p_secret_name || ':' || p_user_id::text
  limit 1;
$$;

revoke all on function public.get_user_secret_for_service(uuid, text) from public;
grant execute on function public.get_user_secret_for_service(uuid, text) to service_role;
