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
- **YGOPRODeck Deck-Browser** (Yu-Gi-Oh Community-/Turnier-Decklisten via ygoprodeck.com/api/decks/getDecks.php — inoffiziell, gleiches Muster wie EDHREC)
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
3. **Decks** — Precons laden, eigene Decks bauen, Community-Deck-Empfehlungen (MTG vollständig; Yu-Gi-Oh! ebenfalls — siehe Decks (Yu-Gi-Oh!) unten; Pokémon noch offen)

## Feature-Details

### Collection-Übersicht

- Donut-Chart: Segmente je nach aktivem Spiel
- 2-Spalten Kategorie-Grid, teuerste Karte als Hero-Artwork
- Klick auf Kategorie → gefilterte Kartenansicht
- Grid / Listen Toggle
- **Kartendetails (`CardDetailDialog`):** Menge/Foil/Sprache einer schon besessenen Karte editierbar in place (kein separater Edit-Modus). Die Menge speichert sich seit 2026-10-29 automatisch: Stepper-Klicks und Tippen im Mengenfeld lösen nach 700ms Ruhe ein `saveEdit()` aus (`QUANTITY_AUTOSAVE_DEBOUNCE_MS`) — dafür zeigt die Menge **kein** Save/Discard mehr, sondern nur einen kurz einblendenden grünen Haken (`quantityJustSaved`, verschwindet nach 2s oder sofort beim nächsten Ändern der Menge). Foil/Sprache bleiben beim expliziten Save/Discard-Paar (`dirty` prüft inzwischen nur noch die beiden, nicht mehr die Menge). Schließen des Dialogs vor Ablauf der Debounce-Zeit verwirft den anstehenden Autosave (`ngOnDestroy`), statt im Hintergrund doch noch zu speichern — gleiche Lehre wie beim Add-Card-Dialog-Bug (Schließen darf nie selbst einen Save/Submit auslösen).

**MTG Kategorien:** Weiß, Blau, Schwarz, Rot, Grün, Multikolor, Farblos
**Yu-Gi-Oh Kategorien:** FIRE, WATER, EARTH, WIND, LIGHT, DARK

### Kartensuche

- Autocomplete ab 2-3 Zeichen (je nach API)
- Karte hinzufügen: Menge, Foil (nur MTG), Zustand
- **Mehrfach-Hinzufügen (2026-10-29):** `AddCardDialog` schließt sich nicht mehr nach jeder einzelnen Karte. „Zur Liste hinzufügen“ merkt die konfigurierte Karte nur lokal vor (`pendingItems`-Signal, in der Liste per „×“ wieder entfernbar, komplett leerbar über „Liste leeren“); erst der explizite Button „Alle hinzufügen“ schickt den ganzen Stapel als ein `CollectionService.addCards()`-Batch an Supabase (mit Schutz gegen doppeltes Abschicken durch einen zu schnellen Doppelklick). Schließen des Dialogs (Header-✕, Escape, Backdrop) committet bewusst **nicht** mehr automatisch — das tat es ursprünglich, hat aber zusammen mit einem seitdem gefixten sessionStorage-Timing-Bug live zu verdoppelten Mengen in der Sammlung geführt (derselbe Stapel wurde beim nächsten Öffnen nochmal abgeschickt). `pendingItems` wird zusätzlich pro Spiel in `sessionStorage` gespiegelt (`addCard.pendingItems.<slug>`, synchron bei jeder Änderung, nicht per `effect()`): verwirft der Browser den (minimierten/im Hintergrund inaktiven) Tab unter Speicherdruck und lädt ihn beim Zurückwechseln neu — live beobachtet, siehe der Kommentar dazu in `scanner.ts` zum selben Verhalten beim Kamera-Scan — ist die App-JS-Instanz komplett neu, aber die Liste erscheint beim nächsten Öffnen des Dialogs wieder, ohne committet zu sein.
- **Bloßes Set-Kürzel ohne Kartennummer (2026-10-29):** MTG erlaubte das schon länger (z. B. „EMN“ zeigt das komplette Set über `MtgApiService.getCardsBySetCode`). Yu-Gi-Oh! jetzt ebenso: ein Kürzel ohne Bindestrich/Nummer (z. B. „AMDE“) listet über `YugiohApiService.getCardsBySetCodePrefix` jeden Druck mit diesem `ygoprodeck_print_codes`-Präfix, nicht nur den exakten Druck-Code (`AMDE-DE033`), den `YUGIOH_PRINT_CODE_PATTERN` schon vorher direkt auflöste.
- **Lücken in `ygoprodeck_print_codes` gefixt (2026-10-29):** Live gemeldet am Set `HAC1` (Hidden Arsenal: Chapter 1) — Druck-Codes von stark nachgedruckten Karten wie Dark Magician (`HAC1-EN002`) oder Barrel Dragon (`HAC1-EN006`) fehlten komplett. Ursache: YGOPRODecks eigene `cardinfo.php?misc=yes`/`?name=`-Antworten liefern für solche Karten ein unvollständiges `card_sets`-Array (live verglichen, auch direkt bei YGOPRODeck, nicht nur in unserem Mirror) — nur `cardinfo.php?cardset=<Setname>` hat live die vollständige Liste. `scripts/sync-ygoprodeck-cards.mjs` baut `ygoprodeck_print_codes` seitdem nicht mehr aus dem `misc=yes`-Dump, sondern iteriert alle ~1035 Sets über `cardsets.php` + `cardinfo.php?cardset=` einzeln (mit Pacing/Retry, ca. 7-10 Minuten Laufzeit) — `ygoprodeck_cards` (die denormalisierte Karten-Haupttabelle) kommt weiterhin aus dem einen `misc=yes`-Request, da deren Felder (Name, Bild, ATK/DEF, "repräsentatives" Set) davon nicht betroffen sind.
- Phase 2: Kamera-Scan via Tesseract.js OCR

