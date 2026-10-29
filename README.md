# TCG Vault

A self-hosted, ad-free trading card game collector built as an Angular PWA — full control over features, filtering, and card limits, no paywall.

Manages card collections, decks, and wishlists for multiple TCGs in one app.

🔗 **Live:** [tcg-vault.mathias-mayer.de](https://tcg-vault.mathias-mayer.de/)

## Supported games

| Game                  | API           | Status      |
| ---------------------- | ------------- | ----------- |
| Magic: The Gathering    | [Scryfall](https://scryfall.com/docs/api) | ✅ active |
| Yu-Gi-Oh!               | [YGOPRODeck](https://ygoprodeck.com/api-guide/) | ✅ active |
| Pokémon                 | [pokemontcg.io](https://pokemontcg.io/) | 🚧 prepared |

## Features

- **Collection** — overview of your own collection with a donut chart by color/attribute, a category grid, and a grid/list view toggle
- **Card search** — autocomplete search, including browsing a whole set by just its set code (e.g. "EMN" for MTG, "AMDE" for Yu-Gi-Oh!); add several cards to the collection in one batch instead of the dialog closing after each one
- **Camera scan** — capture cards via camera; the set code/collector number line is recognized server-side via Gemini Vision (Edge Function, see below)
- **Decks** — MTG: load precon decks (MTGJSON) and community decklists (EDHREC); Yu-Gi-Oh!: load structure/starter decks and community/tournament decklists (YGOPRODeck) — both matched against your own collection, with missing cards going straight to the wishlist
- **Wishlist** — track missing cards with priority, notes, and each game's current market price
- **Help / glossary** (`/help`) — a searchable MTG and Yu-Gi-Oh! terms glossary, with a "simplified mode" toggle for quick, informal explanations
- **Multi-language** — German/English via ngx-translate
- **PWA** — installable, offline-capable

## Tech stack

- **[Angular](https://angular.dev/)** (standalone components, signals, PWA)
- **[Supabase](https://supabase.com/)** — Postgres database, auth, edge functions
- **[Scryfall API](https://scryfall.com/docs/api)** — MTG card data, images, prices
- **[YGOPRODeck API](https://ygoprodeck.com/api-guide/)** — Yu-Gi-Oh! card data, images, prices
- **[MTGJSON](https://mtgjson.com/)** — MTG preconstructed decks
- **[EDHREC](https://edhrec.com/)** — MTG community decklists (unofficial, via `json.edhrec.com`)
- **[Gemini API](https://ai.google.dev/)** — card recognition for the camera scan (server-side via a Supabase Edge Function)
- **[Vitest](https://vitest.dev/)** — unit tests

## Architecture

Each game is wired in through a shared `CardApiService` interface (`searchCards`, `getCard`, `getPrints`); `GameService` hands out the matching implementation (`MtgApiService`, `YugiohApiService`, eventually `PokemonApiService`) for whichever game is active. Card data itself is never stored in Supabase — only `card_id` + `game_id`; everything else (including prices) is fetched on demand from the respective API. See [`CLAUDE.md`](./CLAUDE.md) for details.

## Setup

### Prerequisites

- Node.js (see `package.json` → `packageManager`)
- A [Supabase](https://supabase.com/) project
- A [Gemini API key](https://ai.google.dev/) (for the camera scan)

### Install

```bash
npm install
```

### Configure Supabase

1. Create the environment file:

   ```bash
   cp src/environments/environment.example.ts src/environments/environment.ts
   ```

   and fill in `supabaseUrl` / `supabaseAnonKey` with the values from your Supabase project.

2. Run [`supabase/schema.sql`](./supabase/schema.sql) once in the Supabase SQL editor — a single consolidated script that sets up every table, function, policy, and cron job this app needs on a fresh project. (The individual numbered files in [`supabase/sql`](./supabase/sql) are the historical migration log, each explaining why a particular change was made — useful for context, but you don't need to run them one by one.)

3. Deploy the Edge Function for the camera scan:

   ```bash
   supabase functions deploy gemini-ocr
   supabase secrets set GEMINI_API_KEY=<your-gemini-key>
   ```

### Development

```bash
npm start
```

Opens the app at `http://localhost:4200/` with automatic reload on file changes.

### Build

```bash
npm run build
```

Produces the production build in `dist/`.

### Tests

```bash
npm test
```

Runs the unit tests with [Vitest](https://vitest.dev/).

## Project structure

```
src/app/
├── core/          # Services, guards, models, i18n
├── features/       # Collection, card search/scanner, decks, wishlist, auth, help
└── shared/          # Reusable components (card tiles, charts, layout)
supabase/
├── functions/       # Edge functions (e.g. gemini-ocr, ygoprodeck-decks-proxy)
├── schema.sql       # Consolidated fresh-install schema (run this on a new project)
└── sql/             # Historical migration log, one file per change, with reasoning
```
