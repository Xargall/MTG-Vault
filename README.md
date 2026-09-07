# TCG Vault

Ein selbst gehosteter, werbefreier Trading-Card-Game-Collector als Angular PWA — volle Kontrolle über Features, Filterung und Kartenlimit, ohne Paywall.

Verwaltet Kartensammlungen, Decks und Wunschlisten für mehrere TCGs in einer App.

🔗 **Live:** [tcg-vault.mathias-mayer.de](https://tcg-vault.mathias-mayer.de/)

## Unterstützte Spiele

| Spiel                | API           | Status      |
| --------------------- | ------------- | ----------- |
| Magic: The Gathering  | [Scryfall](https://scryfall.com/docs/api) | ✅ aktiv |
| Yu-Gi-Oh!              | [YGOPRODeck](https://ygoprodeck.com/api-guide/) | ✅ aktiv |
| Pokémon                | [pokemontcg.io](https://pokemontcg.io/) | 🚧 vorbereitet |

## Features

- **Collection** — Übersicht der eigenen Sammlung mit Donut-Chart nach Farbe/Attribut, Kategorie-Grid und Grid-/Listenansicht
- **Kartensuche** — Autocomplete-Suche, Karten mit Menge/Foil/Zustand zur Sammlung hinzufügen
- **Kamera-Scan** — Karten per Kamera erfassen; die Set-Code-/Sammlenummer-Zeile wird serverseitig per Gemini Vision erkannt (Edge Function, siehe unten)
- **Decks (MTG)** — Vorgefertigte Precon-Decks (MTGJSON) und Community-Decklisten (EDHREC) laden, Abgleich mit der eigenen Sammlung, fehlende Karten direkt auf die Wunschliste
- **Wunschliste** — Fehlende Karten mit Priorität, Notizen und aktuellem Marktpreis je Spiel
- **Mehrsprachig** — Deutsch/Englisch via ngx-translate
- **PWA** — installierbar, offline-fähig

## Tech-Stack

- **[Angular](https://angular.dev/)** (Standalone Components, Signals, PWA)
- **[Supabase](https://supabase.com/)** — Postgres-Datenbank, Auth, Edge Functions
- **[Scryfall API](https://scryfall.com/docs/api)** — MTG-Kartendaten, Bilder, Preise
- **[YGOPRODeck API](https://ygoprodeck.com/api-guide/)** — Yu-Gi-Oh-Kartendaten, Bilder, Preise
- **[MTGJSON](https://mtgjson.com/)** — MTG Preconstructed Decks
- **[EDHREC](https://edhrec.com/)** — MTG Community-Decklisten (inoffiziell, via `json.edhrec.com`)
- **[Gemini API](https://ai.google.dev/)** — Kartenerkennung beim Kamera-Scan (server-seitig via Supabase Edge Function)
- **[Vitest](https://vitest.dev/)** — Unit Tests

## Architektur

Jedes Spiel wird über ein gemeinsames `CardApiService`-Interface angebunden (`searchCards`, `getCard`, `getPrints`), das `GameService` liefert je nach aktivem Spiel die passende Implementierung (`MtgApiService`, `YugiohApiService`, künftig `PokemonApiService`). Kartendaten selbst werden nicht in Supabase gespeichert — nur `card_id` + `game_id`, alles Weitere (inkl. Preise) kommt on-demand von der jeweiligen API. Details siehe [`CLAUDE.md`](./CLAUDE.md).

## Setup

### Voraussetzungen

- Node.js (siehe `package.json` → `packageManager`)
- Ein [Supabase](https://supabase.com/)-Projekt
- Ein [Gemini API Key](https://ai.google.dev/) (für den Kamera-Scan)

### Installation

```bash
npm install
```

### Supabase konfigurieren

1. Umgebungsdatei anlegen:

   ```bash
   cp src/environments/environment.example.ts src/environments/environment.ts
   ```

   und `supabaseUrl` / `supabaseAnonKey` mit den Werten aus deinem Supabase-Projekt füllen.

2. SQL-Skripte aus [`supabase/sql`](./supabase/sql) der Reihe nach im Supabase SQL-Editor ausführen (Tabellen für Collection, Decks, Wishlist, Invite-Gating etc.).

3. Edge Function für den Kamera-Scan deployen:

   ```bash
   supabase functions deploy gemini-ocr
   supabase secrets set GEMINI_API_KEY=<dein-gemini-key>
   ```

### Entwicklung

```bash
npm start
```

Öffnet die App unter `http://localhost:4200/` mit automatischem Reload bei Dateiänderungen.

### Build

```bash
npm run build
```

Erzeugt die Produktions-Artefakte in `dist/`.

### Tests

```bash
npm test
```

Führt die Unit-Tests mit [Vitest](https://vitest.dev/) aus.

## Projektstruktur

```
src/app/
├── core/          # Services, Guards, Models, i18n
├── features/       # Collection, Kartensuche/Scanner, Decks, Wishlist, Auth
└── shared/          # Wiederverwendbare Komponenten (Card-Tiles, Charts, Layout)
supabase/
├── functions/       # Edge Functions (z. B. gemini-ocr)
└── sql/             # Schema-Migrationen, manuell im SQL-Editor auszuführen
```
