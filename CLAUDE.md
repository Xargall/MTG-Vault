# MTG Vault → TCG Collector — CLAUDE.md

## Projektbeschreibung

Universeller TCG Collector als Angular PWA.
Verwaltet Kartensammlungen aus mehreren Trading Card Games.
Motivation: volle Kontrolle über Features, Filterung und Kartenlimit (kein Paywall).

## Unterstützte Spiele

| Spiel                | Slug     | API           | Status                                                                               |
| -------------------- | -------- | ------------- | ------------------------------------------------------------------------------------ |
| Magic: The Gathering | mtg      | Scryfall      | aktiv                                                                                |
| Yu-Gi-Oh!            | yugioh   | YGOPRODeck    | aktiv                                                                                |
| Pokémon              | pokemon  | pokemontcg.io | vorbereitet                                                                          |
| One Piece Card Game  | onepiece | optcgapi.com  | pausiert — Plan fertig, nicht gestartet (`~/.claude/plans/quirky-twirling-toast.md`) |

## Tech-Stack

- **Angular PWA** (Add to Homescreen, Offline-fähig)
- **Supabase** (Datenbank, Auth, Realtime-Sync)
- **Scryfall API** (MTG Kartendaten, Bilder, Preise — kostenlos)
- **YGOPRODeck API** (Yu-Gi-Oh Kartendaten, Bilder, Preise — kostenlos)
- **MTGJSON** (MTG Preconstructed Decks — kostenlos)
- **EDHREC** (MTG Community Decklisten via json.edhrec.com — inoffiziell)
- **Anthropic API / Claude** (KI-Deckvorschläge)

## Supabase Schema

```sql
games
  id, name, slug ('mtg' | 'yugioh' | 'pokemon')

collection_cards
  user_id, game_id, card_id, quantity, foil, condition

decks
  user_id, game_id, name, format, is_precon

deck_cards
  deck_id, card_id, quantity

wishlist
  user_id, game_id, card_id, priority, notes
```

## Architektur

### GameService

- Verwaltet das aktuell aktive Spiel als Signal
- Liefert den passenden CardApiService je nach aktivem Spiel
- Alle Supabase-Queries filtern nach game_id

### CardApiService Interface

Gemeinsame Methoden die jede API-Implementierung bereitstellt:

- searchCards(query: string)
- getCard(id: string)
- getPrints(name: string)

### Implementierungen

- MtgApiService → Scryfall
- YugiohApiService → YGOPRODeck
- PokemonApiService → pokemontcg.io (vorbereitet, noch nicht aktiv)

## App-Bereiche (Navigation)

1. **Collection** — Übersicht der eigenen Karten
2. **Kartensuche** — Karten finden und zur Collection hinzufügen
3. **Decks** — Precons laden, eigene Decks bauen (aktuell nur MTG)

## Feature-Details

### Collection-Übersicht

- Donut-Chart: Segmente je nach aktivem Spiel
- 2-Spalten Kategorie-Grid, teuerste Karte als Hero-Artwork
- Klick auf Kategorie → gefilterte Kartenansicht
- Grid / Listen Toggle

**MTG Kategorien:** Weiß, Blau, Schwarz, Rot, Grün, Multikolor, Farblos
**Yu-Gi-Oh Kategorien:** FIRE, WATER, EARTH, WIND, LIGHT, DARK

### Kartensuche

- Autocomplete ab 2-3 Zeichen (je nach API)
- Karte hinzufügen: Menge, Foil (nur MTG), Zustand
- Phase 2: Kamera-Scan via Tesseract.js OCR

### Decks (MTG)

- Precon-Decks via MTGJSON
- Community Decks via EDHREC Average Decklists
- Deck-Match: % der Karten bereits in Collection
- Fehlende Karten → Wunschliste
- KI-Deckvorschlag via Anthropic API

### Wunschliste

- Fehlende Karten merken (Priorität, Notizen)
- Aktueller Preis je nach API
- Gesamtwert der Wunschliste

### Hilfe / Lexikon (`/help`)

MTG-Begriffs-Lexikon, falls man als Spieler mal "auf dem Schlauch steht". Verlinkt im Avatar-Dropdown-Menü, für Gäste wie eingeloggte Nutzer sichtbar.

