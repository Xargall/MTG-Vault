-- Public storage bucket for user-uploaded profile pictures (Profil page).
-- Public read (avatars are shown to nobody but the owner in this app today,
-- but a public bucket means getPublicUrl() works with no signed-URL
-- refresh logic); write access is restricted per-user by the policies below
-- (path convention: "<user_id>/avatar.<ext>", enforced via storage.foldername).
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- storage.objects is owned by supabase_storage_admin (not the SQL editor's
-- role) and already has RLS enabled by default on every Supabase project -
-- attempting to ALTER it here just fails with "must be owner of table
-- objects". Only creating policies on it is needed (and permitted).

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
