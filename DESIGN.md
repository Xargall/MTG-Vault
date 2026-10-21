---
name: TCG Vault
description: Ein goldgeprägtes Zauberbuch für die eigene Kartensammlung – eine Struktur, ein eigenes Gewand pro Spiel.
colors:
  ink-night: "#17110b"
  leather-surface: "#241a12"
  oxblood-alt: "#3c1712"
  dried-blood-border: "#55231b"
  tooled-bronze-border: "#8a5a3a"
  parchment-text: "#ecdcb8"
  faded-parchment: "#c9b78f"
  gilt-gold: "#c9a24a"
  burnished-gold: "#e8cd7a"
  ember-danger: "#d9704f"
  aged-bronze: "#8a6a2c"
  verdigris-owned: "#2e7d4f"
  chart-steel-blue: "#5b87a3"
  chart-ember-rust: "#b06a35"
  chart-bronze-green: "#5c8a6c"
  chart-aged-gold: "#b8934a"
  chart-weathered-moss: "#7a8f42"
  chart-faded-amethyst: "#8b76ab"
  chart-dried-blood: "#a8524a"
typography:
  display:
    fontFamily: "Cinzel, serif"
    fontSize: "2.75rem"
    fontWeight: 700
    letterSpacing: "1.5px"
  headline:
    fontFamily: "Cinzel, serif"
    fontSize: "1.1rem"
    fontWeight: 700
    letterSpacing: "0.5px"
  title:
    fontFamily: "Cinzel, serif"
    fontSize: "1rem"
    fontWeight: 700
    letterSpacing: "0.5px"
  body:
    fontFamily: "EB Garamond, serif"
    fontSize: "1rem"
    fontWeight: 400
  label:
    fontFamily: "EB Garamond, serif"
    fontSize: "0.85rem"
    fontWeight: 400
  caption:
    fontFamily: "EB Garamond, serif"
    fontSize: "0.75rem"
    fontWeight: 600
  card-name:
    fontFamily: "Cinzel, serif"
    fontSize: "0.8rem"
    fontWeight: 400
rounded:
  xs: "4px"
  base: "6px"
  card: "8px"
  pill: "999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.gilt-gold}"
    textColor: "{colors.ink-night}"
    typography: "{typography.body}"
    rounded: "{rounded.base}"
    padding: "0.5rem"
  button-primary-hover:
    backgroundColor: "{colors.burnished-gold}"
    textColor: "{colors.ink-night}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.ember-danger}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "4px 12px"
  button-danger-hover:
    backgroundColor: "{colors.ember-danger}"
    textColor: "{colors.ink-night}"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.faded-parchment}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-filter-active:
    backgroundColor: "{colors.faded-parchment}"
    textColor: "{colors.ink-night}"
  input:
    backgroundColor: "{colors.ink-night}"
    textColor: "{colors.parchment-text}"
    typography: "{typography.body}"
    rounded: "{rounded.base}"
    padding: "0.5rem"
  panel:
    backgroundColor: "{colors.leather-surface}"
    textColor: "{colors.parchment-text}"
    rounded: "{rounded.base}"
    padding: "1.5rem"
  card-image:
    rounded: "{rounded.card}"
  badge-quantity:
    backgroundColor: "{colors.ink-night}"
    textColor: "{colors.parchment-text}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
---

# Design System: TCG Vault

## Overview

**Creative North Star: "The Gilded Grimoire"**

TCG Vault ist ein in Leder gebundenes, goldgeprägtes Zauberbuch. Jedes Spiel ist ein eigenes Kapitel darin: Die Struktur des Buchs (Header-Plakette, Panels, Raster, Typografie) bleibt immer gleich. Jedes Spiel bekommt aber sein eigenes Gewand aus Farbe, Material und Textur. Magic ist gealtertes Leder mit Blattgold, Yu-Gi-Oh! die violette, gewebte Robe eines Magiers mit türkisem Beschlag, Pokémon dunkles Gewitterbraun mit elektrischem Gelb.

Die Atmosphäre gehört dem Einband, nicht den Seiten. Header, Wortmarke, Seitenhintergrund und die Rahmen der Panels dürfen opulent sein: Prägung, Goldfolie, Siegelmuster, leises Glühen. In Listen, Formularen, Karten-Grids und Zahlen hat Lesbarkeit Vorrang. Dort ist der Kartenscan selbst das Juwel, und das Interface tritt zurück. Interaktive Elemente fühlen sich geprägt und handfest an, wie Metallbeschläge auf Leder: spürbare Kanten, sichtbare Tiefe, klares Feedback.

