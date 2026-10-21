# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Angular-PWA, installierbar und offline-fähig. Wird auf Handy und Desktop gleichwertig genutzt.

## Users

Der Betreiber selbst und ein kleiner, persönlich eingeladener Kreis (Freunde, Spielgruppe). Registrierung nur per Einladungscode, Login via Google. Ein öffentliches Wachstum ist nicht geplant. Eine 24-Stunden-Gast-Demo mit vorbefüllten Daten dient zum Herzeigen.

Die Nutzer sind Sammler und Spieler, die ihre Kartenbestände in mehreren TCGs kennen und pflegen wollen.

## Product Purpose

Ein eigener, werbefreier TCG-Collector ohne Paywall und ohne Kartenlimit. Er hält die Sammlung aktuell und verbindet sie mit dem Deckbau. So weiß man jederzeit, was man besitzt, was einem Deck noch fehlt und was das kostet.

Erfolg heißt: Die Sammlung ist aktuell, und wer unterwegs Karten kaufen will, hat die Wunschliste mit aktuellen Preisen sofort parat.

## Positioning

- **Kein Paywall, kein Limit:** keine Abo-Features, keine Werbung, keine Kartenobergrenze.
- **Mehrere TCGs in einer App:** Magic und Yu-Gi-Oh! aktiv, Pokémon vorbereitet, One Piece geplant.
- **Deck ↔ Sammlung:** Precons (MTGJSON) und Community-Decks (EDHREC) werden direkt gegen die eigene Sammlung abgeglichen. Fehlende Karten wandern auf die Wunschliste.
- **Eigene Kontrolle:** Filter, Features und Datenmodell sind selbst gebaut und folgen dem eigenen Bedarf statt einer Produkt-Roadmap.

## Operating Context

Zwei gleichwertige Nutzungssituationen:

- **Zuhause (Handy oder Desktop):** Neue Karten erfassen und die Sammlung aktuell halten. Der Kamera-Scanner auf dem Handy arbeitet inkonsistent, deshalb läuft die Erfassung oft über Suche und manuelles Hinzufügen. Dazu kommen Decks bauen und abgleichen sowie die Wunschliste pflegen.
- **Unterwegs (Handy):** Im Laden oder beim Spieleabend die Wunschliste aufrufen, sehen, was einem Deck fehlt und was es kostet, und Karten kaufen.

## Capabilities and Constraints

- Bereiche: Dashboard, Collection, Decks (aktuell nur MTG), Wunschliste, Scanner, Profil, Einstellungen, Impressum.
- Aktives Spiel wird global gewählt. Alle Daten werden pro Spiel getrennt (game_id).
- Kartendaten, Bilder und Preise kommen on-demand von Scryfall bzw. YGOPRODeck. In Supabase liegen nur IDs, Mengen, Zustand und Foil. Preise werden nie gecacht.
- Scanner: Gemini Vision liest die Zeile mit Set-Code und Sammlernummer. Der Gemini-Key wird pro Nutzer in den Einstellungen hinterlegt. Im Demo-Modus ist der Scanner gesperrt.
- Zweisprachig: Deutsch und Englisch (ngx-translate).
- Rechtlich: Ein deutsches Impressum (§ 5 TMG) muss ohne Login erreichbar sein.
- Offen: KI-Deckvorschläge sind in CLAUDE.md über die Anthropic API vorgesehen. Ob und wann sie kommen, ist nicht entschieden.

## Brand Commitments

- Name: **TCG Vault** (Repo heißt historisch MTG-Vault).
- Live unter tcg-vault.mathias-mayer.de.

## Evidence on Hand

- Echte Sammlungs-, Deck- und Wunschlistendaten der Nutzer in Supabase.
- Demo-Seed (`DemoSeedService`) mit vorbefüllter Sammlung, Decks und Wunschliste für Gäste.
- Keine Testimonials, Nutzerzahlen oder Pressestimmen. Solche Angaben dürfen nicht erfunden werden.

## Product Principles

1. **Die Sammlung ist die Wahrheit.** Jede Ansicht (Decks, Wunschliste, Preise) beantwortet am Ende die Frage: Was habe ich, und was fehlt mir?
2. **Unterwegs zählt Sekunden.** Wunschliste, Preise und fehlende Karten müssen auf dem Handy ohne Umwege erreichbar sein.
3. **Erfassen darf nicht am Scanner hängen.** Manuelle Suche und Hinzufügen sind ein gleichwertiger Hauptweg, kein Fallback.
4. **Jedes Spiel nach seinen eigenen Regeln.** Kategorien, Felder und Varianten folgen dem jeweiligen TCG (Farben gegen Attribute, Foil nur wo es existiert). Nichts wird über einen Kamm geschoren.
5. **Keine künstlichen Grenzen.** Kein Feature wird zurückgehalten, um zu einem Upgrade zu drängen.
