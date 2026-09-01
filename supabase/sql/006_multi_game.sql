-- Seed the games catalog and switch card-reference columns from
-- Scryfall-only UUIDs to generic text IDs (YGOPRODeck uses numeric IDs,
-- pokemontcg.io uses slugs — neither fits the `uuid` type).
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

-- 1. Games catalog (public reference data, read-only for clients)
alter table games enable row level security;

drop policy if exists "Anyone can read games" on games;
create policy "Anyone can read games"
  on games for select
  using (true);

insert into games (slug, name) values
  ('mtg', 'Magic: The Gathering'),
  ('yugioh', 'Yu-Gi-Oh!'),
  ('pokemon', 'Pokémon')
on conflict (slug) do nothing;

-- 2. collection_cards: scryfall_id (uuid) -> card_id (text)
alter table collection_cards rename column scryfall_id to card_id;
alter table collection_cards alter column card_id type text using card_id::text;

alter table collection_cards drop constraint if exists collection_cards_user_id_scryfall_id_foil_key;
alter table collection_cards drop constraint if exists collection_cards_user_id_game_id_scryfall_id_foil_key;
alter table collection_cards add constraint collection_cards_user_id_game_id_card_id_foil_key
  unique (user_id, game_id, card_id, foil);

-- 3. deck_cards: scryfall_id (uuid) -> card_id (text)
alter table deck_cards rename column scryfall_id to card_id;
alter table deck_cards alter column card_id type text using card_id::text;

alter table deck_cards drop constraint if exists deck_cards_deck_id_scryfall_id_key;
alter table deck_cards add constraint deck_cards_deck_id_card_id_key
  unique (deck_id, card_id);

-- 4. wishlist: scryfall_id (uuid) -> card_id (text)
alter table wishlist rename column scryfall_id to card_id;
alter table wishlist alter column card_id type text using card_id::text;

alter table wishlist drop constraint if exists wishlist_user_id_scryfall_id_key;
alter table wishlist drop constraint if exists wishlist_user_id_game_id_scryfall_id_key;
alter table wishlist add constraint wishlist_user_id_game_id_card_id_key
  unique (user_id, game_id, card_id);