Das System ist durchgehend dunkel. Es gibt kein helles Theme. Es zitiert die Stimmung der Spiele, kopiert aber nie deren offizielle Marken-Optik: keine nachgebauten Kartenrahmen, Logos oder Farbcodes von Wizards, Konami oder The Pokémon Company.

**Key Characteristics:**
- Durchgehend dunkel, warm getönte Neutrals statt Grau
- Zwei Serifen: Cinzel (gemeißelte Versalien) für Überschriften, EB Garamond für Text
- Ein Akzent pro Spiel (Gold, Türkis, Gelb), sparsam auf aktive und interaktive Zustände
- Materialtexturen auf Oberflächen (Holzmaserung, Gewebe, Blitze) über einer feinen Rauschschicht
- Ornament konzentriert sich auf Header, Wortmarke und Hintergrund. Inhaltsflächen bleiben ruhig.
- Kartenbilder sind die einzigen vollfarbigen Flächen

## Colors

Eine warme, nachtdunkle Palette aus Tinte, Leder und Pergament mit einem einzigen metallischen Akzent. Die Werte im Frontmatter sind das MTG-Standard-Theme auf `:root`.

### Primary
- **Gilt Gold** (`gilt-gold`): der Akzent. Aktive Navigation, Primär-Buttons, Fokusring, Links, Unterstreichungen. Selten eingesetzt, damit er wie Blattgold wirkt.
- **Burnished Gold** (`burnished-gold`): Hover-Stufe des Akzents und Farbe der Überschriften h1–h3.

### Secondary
- **Aged Bronze** (`aged-bronze`): Akzent für einzelne Datenreihen (Manakurve, Preishistogramm), Scrollbar-Thumb und unterer Stopp der Goldfolien-Wortmarke.

### Neutral
- **Ink Night** (`ink-night`): Seitenhintergrund (unter dem schwachen Siegelmuster). Gleichzeitig der Hintergrund von Eingabefeldern und Badges und die Textfarbe auf Gold.
- **Leather Surface** (`leather-surface`): Grundfarbe aller Panels, Karten und Dialoge, immer mit Materialtextur (siehe Elevation & Depth).
- **Oxblood Alt** (`oxblood-alt`): zweite Oberflächenstufe für Hover-Flächen, Platzhalter und den Schimmer beim Laden.
- **Dried-Blood Border** (`dried-blood-border`): rein dekorative Rahmen (Panels, Dialoge, Trenner). Liegt bewusst unter 3:1 Kontrast.
- **Tooled-Bronze Border** (`tooled-bronze-border`): Rahmen interaktiver Elemente (Inputs, Selects, Filter-Chips). Erreicht 3.2:1 und erfüllt damit WCAG 1.4.11.
- **Parchment Text** (`parchment-text`): Fließtext.
- **Faded Parchment** (`faded-parchment`): sekundärer Text, Labels, inaktive Chips.

### Semantic
- **Ember Danger** (`ember-danger`): Fehlertext, destruktive Aktionen, „fehlt“-Status, Überschuss-Filter. Hell genug für AA (4.5:1) auf Hintergrund und Alt-Fläche.
- **Verdigris Owned** (`verdigris-owned`): „vorhanden“-Status in Deck-Abgleichen. Ist aktuell hart codiert und **nicht** pro Spiel überschrieben.

### Chart Palette
Sieben entsättigte Edelstein- und Metalltöne für kategoriale Daten (MTG-Farben, Yu-Gi-Oh!-Attribute): Steel-Blue, Ember-Rust, Bronze-Green, Aged-Gold, Weathered-Moss, Faded-Amethyst, Dried-Blood. Ihre Abstände in Farbton und Helligkeit halten die Kategorien auch bei Farbfehlsichtigkeit unterscheidbar. Pokémon erweitert die Palette um fünf Slots: `--chart-8` bis `--chart-12` (Charcoal-Plum, Cool Slate, Dusty Rose, Deep Indigo, Muted Teal).

### Game Themes
Jedes Spiel überschreibt dieselben Tokens über `body[data-game='…']`. MTG ist der `:root`-Standard.

| Token | Yu-Gi-Oh! („Dark Magician“) | Pokémon („Pikachu“) |
|---|---|---|
| `--color-bg` | `#140b1f` | `#170f05` |
| `--color-surface-solid` | `#241640` | `#2a1f0c` |
| `--color-surface-alt` | `#3a1f5c` | `#3d2e10` |
| `--color-border` | `#4a2f70` | `#4a3814` |
| `--color-border-strong` | `#9068c2` | `#b08d2e` |
| `--color-text` | `#ece3f5` | `#f7edc9` |
| `--color-text-muted` | `#c3aee0` | `#d9c78a` |
| `--color-accent` | `#35b8ae` | `#f7d51d` |
| `--color-accent-hover` | `#5fd9cd` | `#ffe873` |
| `--color-danger` | `#e0687a` | `#e0483f` |
| `--color-bronze` | `#b08d3e` | `#a67c27` |
| Textur | gekreuztes Diagonalgewebe | verstreute Blitz-Umrisse |

