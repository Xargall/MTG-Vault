create table if not exists collection_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scryfall_id uuid not null,
  quantity int not null default 1 check (quantity > 0),
  foil boolean not null default false,
  condition text not null default 'NM',
  created_at timestamptz not null default now(),
  unique (user_id, scryfall_id, foil)
);

create index if not exists collection_cards_user_id_idx on collection_cards (user_id);

alter table collection_cards enable row level security;

create policy "Users manage own collection cards"
  on collection_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