### Decks (MTG)

- Precon-Decks via MTGJSON
- Community Decks via EDHREC Average Decklists
- Deck-Match: % der Karten bereits in Collection
- Fehlende Karten → Wunschliste
- KI-Deckvorschlag via Anthropic API

### Decks (Yu-Gi-Oh!)

Gleiche Erfahrung wie bei MTG, zwei Quellen:

- **Precons**: Structure/Starter-Decks via YGOPRODecks `cardinfo.php?cardset=...` (`YugiohPreconService`/`YugiohPreconIndexService`, ~85 Decks, voll im Hintergrund indiziert) — speist zusammen mit MTGs Precon-Index dieselbe "Fast komplett"-Empfehlungsleiste auf der Decks-Hauptseite (`decks.ts`/`decks.html`, ≥75% Collection-Match).
- **Community-/Turnier-Decks** (2026-10-28 ergänzt, Pendant zu MTGs Moxfield/MTGO-Dialog): eigener Dialog `YgoDeckRecommendationsDialog` (`src/app/features/decks/ygo-deck-recommendations/`), Button "Community-Decks" auf der Decks-Seite. Quelle ist YGOPRODecks eigene, undokumentierte Deck-Browser-JSON-API `ygoprodeck.com/api/decks/getDecks.php?_sft_category=...` (live per Browser-Netzwerk-Mitschnitt verifiziert, 2026-10-28) — liefert pro Deck bereits die vollständige, nach Main/Extra/Side gezonte Kartenliste in einem Call, kein Scraping einzelner Deck-Seiten nötig. Abgerufen über die Edge Function `supabase/functions/ygoprodeck-decks-proxy` (Kategorie-Allowlist, parst `main_deck`/`extra_deck`/`side_deck` serverseitig zu `{cardId, quantity}[]`) und den Client-Service `src/app/core/services/ygoprodeck-decks.service.ts` (`YGO_DECK_CATEGORIES`, Caching/Pacing nach Moxfield-Vorbild). **18 Kategorien** (2026-10-28 von 6 auf 16 erweitert, nachdem sich beim Live-Abgleich des vollständigen `filter-format`-Selects herausstellte, dass YGOPRODeck deutlich mehr abdeckt als ursprünglich indiziert, dann auf 18, da Anime/Fun-Casual auf expliziten Wunsch doch wieder aufgenommen wurden): Tournament Meta (TCG/OCG/Worlds/Genesys), Meta Decks, Non-Meta/Rogue, Theorycrafting, Master Duel Decks, Genesys Decks (Community), Speed Duel Decks, die Retro-Formate GOAT/Edison/Domain/Trinity/Worlds Format, World Championship Decks (Konamis Videospielreihe), sowie Anime Decks und Fun/Casual Decks. Bewusst weiterhin ausgeschlossen: `Tournament Meta Decks (Genesys OCG)` (live 0 Treffer), die regionalen OCG-Varianten (China/Asian-English) und `common charity decks`.
- **Matching**: YGO-Karten sind bereits exakt per `card_id` identifiziert (keine Namens-Fuzzy-Suche, kein Oracle-/Print-Substitutions-Konzept wie bei MTG nötig) — dafür die neue generische Funktion `splitExactDeckByAvailability` in `deck-stats.ts` (bewusst spielneutral benannt, nicht YGO-spezifisch, da sie später auch für Pokémon-Precons wiederverwendbar ist), aufbauend auf den schon bestehenden generischen Primitiven `buildOwnedMap`/`getAvailabilityMatch`/`buildAssignedElsewhereMaps`.
- Status (2026-10-28): Edge Function ist live deployed und per curl verifiziert (liefert echte Decks mit korrekt gezählten Karten), `tsc`/`ng build` laufen fehlerfrei. Noch **kein Live-Test im Browser** (App starten, YGO wählen, Button öffnen, Kategorie wählen, Deck hinzufügen prüfen). Plan-Dokument: `~/.claude/plans/virtual-spinning-flame.md`.