Dazu kommen pro Spiel die Header-Verläufe (`--header-grad-top/bottom`, `--header-highlight`), der Footer-Verlauf und der hellste Stopp der Wortmarke (`--title-grad-start`).

**The One Skin Per Chapter Rule.** Jedes Spiel bekommt ein vollständiges eigenes Theme über **dieselben** Tokens. Kein Spiel erfindet eigene Token-Namen oder hart codierte Farben in Komponenten. Ein neues Spiel (One Piece) ist erst fertig, wenn es Hintergrund, Oberflächen, Rahmen, Text, Akzent, Danger, Bronze, Header-Verläufe, Textur und eine eingefärbte Variante des Siegelmusters hat.

**The Gilt Leaf Rule.** Der Akzent erscheint nur auf dem, was aktiv, interaktiv oder ausgewählt ist, und auf Überschriften. Er wird nie als Füllfarbe für große Flächen benutzt.

**The Borrowed Mood, Not Borrowed Brand Rule.** Themes zitieren die Stimmung eines Spiels über Material und Farbton. Offizielle Rahmen, Logos, Symbolschriften und exakte Markenfarben werden nicht nachgebaut.

## Typography

**Display Font:** Cinzel (mit serif als Fallback)
**Body Font:** EB Garamond (mit serif als Fallback)

**Character:** Cinzel ist in Stein gemeißelte römische Versalschrift und trägt Titel, Kartennamen und Wortmarke. EB Garamond ist eine klassische Buchschrift, ruhig und gut lesbar, mit Kursiven für Flavor. Zusammen ergeben sie Titelei und Satzspiegel eines alten Buchs.

### Hierarchy
- **Display** (700, 2.75rem, Tracking 1.5px): nur die Wortmarke „TCG Vault“ im Header. Sie ist als Goldfolie gesetzt: ein Metallverlauf, der auf den Text beschnitten ist, plus ein dunkler Schatten.
- **Headline** (700, 1.1rem, Tracking 0.5px): Dialog-Titel. In Burnished Gold.
- **Title** (700, 1rem): Panel-Überschriften im Dashboard, zentriert, mit fester Mindesthöhe (2.5rem), damit der Wechsel zwischen DE und EN nichts verschiebt.
- **Body** (400, 1rem): Fließtext und Werte in Eingabefeldern. Eingabefelder bleiben bei 1rem, damit iOS beim Fokus nicht zoomt.
- **Label** (400, 0.85rem): Formular-Labels, Zurück-Links, sekundäre Aktionen. Die häufigste Größe der App.
- **Caption** (600, 0.75rem): Badges, Spielauswahl, Metadaten. 0.65–0.7rem nur für Sprach-Badges und Druck-Metadaten.
- **Card Name** (Cinzel 400, 0.8rem): Name unter jedem Kartenbild, einzeilig mit Ellipse.

**The Chiselled Caps Rule.** Cinzel nur für Namen und Titel: Überschriften, Kartennamen, Wortmarke. Niemals für Fließtext, Labels oder Zahlenkolonnen.

**The Stable Line Rule.** Elemente, deren Text zwischen DE und EN die Länge ändert (Navigation, Panel-Titel, Spielauswahl), bekommen Mindestbreiten oder -höhen. Ein Sprachwechsel darf das Layout nicht verschieben.

## Layout

Eine einspaltige, zentrierte App unter einer vollbreiten Header-Plakette. Die Inhaltsbreite richtet sich nach der Ansicht: Dashboard bis 900px, Collection bis 1100px, Formular-Spalten bis 520px, Dialoge bis 720px und 85vh hoch. Abstände folgen einer Dreierskala aus `sm` (0.5rem), `md` (1rem) und `lg` (1.5rem). Kleine Einzelabstände (4px, 6px) kommen nur innerhalb von Komponenten vor.

Kartenraster sind `auto-fill`-Grids mit Mindestbreiten um 130px und Abstand `md`. Sie brechen dadurch ohne eigene Breakpoints um. Kartenbilder haben immer das Seitenverhältnis 5:7.