- **Kategorien:** Grundbegriffe, Kartentypen & Keywords, Formate & Regeln, Typische Situationen
- **Darstellung:** Suche + Kategorie-Filter-Chips, Begriffe als Karten mit Querverweisen ("Siehe auch") zu verwandten Begriffen
- **Trottel-Modus:** globaler Segmented-Toggle (Normal / Trottel-Modus) über allen Einträgen. Jeder Begriff hat zwei Erklärungen: `definitionNormal` (korrekt, kurz) und `definitionTrottel` (maximal vereinfacht, humorvoll, mit Vergleichen — z. B. "Trample = dein Monster ist so fett, dass der Rest über die Blocker drüber latscht"). Zustand wird in `localStorage` gemerkt, Aktivieren zeigt einen Toast-Spruch.
- **Daten:** `src/app/features/help/help-terms.ts`, Einträge als TS-Array (`term`, `category`, `definitionNormal`, `definitionTrottel`, optionale `relatedTerms[]`, optionale `steps[]`). Jedes Textfeld ist ein `LocalizedText` (`{ de, en }`) statt über ngx-translate zu laufen — Begriffe brauchen Querverweise per ID, das passt nicht gut in den flachen Übersetzungs-Namespace. Die Komponente wählt die Sprache über `translate.currentLang()`.
- **Ablauf-Diagramme:** "Typische Situationen" (aktuell 13 Einträge) haben zusätzlich ein `steps[]`-Array, das als kleine Timeline (nummerierte Pill-Marker, verbunden durch eine dünne Linie) unter der Definition erscheint — unabhängig vom Trottel-Modus, da der Ablauf selbst sich nicht vereinfacht, nur die Erklärung darüber. Ein Schritt kann optional `branches?: LocalizedText[]` tragen (nur bei einer echten Entscheidungsgabel genutzt, z. B. "Darf"- vs. Pflicht-Trigger) — als kurze eingerückte Fork-Liste gerendert, kein eigenes Flowchart-System.
- **Beispielkarten:** `exampleCards?: string[]` (exakte englische Kartennamen) rendert kleine Referenz-Thumbnails via Scryfalls `cards/named?...&format=image`-Redirect — live von der API geholt, nicht lokal gespeichert (gleiche "on-demand"-Konvention wie der Rest der App). Bei einem Seitenaufruf mit vielen Beispielkarten kann Scryfall vereinzelt kurz drosseln (429); `onExampleCardError` in `help.ts` löst das mit einem einmaligen, verzögerten Retry.
- **Scope:** aktuell nur MTG. Später erweiterbar auf Yu-Gi-Oh/Pokémon/One Piece über ein zusätzliches `game`-Feld am `HelpTerm`.

## API-Referenz

### Scryfall (MTG)

- Suche: GET /cards/search?q=!"Name"&unique=prints
- Autocomplete: GET /cards/autocomplete?q=
- Felder: colors, type_line, mana_cost, cmc, rarity, prices.eur, image_uris.normal

### YGOPRODeck (Yu-Gi-Oh)

- Suche exakt: GET /api/v7/cardinfo.php?name=Dark+Magician
- Suche fuzzy: GET /api/v7/cardinfo.php?fname=Dark+Mag
- Alle Karten: GET /api/v7/cardinfo.php?misc=yes
- Felder: type, attribute, level, atk, def, card_images, card_prices, banlist_info

### EDHREC (MTG Community Decks)

- Average Deck: GET https://json.edhrec.com/pages/commanders/[slug].json
- Slug-Format: lowercase, Sonderzeichen entfernt, Leerzeichen → Bindestriche
- npm: edhrec-recs

## Kartentypen je Spiel

### MTG

- Kategorisierung nach colors: W, U, B, R, G
- Relevante Felder: type_line, mana_cost, cmc, rarity
- Foil als eigene Variante

### Yu-Gi-Oh

- Kategorisierung nach attribute: FIRE, WATER, EARTH, WIND, LIGHT, DARK
- Kartentypen: Monster, Spell, Trap
- Kampfwerte: ATK / DEF
- Kein Foil
- Banlist-Status: Forbidden / Limited / Semi-Limited

## Konventionen

- Signals bevorzugen gegenüber RxJS
- Kartendaten NICHT in Supabase speichern — nur card_id + game_id,
  rest on-demand von der jeweiligen API holen
- Preise immer frisch von der API (nie gecacht)
- Alle Queries immer mit game_id filtern
