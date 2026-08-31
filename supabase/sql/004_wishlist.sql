create table if not exists wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scryfall_id uuid not null,
  priority smallint not null default 2 check (priority between 1 and 3),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, scryfall_id)
);

create index if not exists wishlist_user_id_idx on wishlist (user_id);

alter table wishlist enable row level security;

create policy "Users manage own wishlist"
  on wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
