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

# Handoff: MTG Vault — Visual Design System

## Overview

Dunkles, mittelalterlich-mystisches Visual Design System für MTG Vault, eine Angular PWA zur Verwaltung einer Magic: The Gathering Kartensammlung. Umfasst Logo/Siegel, Header (56px), Footer/Bottom-Nav und vier Screens (Sammlung, Kartendetail, Deck-Liste, Suche/Filter).

## About the Design Files

Die Datei `MTG Vault Design System.dc.html` in diesem Ordner ist eine **statische HTML/CSS-Designreferenz** — kein Produktionscode. Alle Styles sind inline (keine Klassen, kein Stylesheet), alle Icons sind handgebaute Inline-SVGs, Kartendaten sind hartcodierte Platzhalter. Aufgabe: dieses Design in der bestehenden Angular-PWA-Codebase ("MTG Vault") nachbauen — als Angular-Komponenten (Standalone Components + SCSS empfohlen), mit echten Daten/State statt der Platzhalter, und mit den Design-Tokens unten statt Inline-Werten (z.B. als SCSS-Variablen oder CSS Custom Properties).

## Fidelity

**High-fidelity.** Farben, Typografie, Abstände und Komponentenaufbau sind final — pixelgenau übernehmen, nicht neu interpretieren.

## Design Tokens

### Farben

| Rolle              | Hex     | Verwendung                          |
| ------------------ | ------- | ----------------------------------- |
| Dunkles Leder      | #17110B | Haupt-Hintergrund                   |
| Kastanie/Rotbraun  | #3C1712 | Sekundär-BG, Header/Footer-Basis    |
| Kastanie hell      | #55231B | Verläufe, Rahmen (1px Panel-Border) |
| Kastanie tief      | #2A0F0B | Footer-Verlauf, Panel-Dunkel        |
| Pergament          | #ECDCB8 | Fließtext auf dunklem Grund         |
| Pergament gedämpft | #C9B78F | Sekundärtext, Typzeilen             |
| Gold/Messing       | #C9A24A | Akzent, aktive Icons, Rahmen        |
| Gold hell          | #E8CD7A | Überschriften, Logo-Wordmark        |
| Gold tief          | #8A6A2C | Kicker-Labels, gedämpfte Akzente    |
| Panel-BG           | #241A12 | Karten/Panel-Flächen                |
| Bezel/Ink          | #0D0906 | Phone-Frame-Rahmen                  |
| Mana Weiß          | #EFE6CD | funktionaler Akzent                 |
| Mana Blau          | #3D6F96 | funktionaler Akzent                 |
| Mana Schwarz       | #2B2530 | funktionaler Akzent                 |
| Mana Rot           | #A34A34 | funktionaler Akzent                 |
| Mana Grün          | #3F6B46 | funktionaler Akzent                 |

Wichtig: Die Mana-Farben sind als **eigenständige Farb-Orbs** interpretiert, NICHT als offizielle Wizards-of-the-Coast-Mana-Symbole — bewusst so beibehalten (Copyright).

### Typografie

- Headings/Display: **Cinzel** (400/500/600/700), Google Fonts, letter-spacing 1-2px, meist uppercase.
- Fließtext: **EB Garamond** (400/600, italic 400), Google Fonts.
- Kleinste Textgröße im Mockup: 9.5px (Bottom-Nav-Labels) — für echte Umsetzung ggf. auf min. 11-12px prüfen (Accessibility).

### Radien & Rahmen

- Panels/Cards: border-radius 6px, 1px solid #55231B.
- Hero-Kartenbild & Deck-Banner: 2px solid #C9A24A, border-radius 8px (das "durchlaufende Banner" in der Deck-Liste trägt denselben Rahmen wie das Kartenbild im Detail-Screen).
- Ecken-Verzierungen: 16px große L-förmige Doppelrahmen-Akzente (border-top/left etc., 2px solid Gold) an Panel-Ecken — "ausgewogenes" Ornamentik-Level, nicht auf jedem Panel, gezielt bei Intro-Box, Kartentext-Panel.
- Avatare/Orbs: border-radius 50%.

### Struktur-Maße

- Header: 56px Höhe, Verlauf #55231B → #3C1712, 2px solid #C9A24A unten, kleine Flourish-SVGs in den oberen Ecken.
- Footer/Bottom-Nav: ~72-82px, Verlauf #3C1712 → #2A0F0B (bzw. #2A0F0B → #3C1712), 2px solid #C9A24A oben, dekorative Trennlinie mit 5 kleinen Mana-Orb-Punkten + zentralem Gold-Diamant vor den 4 Nav-Icons.
- Custom Scrollbar (für scrollbare Content-Bereiche): 6px breit, Thumb #8A6A2C (Hover #C9A24A), Track #17110B, border-radius 3px.

## Logo