### Wunschliste

- Fehlende Karten merken (Priorität, Notizen)
- Aktueller Preis je nach API
- Gesamtwert der Wunschliste

### Hilfe / Lexikon (`/help`)

MTG-Begriffs-Lexikon, falls man als Spieler mal "auf dem Schlauch steht". Verlinkt im Avatar-Dropdown-Menü, für Gäste wie eingeloggte Nutzer sichtbar.

- **Kategorien:** Grundbegriffe, Kartentypen & Keywords, Formate & Regeln, Typische Situationen
- **Darstellung:** Suche + Kategorie-Filter-Chips, Begriffe als Karten mit Querverweisen ("Siehe auch") zu verwandten Begriffen
- **Trottel-Modus:** globaler Segmented-Toggle (Normal / Trottel-Modus) über allen Einträgen. Jeder Begriff hat zwei Erklärungen: `definitionNormal` (korrekt, kurz) und `definitionTrottel` (maximal vereinfacht, humorvoll, mit Vergleichen — z. B. "Trample = dein Monster ist so fett, dass der Rest über die Blocker drüber latscht"). Zustand wird in `localStorage` gemerkt, Aktivieren zeigt einen Toast-Spruch.
- **Daten (MTG):** `src/app/features/help/help-terms.ts` kombiniert vier Kategorie-Dateien unter `src/app/features/help/data/` (`basics.ts`, `keywords.ts`, `formats.ts`, `situations.ts` — bei Letzterer mit den originalen Typ-Definitionen in `types.ts`). Jeder Eintrag ist ein `HelpTerm` (`id`, `game`, `category`, `term`, `definitionNormal`, `definitionTrottel`, optionale `relatedTerms[]`, optionale `steps[]`, optionale `exampleCards[]`) — Datendateien selbst deklarieren `HelpTermInput` (= `HelpTerm` ohne `game`), das Feld wird einmalig in `help-terms.ts` per `withGame()` ergänzt. Jedes Textfeld ist ein `LocalizedText` (`{ de, en }`) statt über ngx-translate zu laufen — Begriffe brauchen Querverweise per ID, das passt nicht gut in den flachen Übersetzungs-Namespace. Die Komponente wählt die Sprache über `translate.currentLang()`. 235 MTG-Einträge insgesamt (16 Grundbegriffe, 195 Keywords, 11 Formate, 13 Situationen): `keywords.ts` deckt praktisch jedes je gedruckte Schlüsselwort ab (evergreen, wiederkehrend/"deciduous", Ability Words ohne eigenen Regeltext, Experten-/historische Mechaniken, eingestellte Mechaniken) — ein paar neuere/seltene Einträge tragen einen `// NOTE`-Kommentar, wo die genaue aktuelle Formulierung vor Veröffentlichung gegen Scryfall/die Comprehensive Rules geprüft werden sollte. Deutsche Begriffs-Klammerzusätze sind informelle Umschreibungen zum Verständnis, keine geprüften offiziellen Wizards-Lokalisierungen. `basics.ts` deckt zusätzlich alle Kartentypen, Mana-Grundlagen und Zonen ab; `formats.ts` einen Format-Überblick (Standard/Modern/Legacy/Vintage/Pioneer/Pauper/Draft/Sealed), bewusst um das stabile Konzept statt um ein konkretes (schnell veraltendes) Rotations-/Restricted-Datum herum formuliert.
- **Daten (Yu-Gi-Oh!):** gleiches Muster unter `src/app/features/help/data-ygo/`, IDs mit `ygo-`-Präfix (bleiben so garantiert eindeutig gegen die MTG-IDs in der kombinierten `HELP_TERMS`-Liste). 143 Einträge (29 Grundbegriffe, 62 Keywords, 11 Formate, 12 Situationen) — volle Abdeckung wie bei MTG, aber an YGOs tatsächlichem "Keyword"-Umfang gemessen: jeder Monster-Kartentyp nach Extra-Deck-Zugehörigkeit, jede Beschwörungsart (Normal bis Link), Monster-/Zauber-/Fallen-Subtypen inkl. eingestellter (Gemini, Spirit, Union, Dual, Trap Monster), Chain-/Effekt-Vokabular, Extra-Deck-Material-Mechaniken, Bannlisten-/Format-Überblick. Mehrere Situationen-Einträge sind bewusst als Vertiefung zu einem Keyword-Kurzeintrag angelegt (z. B. `ygo-chain` → `ygo-chain-resolution-order`), wie im MTG-Lexikon schon üblich.
- **Daten (Pokémon):** gleiches Muster unter `src/app/features/help/data-pokemon/`, IDs mit `pokemon-`-Präfix. 113 Einträge (38 Grundbegriffe, 21 Keywords, 8 Formate, 12 Situationen) — volle Abdeckung aller je benannten "Special Rule"-Pokémon-Kategorien über alle Epochen (ex/EX, GX, Tag Team GX, V, VMAX, VSTAR, Prime, LEGEND, BREAK, Radiant, Restored, Shining/Crystal, LV.X), aller 5 Sonderzustände, der Poké-Power/Poké-Body → Ability-Namensgeschichte, sowie Mega-Entwicklung und Prisma-Stern als eingestellte Mechaniken. Die Keyword-Liste ist bewusst kürzer als bei MTG/YGO — Pokémons Regelwerk kennt weder Stack/Priorität noch ein Chain-System und hat entsprechend weniger benannte Mechaniken; das ist volle Abdeckung dessen, was das Spiel tatsächlich benennt, keine verkürzte Auswahl. **Keine `exampleCards`** auf Pokémon-Einträgen: anders als `MtgApiService`/`YugiohApiService` hat `PokemonApiService.getCardsByNames()` keinen DB-Mirror und feuert pro Namen einen Live-Request gegen TCGdex — exakt die Rate-Limit-Klasse von Bug, die für Scryfall schon mal gefunden und gefixt wurde (siehe Beispielkarten-Absatz unten). Nachrüstbar, sobald das geprüft oder durch einen Mirror abgesichert ist.
- **Ablauf-Diagramme:** "Typische Situationen" (aktuell 13 Einträge) haben zusätzlich ein `steps[]`-Array, das als kleine Timeline (nummerierte Pill-Marker, verbunden durch eine dünne Linie) unter der Definition erscheint — unabhängig vom Trottel-Modus, da der Ablauf selbst sich nicht vereinfacht, nur die Erklärung darüber. Ein Schritt kann optional `branches?: LocalizedText[]` tragen (nur bei einer echten Entscheidungsgabel genutzt, z. B. "Darf"- vs. Pflicht-Trigger) — gerendert als kleines Zwei-Kästchen-Flowchart (`.step-flowchart`/`.step-flowchart-box` in help.scss): Stamm-Linie vom Schritt-Text runter zu einer Gabel-Leiste, die sich in je einen kurzen Drop pro Box aufteilt. Bewusst ohne Pfeilspitzen, im gleichen zurückhaltenden Linien-Stil wie der `.step-diagram`-Connector (DESIGN.md "Frame Adorns, Content Doesn't").
- **Beispielkarten:** `exampleCards?: string[]` (exakte Kartennamen, matched gegen `Card.oracleName`) werden im `Help`-Konstruktor per `effect()` aufgelöst, das auf `GameService.currentSlug()` reagiert und `GameService.cardApi().getCardsByNames()` aufruft (Name → `imageUrl`) — für MTG also weiterhin gegen die eigene `scryfall_cards`-Mirror-Tabelle statt live gegen Scryfalls `cards/named`-Endpoint, da ein Seitenaufruf mit so vielen Beispielkarten-Thumbnails sonst zuverlässig Scryfalls Rate-Limit triggert (bereits nach ~37 nahezu gleichzeitigen Requests 429, mit 15+ Sekunden Cooldown statt der angenommenen Sekundenbruchteile), was einzelne Bilder dauerhaft nicht lädt. Für Yu-Gi-Oh! läuft die gleiche Methode gegen `YugiohApiService` (eigene DB-Query mit Live-API-Fallback). Die Mirror-Abfrage umgeht das MTG-Rate-Limit-Problem vollständig, braucht also auch keine Retry-Logik.
- **Mehrspieler-Unterstützung:** `HelpTerm` trägt ein `game`-Feld (`GameSlug`), gefüllt per `withGame()`-Helper in `help-terms.ts` statt auf jedem einzelnen Eintrag. Die Help-Komponente filtert Suche/Kategorien/Beispielkarten nach `GameService.currentSlug()`. Alle drei Spiele sind abgedeckt: MTG unter `data/` (235 Einträge), Yu-Gi-Oh! unter `data-ygo/` (143, `ygo-`-Präfix), Pokémon unter `data-pokemon/` (113, `pokemon-`-Präfix) — letzteres funktioniert im Lexikon unabhängig davon, dass die Pokémon-Kartensuche selbst laut Tabelle oben noch "vorbereitet" ist.

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

