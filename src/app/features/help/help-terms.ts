export type HelpCategory = 'basics' | 'keywords' | 'formats' | 'situations';
export type HelpLang = 'de' | 'en';

export interface LocalizedText {
  de: string;
  en: string;
}

export interface HelpTerm {
  id: string;
  category: HelpCategory;
  term: LocalizedText;
  definitionNormal: LocalizedText;
  definitionTrottel: LocalizedText;
  relatedTerms?: string[];
  // Situations only: a short, mode-independent step-by-step walkthrough,
  // rendered as its own diagram below the definition (see help.scss).
  steps?: LocalizedText[];
}

export const HELP_CATEGORIES: HelpCategory[] = ['basics', 'keywords', 'formats', 'situations'];

// MTG-only for now (see CLAUDE.md) - content lives here as plain bilingual
// data rather than going through ngx-translate's flat key namespace, since
// each term also carries relatedTerms/steps cross-references by id.
export const HELP_TERMS: HelpTerm[] = [
  {
    id: 'stack',
    category: 'basics',
    term: { de: 'Stapel (Stack)', en: 'The Stack' },
    definitionNormal: {
      de: 'Der Stapel ist der Ort, auf dem Zaubersprüche und Fähigkeiten liegen, bevor sie sich auflösen. Was zuletzt dazukommt, löst sich zuerst auf (Last In, First Out).',
      en: 'The stack is where spells and abilities wait before they resolve. Whatever was added last resolves first (Last In, First Out).',
    },
    definitionTrottel: {
      de: 'Stell dir einen Stapel Teller vor: Was du zuletzt draufgelegt hast, nimmst du als Erstes wieder runter. Genauso laufen Zauber und Fähigkeiten ab – der letzte kommt zuerst dran.',
      en: 'Think of a stack of plates: whatever you put on last, you take off first. Spells and abilities work exactly the same way – the last one in goes first.',
    },
    relatedTerms: ['priority', 'stack-resolution'],
  },
  {
    id: 'priority',
    category: 'basics',
    term: { de: 'Priorität (Priority)', en: 'Priority' },
    definitionNormal: {
      de: 'Priorität bestimmt, wer gerade Zaubersprüche wirken, Fähigkeiten aktivieren oder Spezialaktionen ausführen darf. Ohne dass beide Spieler nacheinander auf Priorität verzichten, löst sich nichts auf.',
      en: 'Priority determines who may currently cast spells, activate abilities, or take special actions. Until both players pass priority in a row, nothing resolves.',
    },
    definitionTrottel: {
      de: 'Wer die Priorität hat, darf gerade reagieren – wie beim Blinzeln-Duell: Erst wenn du "ich mach nix" sagst, darf der Nächste.',
      en: 'Whoever has priority gets to react right now – like a staring contest: only once you say "nothing from me" does the next player get a turn.',
    },
    relatedTerms: ['stack', 'response-fenster'],
  },
  {
    id: 'sba',
    category: 'basics',
    term: { de: 'Zustandsbasierte Aktionen (State-Based Actions)', en: 'State-Based Actions' },
    definitionNormal: {
      de: 'Zustandsbasierte Aktionen prüfen laufend den Spielzustand (z. B. 0 Lebenspunkte, 0 Zähigkeit) und setzen Ergebnisse sofort durch, ohne auf dem Stapel zu liegen oder Priorität zu brauchen.',
      en: 'State-based actions constantly check the game state (e.g. 0 life, 0 toughness) and enforce the results immediately, without going on the stack or needing priority.',
    },
    definitionTrottel: {
      de: 'Das Spiel checkt im Hintergrund ständig: "Ist wer tot? Hat was 0 Leben?" Und räumt das sofort weg – ganz ohne dass irgendwer zustimmen muss.',
      en: 'The game is quietly checking in the background: "Is anyone dead? Does anything have 0 life?" And cleans it up instantly – nobody has to agree to anything.',
    },
  },
  {
    id: 'phasen',
    category: 'basics',
    term: { de: 'Phasen eines Zugs', en: 'Phases of a Turn' },
    definitionNormal: {
      de: 'Ein Zug gliedert sich in Upkeep, Draw, erste Hauptphase, Kampf (mit mehreren Schritten), zweite Hauptphase und Endphase. Jede Phase erlaubt nur bestimmte Aktionen.',
      en: 'A turn is made up of untap, upkeep, draw, first main phase, combat (with several steps), second main phase, and end step. Each phase only allows certain actions.',
    },
    definitionTrottel: {
      de: 'Dein Zug ist wie ein Tagesablauf: aufwachen, Kaffee (ziehen), vormittags was erledigen, Mittagskampf, nachmittags nochmal was erledigen, Feierabend.',
      en: 'Your turn is like a daily routine: wake up, coffee (draw), get something done in the morning, lunchtime fight, get something done in the afternoon, call it a day.',
    },
    relatedTerms: ['combat-trick'],
  },
  {
    id: 'flash',
    category: 'keywords',
    term: { de: 'Flash', en: 'Flash' },
    definitionNormal: {
      de: 'Flash erlaubt, eine Karte jederzeit zu wirken, zu dem Zeitpunkt, zu dem man einen Spontanzauber wirken dürfte – auch im gegnerischen Zug.',
      en: "Flash lets you cast a card any time you could cast an instant – including during your opponent's turn.",
    },
    definitionTrottel: {
      de: 'Flash heißt: Überraschung! Die Karte poppt auf, wann du willst, nicht nur in deinem eigenen Zug.',
      en: "Flash means: surprise! The card shows up whenever you want, not just on your own turn.",
    },
    relatedTerms: ['wann-spontanzauber'],
  },
  {
    id: 'trample',
    category: 'keywords',
    term: { de: 'Trample (Trampelschaden)', en: 'Trample' },
    definitionNormal: {
      de: 'Trample erlaubt, überschüssigen Kampfschaden, der die Zähigkeit des Blockers übersteigt, an den verteidigenden Spieler oder Planeswalker weiterzugeben.',
      en: "Trample lets excess combat damage that exceeds the blocker's toughness carry over to the defending player or planeswalker.",
    },
    definitionTrottel: {
      de: 'Trample = dein Monster ist so fett, dass der Rest über die Blocker drüber latscht.',
      en: 'Trample means your creature is so huge that the leftover damage just tramples right over the blocker.',
    },
  },
  {
    id: 'deathtouch',
    category: 'keywords',
    term: { de: 'Deathtouch (Todesberührung)', en: 'Deathtouch' },
    definitionNormal: {
      de: 'Jede Menge Schaden von einer Kreatur mit Todesberührung reicht aus, um die betroffene Kreatur zu zerstören – egal wie viel Zähigkeit sie hat.',
      en: 'Any amount of damage from a creature with deathtouch is enough to destroy the damaged creature – no matter how much toughness it has.',
    },
    definitionTrottel: {
      de: 'Ein Kratzer von dieser Kreatur reicht wie eine vergiftete Nadel – selbst 1 Schaden killt den dicksten Brocken.',
      en: 'One scratch from this creature is enough – like a poisoned needle. Even 1 damage kills the biggest monster on the board.',
    },
  },
  {
    id: 'protection',
    category: 'keywords',
    term: { de: 'Protection (Schutz)', en: 'Protection' },
    definitionNormal: {
      de: 'Schutz vor einer Eigenschaft (Farbe, Typ etc.) verhindert, dass die geschützte Kreatur davon beschädigt, verzaubert/verrüstet, geblockt oder als Ziel gewählt wird (Merkhilfe: DEBT).',
      en: "Protection from a quality (color, type, etc.) prevents the protected creature from being Damaged, Enchanted/Equipped, Blocked, or Targeted by it (mnemonic: DEBT).",
    },
    definitionTrottel: {
      de: 'Schutz ist wie ein Unsichtbarkeits-Schild gegen eine bestimmte Sache – "Schutz vor Rot" heißt: rote Zauber ignorieren dich komplett.',
      en: 'Protection is like an invisibility shield against one specific thing – "protection from red" means red spells ignore you completely.',
    },
  },
  {
    id: 'ward',
    category: 'keywords',
    term: { de: 'Ward (Fürsorge)', en: 'Ward' },
    definitionNormal: {
      de: 'Ward löst beim gegnerischen Anvisieren eine Zusatzkosten oder einen Gegeneffekt aus (z. B. "2 zahlen, sonst Gegenzauber"), um die Kreatur vor Zielwahl zu schützen.',
      en: "Ward triggers an extra cost or a counter-effect (e.g. \"pay 2 or counter it\") whenever an opponent targets the creature, protecting it from being targeted.",
    },
    definitionTrottel: {
      de: 'Ward ist der Türsteher deiner Kreatur: Will der Gegner sie anfassen, muss er erst Eintritt zahlen – oder er kommt gar nicht rein.',
      en: "Ward is your creature's bouncer: if the opponent wants to touch it, they have to pay the cover charge first – or they're not getting in.",
    },
  },
  {
    id: 'hexproof',
    category: 'keywords',
    term: { de: 'Hexproof', en: 'Hexproof' },
    definitionNormal: {
      de: 'Hexproof verhindert, dass die Kreatur von gegnerischen Zaubersprüchen oder Fähigkeiten als Ziel gewählt wird.',
      en: "Hexproof prevents the creature from being targeted by your opponents' spells or abilities.",
    },
    definitionTrottel: {
      de: 'Hexproof heißt: Der Gegner kann gar nicht erst auf dich zeigen. Unsichtbar für alles, was er dir Böses will.',
      en: "Hexproof means the opponent can't even point at you in the first place. Invisible to anything they want to do to you.",
    },
  },
  {
    id: 'flying',
    category: 'keywords',
    term: { de: 'Flying (Fliegend)', en: 'Flying' },
    definitionNormal: {
      de: 'Eine fliegende Kreatur kann nur von anderen fliegenden oder reichweiten-fähigen (Reach) Kreaturen geblockt werden.',
      en: 'A flying creature can only be blocked by other creatures with flying or reach.',
    },
    definitionTrottel: {
      de: 'Flieger können nur von anderen Fliegern oder Scharfschützen abgefangen werden – alles andere steht nur dumm am Boden.',
      en: 'Flyers can only be caught by other flyers or snipers (reach) – everything else just stands there uselessly on the ground.',
    },
  },
  {
    id: 'command-zone',
    category: 'formats',
    term: { de: 'Kommandozone (Command Zone)', en: 'Command Zone' },
    definitionNormal: {
      de: 'Die Kommandozone ist ein eigener Spielbereich außerhalb der Bibliothek, in dem der Commander beginnt und in den er statt Friedhof/Exil/Hand/Bibliothek zurückgelegt werden darf. Jedes erneute Wirken aus der Kommandozone kostet 2 zusätzliches Mana mehr (Commander Tax).',
      en: "The command zone is a separate game zone outside the library where the commander starts, and where it may go instead of the graveyard/exile/hand/library. Each time it's recast from there, it costs 2 more generic mana (commander tax).",
    },
    definitionTrottel: {
      de: 'Die Kommandozone ist das Stammlokal deines Commanders. Stirbt er, geht er einfach wieder heim – kostet beim nächsten Mal halt mehr Eintritt.',
      en: "The command zone is your commander's home turf. If it dies, it just goes back home – it just costs more cover next time.",
    },
  },
  {
    id: 'color-identity',
    category: 'formats',
    term: { de: 'Farbidentität (Color Identity)', en: 'Color Identity' },
    definitionNormal: {
      de: 'Die Farbidentität einer Karte umfasst alle Manasymbole in Manakosten UND Kartentext, nicht nur die Farbe der Manakosten. Sie bestimmt, welche Karten in einem Commander-Deck erlaubt sind.',
      en: "A card's color identity includes every mana symbol in its mana cost AND its rules text, not just the color of its mana cost. It determines which cards are legal in a Commander deck.",
    },
    definitionTrottel: {
      de: 'Farbidentität zählt auch das Kleingedruckte mit – steht irgendwo im Text ein blaues Symbol, ist die Karte auch blau, selbst wenn sie farblos aussieht.',
      en: "Color identity reads the fine print too – if there's a blue symbol anywhere in the text, the card counts as blue, even if it looks colorless.",
    },
  },
  {
    id: 'brackets',
    category: 'formats',
    term: { de: 'Brackets 1–5', en: 'Brackets 1–5' },
    definitionNormal: {
      de: 'Brackets 1–5 sind eine offizielle Einstufung der Power-Level von Commander-Decks, von "Exhibition" (1) bis "cEDH" (5), um Decks vor dem Spiel fair zuzuordnen.',
      en: 'Brackets 1–5 are an official power-level rating for Commander decks, from "Exhibition" (1) to "cEDH" (5), meant to match decks fairly before a game.',
    },
    definitionTrottel: {
      de: 'Brackets sind wie Schwierigkeitsgrade im Videospiel: 1 ist Easy-Mode mit Freunden, 5 ist "ich will gewinnen, koste es, was es wolle".',
      en: 'Brackets are like video game difficulty settings: 1 is easy mode with friends, 5 is "I\'m here to win, whatever it takes".',
    },
  },
  {
    id: 'singleton',
    category: 'formats',
    term: { de: 'Singleton-Regel', en: 'Singleton Rule' },
    definitionNormal: {
      de: 'Die Singleton-Regel (z. B. in Commander) erlaubt von jeder Karte außer Basisländern nur eine einzige Kopie pro Deck.',
      en: 'The singleton rule (e.g. in Commander) allows only one copy of any card per deck, except basic lands.',
    },
    definitionTrottel: {
      de: 'Singleton heißt: von jeder Karte nur ein Exemplar – wie ein exklusiver Club, in dem niemand das gleiche Outfit zweimal tragen darf (außer Basisländer).',
      en: "Singleton means one copy of each card – like an exclusive club where nobody's allowed to wear the same outfit twice (except basic lands).",
    },
  },
  {
    id: 'stack-resolution',
    category: 'situations',
    term: { de: 'Stack-Resolution bei mehreren Triggern', en: 'Resolving Multiple Triggers' },
    definitionNormal: {
      de: 'Lösen mehrere Fähigkeiten gleichzeitig aus, legt der aktive Spieler zuerst seine eigenen Trigger in beliebiger Reihenfolge auf den Stapel, danach die Gegner ihre. Aufgelöst wird von oben nach unten – also zuletzt gelegt, zuerst aufgelöst.',
      en: 'When multiple abilities trigger at once, the active player puts their own triggers on the stack first, in any order, then the other players add theirs. It resolves top to bottom – last on, first off.',
    },
    definitionTrottel: {
      de: 'Zuerst packt der, der am Zug ist, seinen Kram oben drauf, dann die anderen. Abgearbeitet wird von oben – wie beim Teller-Stapel von eben.',
      en: "Whoever's turn it is stacks their stuff on top first, then everyone else. It gets worked off from the top – just like that plate stack from before.",
    },
    relatedTerms: ['stack'],
    steps: [
      { de: 'Mehrere Fähigkeiten lösen gleichzeitig aus.', en: 'Multiple abilities trigger at the same time.' },
      {
        de: 'Der aktive Spieler legt zuerst seine eigenen Trigger in beliebiger Reihenfolge auf den Stapel.',
        en: 'The active player puts their own triggers on the stack first, in any order.',
      },
      { de: 'Danach legen die übrigen Spieler reihum ihre Trigger drauf.', en: 'Then the other players add theirs, in turn order.' },
      {
        de: 'Der Stapel löst sich von oben nach unten auf – zuletzt gelegt, zuerst aufgelöst.',
        en: 'The stack resolves top to bottom – last on, first off.',
      },
    ],
  },
  {
    id: 'combat-trick',
    category: 'situations',
    term: { de: 'Combat-Trick-Szenario', en: 'A Combat Trick Scenario' },
    definitionNormal: {
      de: 'Ein Combat Trick ist ein Spontanzauber, der während des Kampfes gewirkt wird, um dessen Ausgang zu ändern (z. B. Kampfwerte erhöhen, bevor Schaden zugewiesen wird). Nach dem Blocken bekommen beide Spieler nochmal Priorität, bevor Schaden berechnet wird.',
      en: 'A combat trick is an instant cast during combat to change its outcome (e.g. boosting power/toughness before damage is assigned). After blockers are declared, both players get priority again before damage is calculated.',
    },
    definitionTrottel: {
      de: 'Combat Trick = der fiese Joker, den du erst ausspielst, wenn der Gegner schon geblockt hat und denkt, er hätte gewonnen.',
      en: "A combat trick is the nasty joker card you play only after your opponent has already blocked and thinks they've won.",
    },
    relatedTerms: ['phasen', 'flash'],
    steps: [
      { de: 'Angreifer werden deklariert.', en: 'Attackers are declared.' },
      { de: 'Der Verteidiger deklariert Blocker.', en: 'The defender declares blockers.' },
      { de: 'Beide Spieler bekommen Priorität, bevor Schaden zugewiesen wird.', en: 'Both players get priority before damage is assigned.' },
      { de: 'Jetzt wirkt jemand den Combat Trick (z. B. +2/+2).', en: 'Now someone casts the combat trick (e.g. +2/+2).' },
      { de: 'Erst danach wird der Kampfschaden berechnet.', en: 'Only then is combat damage calculated.' },
    ],
  },
  {
    id: 'response-fenster',
    category: 'situations',
    term: { de: 'Response-Fenster beim Blocken', en: 'The Response Window When Blocking' },
    definitionNormal: {
      de: 'Nach jeder Spielhandlung (z. B. der Blocken-Deklaration) bekommen beide Spieler nacheinander Priorität, bevor das Spiel fortschreitet – das ist das Fenster, in dem man noch reagieren kann.',
      en: 'After every game action (e.g. declaring blockers), both players get priority in turn before the game moves on – that\'s the window where you can still react.',
    },
    definitionTrottel: {
      de: 'Nach jeder Aktion gibt\'s kurz Stille, in der jeder noch was dazwischenfunken darf, bevor\'s weitergeht. Verpasst du den Moment, ist er weg.',
      en: "After every action there's a brief pause where anyone can still butt in before things move on. Miss that moment and it's gone.",
    },
    relatedTerms: ['priority'],
    steps: [
      { de: 'Ein Spieler führt eine Spielhandlung aus (z. B. Blocken-Deklaration).', en: 'A player takes a game action (e.g. declaring blockers).' },
      { de: 'Der aktive Spieler bekommt zuerst Priorität.', en: 'The active player gets priority first.' },
      { de: 'Reagiert er nicht, bekommt der nächste Spieler Priorität.', en: 'If they do nothing, the next player gets priority.' },
      { de: 'Erst wenn alle nacheinander passen, geht es zum nächsten Schritt.', en: 'Only once everyone passes in turn does the game move on.' },
    ],
  },
  {
    id: 'wann-spontanzauber',
    category: 'situations',
    term: { de: 'Wann darf ich einen Spontanzauber wirken?', en: 'When Can I Cast an Instant?' },
    definitionNormal: {
      de: 'Spontanzauber (Instants) dürfen jederzeit gewirkt werden, wenn man Priorität hat – auch im gegnerischen Zug oder mitten im Kampf, anders als normale Hexenmeisterzauber (Sorceries).',
      en: 'Instants can be cast any time you have priority – including during your opponent\'s turn or mid-combat, unlike sorceries.',
    },
    definitionTrottel: {
      de: 'Spontanzauber sind die Allzeit-bereit-Karten: Sobald du dran bist zu reagieren, darfst du sie zünden – egal ob dein Zug oder nicht.',
      en: "Instants are the always-ready cards: the moment it's your turn to react, you can fire them off – your turn or not.",
    },
    relatedTerms: ['flash'],
    steps: [
      { de: 'Du hast Priorität – egal in wessen Zug oder welcher Phase.', en: 'You have priority – no matter whose turn or which phase it is.' },
      { de: 'Ein Spontanzauber darf jetzt gewirkt werden.', en: 'An instant can be cast right now.' },
      { de: 'Der Zauber geht auf den Stapel, beide Spieler bekommen erneut Priorität.', en: 'The spell goes on the stack, both players get priority again.' },
      { de: 'Passen beide, löst sich der Zauber auf.', en: 'Once both players pass, the spell resolves.' },
    ],
  },
];