Es gibt genau einen Breakpoint bei **480px**. Darunter teilen sich Brand und Controls im Header je eine eigene Zeile, und nebeneinander stehende Detail-Layouts (Kartenbild + Formular) stapeln sich. Die Navigation bricht per `flex-wrap` um, statt sich in ein Menü einzuklappen.

## Elevation & Depth

Ein hybrides System. Tiefe entsteht vor allem durch **Material**: Jede Oberfläche (`--color-surface`) trägt eine Textur aus dem Spiel-Theme über einer entsättigten Rauschschicht. Panels heben sich dadurch durch ihre Haptik vom Hintergrund ab, nicht durch Schatten. Echte Schatten sind selten und haben eine feste Rolle.

### Shadow Vocabulary
- **Gilt Glow** (`box-shadow: 0 0 14px rgba(201, 162, 74, 0.16)`): permanentes, leises Goldglühen um Premium-Panels (Dashboard-Übersicht, Farbkategorien). Bei Hover verstärkt auf `0 0 18px rgba(201, 162, 74, 0.28)`.
- **Mounted Plaque** (`inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 0 var(--color-bg), 0 4px 0 var(--color-accent), 0 10px 24px rgba(0,0,0,0.55)`): nur der Header. Ein doppelter Goldschnitt wie bei einem Buch plus ein echter Schlagschatten, damit der Header als montierte Plakette über der Seite sitzt.
- **Carved Slot** (`box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.45)`): eingelassene Controls, zum Beispiel die Spielauswahl, wie ein ins Leder geschnittener Schlitz.
- **Struck Highlight** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4)`): Glanzkante auf gold gefüllten aktiven Segmenten, etwa dem aktiven Sprach-Toggle.
- **Lifted Overlay** (`box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3)`): schwebende Menüs und Popover.

**The Material Over Shadow Rule.** Oberflächen erhalten ihre Tiefe aus Textur und Rahmen. Schlagschatten sind dem Header und schwebenden Ebenen vorbehalten. Glühen steht für Kostbarkeit und wird nicht als Hover-Trick auf beliebigen Elementen eingesetzt.

**The Frame Adorns, Content Doesn't Rule.** Ornament (Prägung, Goldfolie, Eckverzierungen, Siegelmuster) gehört in Header, Wortmarke, Seitenhintergrund und Panel-Rahmen. Listen, Formulare, Kartengrids und Zahlen bleiben frei davon.

## Shapes

Leicht gerundete Ecken (6px, `--radius`) für fast alles: Panels, Dialoge, Buttons, Inputs. Kartenbilder sind mit 8px etwas runder und folgen damit den gedruckten Karten. Pills (999px) sind Filter-Chips, Mengen- und Sprach-Badges vorbehalten. Kreise (50%) gibt es nur für Status-Punkte und Avatare. Rahmen sind 1px stark. Ein Rahmen in zwei Stufen (dekorativ gedämpft gegen interaktiv kräftig) trägt einen großen Teil der Hierarchie.

Wiederkehrende Formen sind das Rauten-Siegel (Raute mit vier Strahlen) im Seitenhintergrund und die gespiegelten Eckverzierungen der Header-Plakette.

## Components

### Buttons
Metallbeschläge auf Leder: klar umrissen und gold gefüllt.
- **Shape:** leicht gerundet (6px)
- **Primary:** Gilt Gold gefüllt, Text in Ink Night, 600er Gewicht, 0.5rem Innenabstand. Hover wechselt auf Burnished Gold.
- **Disabled:** 60 % Deckkraft, Cursor `not-allowed`.
- **Danger:** Umriss in Ember Danger mit transparentem Grund. Bei Hover wird er voll in Danger gefüllt, mit dunklem Text.
- **Icon / Ghost:** transparent mit gedämpftem Text, bei Hover Fläche in Oxblood Alt.
- **Segmented Toggle** (Sprache): Segmente in einem gemeinsamen kräftigen Rahmen. Das aktive Segment ist mit einem Goldverlauf gefüllt und hat eine Glanzkante.
- **Aspiration „geprägt & handfest“:** Primär-Buttons haben heute keinen `:active`-Zustand. Neue und überarbeitete Buttons bekommen spürbares Druckfeedback (leichtes Eindrücken, `scale(0.97)` oder eine inset-Kante).

### Chips (Filter)
- **Style:** Pill, transparent, kräftiger Rahmen, 0.8rem, gedämpfter Text.
- **State:** Jeder Chip trägt seine eigene `--filter-color`. Aktiv wird der Chip in dieser Farbe gefüllt, der Text dunkel und 600 fett. Der Überschuss-Filter nutzt Danger.

### Cards / Containers
- **Corner Style:** 6px
- **Background:** Leather Surface mit Spieltextur
- **Shadow Strategy:** Gilt Glow nur auf Premium-Panels, sonst keiner (siehe Elevation & Depth)
- **Border:** 1px dekorativ (Dried-Blood). Verlinkte Panels wechseln bei Hover auf Gold.
- **Internal Padding:** `md` für Kategorie-Kacheln, `lg` für Übersichts-Panels und Dialoge

### Inputs / Fields
- **Style:** Grund in Ink Night (dunkler als die umgebende Fläche, also eingelassen), 1px kräftiger Rahmen, 6px, 1rem Text.
- **Focus:** globaler Fokusring 2px Gilt Gold mit 2px Abstand (`:focus-visible`).
- **Error:** Meldung in Ember Danger unter dem Feld.

### Navigation
Zentrierte Textlinks in der Header-Plakette, 0.9rem, Mindestbreite 80px. Bei Hover wächst eine goldene 2px-Unterstreichung von der Mitte auf 60 %. Die aktive Route bekommt die volle Unterstreichung mit Glühen und Burnished-Gold-Text mit leichtem Leuchten. Mobil bricht die Navigation einfach um.

### Card Tile (Signature)
Das Kartenbild ist das Juwel. Bild im Format 5:7 mit 8px Ecken, darunter der Name in Cinzel. Badges sitzen in den Ecken des Bildes: Menge oben rechts und Sprache unten rechts (beide als dunkle Pill), Status oben links als Punkt (vorhanden, teilweise, fehlt). Fehlende Karten werden graustufig mit halber Deckkraft gezeigt, teilweise vorhandene mit 80 %. Beim Laden schimmert ein Platzhalter (Skeleton Shimmer zwischen Surface und Surface-Alt).

### Header Plaque (Signature)
Eine geprägte Lederplakette: Lichtschein von oben, feine diagonale Prägelinien, Verlauf aus den Header-Tokens des Spiels, goldene Eckverzierungen, Goldfolien-Wortmarke und ein doppelter Goldschnitt als Abschluss. Das ist die opulenteste Fläche der App, und so soll es bleiben.

### Motion
Kurze, gezielte Bewegungen. Zustandswechsel dauern 0.15s mit `ease`. Unterstreichungen wachsen in 0.2s mit `ease-out`. Beim Laden der Seite steigen Panels, Kategorie-Kacheln und Kartenkacheln einmalig gestaffelt auf (0.4s ease-out, 40ms Versatz, gedeckelt nach 8 Elementen). Alle Keyframe-Animationen stehen hinter `prefers-reduced-motion: no-preference`.

## Do's and Don'ts

### Do:
- **Do** Farben ausschließlich über die `--color-*`-Tokens beziehen, damit jedes Spiel-Theme automatisch greift.
- **Do** interaktive Rahmen mit `--color-border-strong` und dekorative mit `--color-border` zeichnen. Die zwei Stufen nicht vermischen.
- **Do** Oberflächen mit `background: var(--color-surface)` setzen, damit die Materialtextur mitkommt. `--color-surface-solid` nur dort verwenden, wo eine einfache Farbe nötig ist (Verlaufsstopps).
- **Do** Kartenbilder im Format 5:7 mit 8px Ecken zeigen und Ladezustände mit `.skeleton-shimmer` überbrücken.
- **Do** Texte, deren Länge zwischen DE und EN wechselt, mit Mindestmaßen stabilisieren.
- **Do** neue Animationen hinter `prefers-reduced-motion: no-preference` stellen und unter 300ms halten. Einzige Ausnahme ist der einmalige Seitenaufbau.

### Don't:
- **Don't** offizielle Marken-Optik nachbauen: keine Kartenrahmen, Logos, Mana- oder Energie-Symbole im Stil der Rechteinhaber als Dekoration und keine exakten Markenfarben von Wizards, Konami oder The Pokémon Company.
- **Don't** Ornament (Goldfolie, Eckverzierungen, Glühen) in Listen, Formulare oder Kartengrids tragen.
- **Don't** Farbwerte in Komponenten hart codieren. Das `#2e7d4f` des „vorhanden“-Status und das Grün/Weiß des globalen Toasts (`#3d7a3d` / `#fff`) sind bekannte Ausnahmen und kein Vorbild.
- **Don't** ein helles Theme oder reines Grau/Weiß einführen. Neutrals sind immer warm (oder im Ton des jeweiligen Spiels) getönt.
- **Don't** Cinzel für Fließtext, Labels oder Zahlen verwenden.
- **Don't** den Akzent als große Füllfläche einsetzen. Seine Seltenheit ist seine Wirkung.