Drei Siegel-Varianten entworfen (Tresor, Schriftrolle, Mana-Kristall) — **Variante C, Mana-Kristall, ist final ausgewählt.** Aufbau: kreisförmiges Siegel (Ø ~112px bei Vollversion) mit Gold-Rahmen, gestrichelter innerer Ring, 4 Kompass-Ticks, zentraler blauer Diamant (Kristall) mit hellerer innerer Facette und kleinen Strahlen oben. Icon-only-Kachel für App-Icon/Favicon: gleiches Motiv ohne äußeren Siegel-Ring, auf abgerundetem Quadrat (App-Icon) bzw. Kreis (Favicon). Als SVG umsetzen (skalierbar, für PWA-Manifest-Icons in mehreren Größen exportieren: 192px, 512px, plus maskable-Variante mit Safe-Zone).

## Screens

### Header (global, 56px)

Logo-Icon links (Mana-Kristall-Siegel, 34px), zentrierte Icon-Navigation (Sammlung/Decks/Suche/Trades, je 17-18px Outline-SVGs, Gold-Stroke), Profil-Avatar rechts (30px Kreis, Gold-Rahmen, Personen-Icon).

### Footer / Bottom-Nav (global)

4 Tabs: Sammlung, Decks, Suche, Profil. Aktiver Tab: Icon Gold-gefüllt + Label in Gold mit text-shadow-Glow (0 0 6px). Inaktive Tabs: Pergament-gedämpft (#C9B78F), Outline-Icons.

### Sammlung (Kartenraster)

Titelzeile "Deine Sammlung" + Filter-/Sortier-Icons. 2-spaltiges Grid aus Karten-Tiles: Kartenbild-Platzhalter (Aspect-Ratio 63/88, gestreiftes Platzhalter-Pattern, Label "KARTENBILD"), Rarity-Gem (8px Diamant, farbcodiert, oben rechts über dem Bild), Kartenname (Cinzel), Typzeile (EB Garamond italic) + Mana-Orb (9px) in einer Zeile.

### Kartendetail

Zurück-Chevron + Titel + Favoriten-Diamant im Header. Großes Kartenbild (2px Gold-Rahmen, border-radius 8px). Name (Cinzel 19px) + Typzeile, 2 Mana-Orbs rechts. Regeltext-Panel mit Ecken-Flourishes (Platzhalter-Text in eckigen Klammern — durch echten Kartentext ersetzen). Sammlungs-Ledger-Panel: Anzahl/Zustand/Foil als Label-Wert-Zeilen mit gepunkteten Trennlinien. 2 Action-Buttons unten: primär (Gold-Verlauf-Fill, dunkler Text) "Zur Sammlung", sekundär (Gold-Outline) "Zu Deck".

### Deck-Liste

Titelzeile "Deine Decks" + "+ Neu"-Button (Gold-Fill). **Durchlaufendes Banner** (104px hoch, 2px solid Gold-Rahmen, border-radius 8px, Platzhalter-Pattern + 3 kleine Carousel-Dots unten — als rotierendes/durchlaufendes Feature-Banner gedacht, z.B. featured Decks/Saison-Content). Darunter Liste von Deck-Zeilen: 44px Deck-Icon-Platzhalter, Name (Cinzel) + Kartenzahl (EB Garamond), 2 kleine Farb-Orbs rechts (Deck-Farbidentität).

### Suche/Filter

Suchfeld (Gold-Rahmen 1.5px, Lupe-Icon, italic Placeholder "Karte suchen …"). Mana-Farb-Filter-Chips (5 Orbs, aktive mit Gold-Ring, inaktive 55% opacity). Rarity-Filter-Pills (Mythic aktiv/Gold-Fill, Rest Outline). Ergebnisliste: Zeilen mit kleinem Kartenbild-Thumb (34×47, Rarity-Gem-Ecke), Name+Typ, Mana-Orb rechts.

## Interactions & Behavior

- Content-Bereiche der Screens scrollen vertikal (nicht clippen) — echte Scroll-Container mit dem Custom-Scrollbar-Styling oben.
- Bottom-Nav-Tab-Wechsel = Routing zwischen den 4 Hauptbereichen.
- Filter-Chips (Mana-Farben, Rarity) sind Multi-Select-Toggles, die die Ergebnisliste filtern.
- Kartendetail wird durch Tap auf ein Karten-Tile/eine Zeile erreicht (Sammlung, Deck-Liste, Suchergebnisse).
- Fokus-States (Tastatur) sind im Mockup nicht ausgestellt — bei Umsetzung einen sichtbaren Gold-Focus-Ring ergänzen (kein Browser-Default-Blau).

## Assets

Keine externen Bild-Assets. Alle Icons sind handgebaute Inline-SVGs (Grid, Karten-Stapel, Lupe, Tausch-Pfeile, Person, Zurück-Chevron, Trichter/Filter, Sortier-Linien) mit Stroke-Width 1.6-1.8. Kartenbilder sind gestreifte Platzhalter (`repeating-linear-gradient`) mit Monospace-Label — durch echte Kartenbilder ersetzen (z.B. aus einer Karten-Datenquelle/API des Projekts). Logo als Inline-SVG (siehe oben) — für die PWA in einzelne Icon-Dateien exportieren.

## Files

- `MTG Vault Design System.dc.html` — vollständige Designreferenz (Farbpalette, Typografie, 3 Logo-Varianten, Header, Footer, 4 Screens) zum Nachschlagen von exakten Werten/Markup-Struktur.
