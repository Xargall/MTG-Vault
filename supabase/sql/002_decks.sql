create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  format text,
  is_precon boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  scryfall_id uuid not null,
  quantity int not null default 1 check (quantity > 0),
  unique (deck_id, scryfall_id)
);

create index if not exists decks_user_id_idx on decks (user_id);
create index if not exists deck_cards_deck_id_idx on deck_cards (deck_id);

alter table decks enable row level security;
alter table deck_cards enable row level security;

create policy "Users manage own decks"
  on decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own deck cards"
  on deck_cards for all
  using (exists (select 1 from decks where decks.id = deck_cards.deck_id and decks.user_id = auth.uid()))
  with check (exists (select 1 from decks where decks.id = deck_cards.deck_id and decks.user_id = auth.uid()));
