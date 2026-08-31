# MTG Vault — CLAUDE.md

## Projektbeschreibung

Eigene MTG-Kartensammlungs-App als Angular PWA.
Motivation: volle Kontrolle über Features, Filterung und Kartenlimit (kein Paywall).

## Tech-Stack

- **Angular PWA** (Add to Homescreen, Offline-fähig)
- **Supabase** (Datenbank, Auth, Realtime-Sync)
- **Scryfall API** (Kartendaten, Bilder, Preise — kostenlos)
- **MTGJSON** (Preconstructed Decks — kostenlos)
- **Anthropic API / Claude** (KI-Deckvorschläge)

## Supabase Schema

```sql
users
collection_cards  → user_id, scryfall_id, quantity, foil, condition
decks             → user_id, name, format, is_precon
deck_cards        → deck_id, scryfall_id, quantity
wishlist          → user_id, scryfall_id, priority, notes
```

## App-Bereiche (Navigation)

1. **Collection** — Übersicht der eigenen Karten
2. **Kartensuche** — Karten finden und zur Collection hinzufügen
3. **Decks** — Precons laden, eigene Decks bauen

## Feature-Details

### Collection

- Donut-Chart oben: 7 Farbsegmente (W/U/B/R/G/Multikolor/Farblos), Gesamtwert, Kartenanzahl
- 2-Spalten Kategorie-Grid: jede Farbe als Karte im MTG-Format (aspect-ratio 0.72)
- Teuerste Karte pro Farbe als Hero-Artwork (Scryfall image URL als background-image)
- Klick auf Kategorie → gefilterte Kartenansicht dieser Farbe
- Grid / Listen Toggle in der gefilterten Ansicht
- Filter: Manafarbe, Kartentyp (Kreatur, Spontanzauber etc.), Rarität

### Kartensuche

- Scryfall Autocomplete ab 2–3 Zeichen
- Karte hinzufügen: Menge, Foil (boolean), Zustand
- Phase 2 (später): Kamera-Scan via Tesseract.js OCR (Webcam zum Testen)

### Decks

- Precon-Decks laden via MTGJSON API
- Eigene Decks erstellen und in Supabase speichern
- Deck-Match: Prozentsatz des Decks der bereits in der Collection ist
- Fehlende Karten direkt auf Wunschliste setzen
- KI-Deckvorschlag via Anthropic API (Spielstil beschreiben → Deck aus eigener Collection)

### Wunschliste

- Fehlende Karten merken (Priorität, Notizen)
- Aktueller Scryfall-Preis pro Karte
- Gesamtwert der Wunschliste

## Scryfall API — relevante Felder

- `colors` → ["W","U","B","R","G"]
- `type_line` → "Creature — Goblin" / "Instant"
- `mana_cost` → "{2}{W}{W}"
- `cmc` → Converted Mana Cost (Zahl)
- `set` / `set_name` → Set-Info
- `rarity` → common / uncommon / rare / mythic
- `prices` → EUR/USD Preise direkt von Scryfall
- `image_uris.normal` → Kartenbild URL

## Konventionen

- Signals bevorzugen gegenüber RxJS wo möglich
- Kartendaten NICHT in Supabase speichern — nur scryfall_id, rest on-demand von Scryfall holen
- Preise kommen von Scryfall (prices.eur / prices.usd)
