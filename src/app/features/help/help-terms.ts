export type HelpCategory = 'basics' | 'keywords' | 'formats' | 'situations';

export interface HelpTerm {
  id: string;
  category: HelpCategory;
  term: string;
  definitionNormal: string;
  definitionTrottel: string;
  relatedTerms?: string[];
}

export const HELP_CATEGORIES: HelpCategory[] = ['basics', 'keywords', 'formats', 'situations'];

// MTG-only for now (see CLAUDE.md) - content lives here as plain data rather
// than going through ngx-translate, same as card text coming straight from
// Scryfall: it's content, not UI chrome.
export const HELP_TERMS: HelpTerm[] = [
  {
    id: 'stack',
    category: 'basics',
    term: 'Stapel (Stack)',
    definitionNormal:
      'Der Stapel ist der Ort, auf dem Zaubersprüche und Fähigkeiten liegen, bevor sie sich auflösen. Was zuletzt dazukommt, löst sich zuerst auf (Last In, First Out).',
    definitionTrottel:
      'Stell dir einen Stapel Teller vor: Was du zuletzt draufgelegt hast, nimmst du als Erstes wieder runter. Genauso laufen Zauber und Fähigkeiten ab – der letzte kommt zuerst dran.',
    relatedTerms: ['priority', 'stack-resolution'],
  },
  {
    id: 'priority',
    category: 'basics',
    term: 'Priorität (Priority)',
    definitionNormal:
      'Priorität bestimmt, wer gerade Zaubersprüche wirken, Fähigkeiten aktivieren oder Spezialaktionen ausführen darf. Ohne dass beide Spieler nacheinander auf Priorität verzichten, löst sich nichts auf.',
    definitionTrottel:
      'Wer die Priorität hat, darf gerade reagieren – wie beim Blinzeln-Duell: Erst wenn du "ich mach nix" sagst, darf der Nächste.',
    relatedTerms: ['stack', 'response-fenster'],
  },
  {
    id: 'sba',
    category: 'basics',
    term: 'Zustandsbasierte Aktionen (State-Based Actions)',
    definitionNormal:
      'Zustandsbasierte Aktionen prüfen laufend den Spielzustand (z. B. 0 Lebenspunkte, 0 Zähigkeit) und setzen Ergebnisse sofort durch, ohne auf dem Stapel zu liegen oder Priorität zu brauchen.',
    definitionTrottel:
      'Das Spiel checkt im Hintergrund ständig: "Ist wer tot? Hat was 0 Leben?" Und räumt das sofort weg – ganz ohne dass irgendwer zustimmen muss.',
  },
  {
    id: 'phasen',
    category: 'basics',
    term: 'Phasen eines Zugs',
    definitionNormal:
      'Ein Zug gliedert sich in Upkeep, Draw, erste Hauptphase, Kampf (mit mehreren Schritten), zweite Hauptphase und Endphase. Jede Phase erlaubt nur bestimmte Aktionen.',
    definitionTrottel:
      'Dein Zug ist wie ein Tagesablauf: aufwachen, Kaffee (ziehen), vormittags was erledigen, Mittagskampf, nachmittags nochmal was erledigen, Feierabend.',
    relatedTerms: ['combat-trick'],
  },
  {
    id: 'flash',
    category: 'keywords',
    term: 'Flash',
    definitionNormal:
      'Flash erlaubt, eine Karte jederzeit zu wirken, zu dem Zeitpunkt, zu dem man einen Spontanzauber wirken dürfte – auch im gegnerischen Zug.',
    definitionTrottel: 'Flash heißt: Überraschung! Die Karte poppt auf, wann du willst, nicht nur in deinem eigenen Zug.',
    relatedTerms: ['wann-spontanzauber'],
  },
  {
    id: 'trample',
    category: 'keywords',
    term: 'Trample (Trampelschaden)',
    definitionNormal:
      'Trample erlaubt, überschüssigen Kampfschaden, der die Zähigkeit des Blockers übersteigt, an den verteidigenden Spieler oder Planeswalker weiterzugeben.',
    definitionTrottel: 'Trample = dein Monster ist so fett, dass der Rest über die Blocker drüber latscht.',
  },
  {
    id: 'deathtouch',
    category: 'keywords',
    term: 'Deathtouch (Todesberührung)',
    definitionNormal:
      'Jede Menge Schaden von einer Kreatur mit Todesberührung reicht aus, um die betroffene Kreatur zu zerstören – egal wie viel Zähigkeit sie hat.',
    definitionTrottel: 'Ein Kratzer von dieser Kreatur reicht wie eine vergiftete Nadel – selbst 1 Schaden killt den dicksten Brocken.',
  },
  {
    id: 'protection',
    category: 'keywords',
    term: 'Protection (Schutz)',
    definitionNormal:
      'Schutz vor einer Eigenschaft (Farbe, Typ etc.) verhindert, dass die geschützte Kreatur davon beschädigt, verzaubert/verrüstet, geblockt oder als Ziel gewählt wird (Merkhilfe: DEBT).',
    definitionTrottel: 'Schutz ist wie ein Unsichtbarkeits-Schild gegen eine bestimmte Sache – "Schutz vor Rot" heißt: rote Zauber ignorieren dich komplett.',
  },
  {
    id: 'ward',
    category: 'keywords',
    term: 'Ward (Fürsorge)',
    definitionNormal:
      'Ward löst beim gegnerischen Anvisieren eine Zusatzkosten oder einen Gegeneffekt aus (z. B. "2 zahlen, sonst Gegenzauber"), um die Kreatur vor Zielwahl zu schützen.',
    definitionTrottel: 'Ward ist der Türsteher deiner Kreatur: Will der Gegner sie anfassen, muss er erst Eintritt zahlen – oder er kommt gar nicht rein.',
  },
  {
    id: 'hexproof',
    category: 'keywords',
    term: 'Hexproof',
    definitionNormal: 'Hexproof verhindert, dass die Kreatur von gegnerischen Zaubersprüchen oder Fähigkeiten als Ziel gewählt wird.',
    definitionTrottel: 'Hexproof heißt: Der Gegner kann gar nicht erst auf dich zeigen. Unsichtbar für alles, was er dir Böses will.',
  },
  {
    id: 'flying',
    category: 'keywords',
    term: 'Flying (Fliegend)',
    definitionNormal: 'Eine fliegende Kreatur kann nur von anderen fliegenden oder reichweiten-fähigen (Reach) Kreaturen geblockt werden.',
    definitionTrottel: 'Flieger können nur von anderen Fliegern oder Scharfschützen abgefangen werden – alles andere steht nur dumm am Boden.',
  },
  {
    id: 'command-zone',
    category: 'formats',
    term: 'Kommandozone (Command Zone)',
    definitionNormal:
      'Die Kommandozone ist ein eigener Spielbereich außerhalb der Bibliothek, in dem der Commander beginnt und in den er statt Friedhof/Exil/Hand/Bibliothek zurückgelegt werden darf. Jedes erneute Wirken aus der Kommandozone kostet 2 zusätzliches Mana mehr (Commander Tax).',
    definitionTrottel: 'Die Kommandozone ist das Stammlokal deines Commanders. Stirbt er, geht er einfach wieder heim – kostet beim nächsten Mal halt mehr Eintritt.',
  },
  {
    id: 'color-identity',
    category: 'formats',
    term: 'Farbidentität (Color Identity)',
    definitionNormal:
      'Die Farbidentität einer Karte umfasst alle Manasymbole in Manakosten UND Kartentext, nicht nur die Farbe der Manakosten. Sie bestimmt, welche Karten in einem Commander-Deck erlaubt sind.',
    definitionTrottel: 'Farbidentität zählt auch das Kleingedruckte mit – steht irgendwo im Text ein blaues Symbol, ist die Karte auch blau, selbst wenn sie farblos aussieht.',
  },
  {
    id: 'brackets',
    category: 'formats',
    term: 'Brackets 1–5',
    definitionNormal:
      'Brackets 1–5 sind eine offizielle Einstufung der Power-Level von Commander-Decks, von "Exhibition" (1) bis "cEDH" (5), um Decks vor dem Spiel fair zuzuordnen.',
    definitionTrottel: 'Brackets sind wie Schwierigkeitsgrade im Videospiel: 1 ist Easy-Mode mit Freunden, 5 ist "ich will gewinnen, koste es, was es wolle".',
  },
  {
    id: 'singleton',
    category: 'formats',
    term: 'Singleton-Regel',
    definitionNormal: 'Die Singleton-Regel (z. B. in Commander) erlaubt von jeder Karte außer Basisländern nur eine einzige Kopie pro Deck.',
    definitionTrottel: 'Singleton heißt: von jeder Karte nur ein Exemplar – wie ein exklusiver Club, in dem niemand das gleiche Outfit zweimal tragen darf (außer Basisländer).',
  },
  {
    id: 'stack-resolution',
    category: 'situations',
    term: 'Stack-Resolution bei mehreren Triggern',
    definitionNormal:
      'Lösen mehrere Fähigkeiten gleichzeitig aus, legt der aktive Spieler zuerst seine eigenen Trigger in beliebiger Reihenfolge auf den Stapel, danach die Gegner ihre. Aufgelöst wird von oben nach unten – also zuletzt gelegt, zuerst aufgelöst.',
    definitionTrottel: 'Zuerst packt der, der am Zug ist, seinen Kram oben drauf, dann die anderen. Abgearbeitet wird von oben – wie beim Teller-Stapel von eben.',
    relatedTerms: ['stack'],
  },
  {
    id: 'combat-trick',
    category: 'situations',
    term: 'Combat-Trick-Szenario',
    definitionNormal:
      'Ein Combat Trick ist ein Spontanzauber, der während des Kampfes gewirkt wird, um dessen Ausgang zu ändern (z. B. Kampfwerte erhöhen, bevor Schaden zugewiesen wird). Nach dem Blocken bekommen beide Spieler nochmal Priorität, bevor Schaden berechnet wird.',
    definitionTrottel: 'Combat Trick = der fiese Joker, den du erst ausspielst, wenn der Gegner schon geblockt hat und denkt, er hätte gewonnen.',
    relatedTerms: ['phasen', 'flash'],
  },
  {
    id: 'response-fenster',
    category: 'situations',
    term: 'Response-Fenster beim Blocken',
    definitionNormal:
      'Nach jeder Spielhandlung (z. B. der Blocken-Deklaration) bekommen beide Spieler nacheinander Priorität, bevor das Spiel fortschreitet – das ist das Fenster, in dem man noch reagieren kann.',
    definitionTrottel: 'Nach jeder Aktion gibt\'s kurz Stille, in der jeder noch was dazwischenfunken darf, bevor\'s weitergeht. Verpasst du den Moment, ist er weg.',
    relatedTerms: ['priority'],
  },
  {
    id: 'wann-spontanzauber',
    category: 'situations',
    term: 'Wann darf ich einen Spontanzauber wirken?',
    definitionNormal:
      'Spontanzauber (Instants) dürfen jederzeit gewirkt werden, wenn man Priorität hat – auch im gegnerischen Zug oder mitten im Kampf, anders als normale Hexenmeisterzauber (Sorceries).',
    definitionTrottel: 'Spontanzauber sind die Allzeit-bereit-Karten: Sobald du dran bist zu reagieren, darfst du sie zünden – egal ob dein Zug oder nicht.',
    relatedTerms: ['flash'],
  },
];