### YGOPRODeck Deck-Browser (Yu-Gi-Oh Community Decks)

- Liste: GET https://ygoprodeck.com/api/decks/getDecks.php?_sft_category=[Kategorie]&sort=[Sortierung]&limit=[N]&offset=[M]
- Kategorien (exakt wie im `filter-format`-Select auf ygoprodeck.com/deck-search/, Werte live per curl gegen `getDecks.php` einzeln auf Nicht-Leere geprüft): `Tournament Meta Decks`, `Tournament Meta Decks OCG`, `Tournament Meta Decks Worlds`, `Tournament Meta Decks (Genesys)`, `meta decks`, `non-meta decks`, `theorycrafting decks`, `master duel decks`, `genesys decks`, `speed duel decks`, `goat format decks`, `edison format decks`, `domain format decks`, `trinity format decks`, `worlds format decks`, `world championship decks`, `anime decks`, `fun/casual decks`. Bewusst nicht aufgenommen: `Tournament Meta Decks (Genesys OCG)` (0 Decks live), `Tournament Meta Decks OCG (Asian-English)`/`(China)`, `common charity decks`.
- Felder je Deck: `deck_name`, `format`, `deck_views`, `deck_price`, `pretty_url`, `tournamentName`/`tournamentPlacement`, `main_deck`/`extra_deck`/`side_deck` (jeweils ein **JSON-String** mit einer Karten-ID pro physischer Kopie, Duplikate wiederholt - serverseitig in der Edge Function zu `{cardId, quantity}[]` verdichtet)
- Kein CORS-Header → Edge-Function-Proxy nötig (`ygoprodeck-decks-proxy`), aber kein spezieller User-Agent/Grant nötig (anders als Moxfield) - ein normaler Server-Fetch ohne Browser-Fingerprint liefert 200, live bestätigt (2026-10-28)

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
