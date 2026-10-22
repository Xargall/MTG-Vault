import { HelpTerm } from './types';

// Core rules concepts that everything else in the glossary assumes - stack,
// priority, state-based actions, turn structure. Card types and mana
// fundamentals live here too once added.
export const HELP_TERMS_BASICS: HelpTerm[] = [
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
    relatedTerms: ['priority', 'stack-resolution', 'counterspell-war', 'casting-a-spell'],
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
    relatedTerms: ['sba-mid-combat', 'legend-rule'],
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
    id: 'card-type-creature',
    category: 'basics',
    term: { de: 'Kartentyp: Kreatur', en: 'Card Type: Creature' },
    definitionNormal: {
      de: 'Kreaturen haben Stärke und Widerstandskraft, können angreifen und blocken. Die meisten Decks bestehen zu einem großen Teil aus ihnen.',
      en: 'Creatures have power and toughness, and can attack and block. Most decks are built mostly around them.',
    },
    definitionTrottel: {
      de: 'Kreaturen sind deine Armee – die einzigen Karten, die sich gegenseitig verprügeln dürfen.',
      en: 'Creatures are your army – the only cards allowed to punch each other.',
    },
    exampleCards: ['Grizzly Bears'],
  },
  {
    id: 'card-type-instant',
    category: 'basics',
    term: { de: 'Kartentyp: Spontanzauber (Instant)', en: 'Card Type: Instant' },
    definitionNormal: {
      de: 'Spontanzauber dürfen jederzeit gewirkt werden, wenn man Priorität hat, und wandern danach auf den Friedhof.',
      en: 'Instants can be cast any time you have priority, then go to the graveyard once they resolve.',
    },
    definitionTrottel: {
      de: 'Instants sind die Jederzeit-Karten – zünden, wann du willst, dann ab in den Friedhof.',
      en: 'Instants are the anytime cards – fire them whenever you want, then off to the graveyard.',
    },
    relatedTerms: ['wann-spontanzauber'],
    exampleCards: ['Lightning Bolt'],
  },
  {
    id: 'card-type-sorcery',
    category: 'basics',
    term: { de: 'Kartentyp: Hexerei (Sorcery)', en: 'Card Type: Sorcery' },
    definitionNormal: {
      de: 'Hexenmeisterzauber dürfen nur in der eigenen Hauptphase bei leerem Stapel gewirkt werden, danach wandern sie auf den Friedhof.',
      en: 'Sorceries can only be cast during your own main phase with an empty stack, then go to the graveyard once they resolve.',
    },
    definitionTrottel: {
      de: 'Sorceries sind die Nur-wenn-du-dran-bist-Karten – kein Reinfunken während des Kampfes.',
      en: "Sorceries are the only-on-your-turn cards – no butting in during combat.",
    },
  },
  {
    id: 'card-type-enchantment',
    category: 'basics',
    term: { de: 'Kartentyp: Verzauberung (Enchantment)', en: 'Card Type: Enchantment' },
    definitionNormal: {
      de: 'Verzauberungen sind Permanents mit einem dauerhaften Effekt, der auf dem Spielfeld bleibt, bis er entfernt wird.',
      en: "Enchantments are permanents with an ongoing effect that stays on the battlefield until it's removed.",
    },
    definitionTrottel: {
      de: 'Verzauberungen sind die Für-immer-Karten – einmal gelegt, wirken sie weiter, bis jemand sie wegräumt.',
      en: 'Enchantments are the forever cards – once they land, they just keep working until someone clears them off.',
    },
    exampleCards: ['Rhystic Study'],
  },
  {
    id: 'card-type-artifact',
    category: 'basics',
    term: { de: 'Kartentyp: Artefakt (Artifact)', en: 'Card Type: Artifact' },
    definitionNormal: {
      de: 'Artefakte sind Permanents, die meist farblos sind und oft unabhängig von der eigenen Farbidentität ins Deck passen. Manche sind gleichzeitig auch Kreaturen (Artefakt-Kreatur).',
      en: "Artifacts are permanents that are usually colorless and often fit into a deck regardless of its color identity. Some are also creatures (Artifact Creature).",
    },
    definitionTrottel: {
      de: 'Artefakte sind das Technik-Regal deines Decks – meist farblos und passen fast überall rein.',
      en: "Artifacts are your deck's gadget shelf – mostly colorless, fitting in almost anywhere.",
    },
    exampleCards: ['Sol Ring'],
  },
  {
    id: 'card-type-planeswalker',
    category: 'basics',
    term: { de: 'Kartentyp: Planeswalker', en: 'Card Type: Planeswalker' },
    definitionNormal: {
      de: 'Planeswalker haben Loyalitätsmarker und aktivierbare Loyalitätsfähigkeiten. Gegner können sie wie Spieler direkt angreifen.',
      en: 'Planeswalkers have loyalty counters and activated loyalty abilities. Opponents can attack them directly, like a player.',
    },
    definitionTrottel: {
      de: 'Planeswalker sind wie ein zweiter Spieler auf deiner Seite – mit eigenen Lebenspunkten (Loyalität), auf die der Gegner stattdessen eindreschen kann.',
      en: "Planeswalkers are like a second player on your side – with their own life total (loyalty) that the opponent can smash instead of you.",
    },
    exampleCards: ['Jace, the Mind Sculptor'],
  },
  {
    id: 'card-type-land',
    category: 'basics',
    term: { de: 'Kartentyp: Land (Land)', en: 'Card Type: Land' },
    definitionNormal: {
      de: 'Länder werden normalerweise einmal pro Zug gespielt (nicht gewirkt) und liefern meist Mana oder andere Fähigkeiten.',
      en: "Lands are normally played (not cast) once per turn, and usually tap for mana or provide other abilities.",
    },
    definitionTrottel: {
      de: 'Länder sind dein Geldautomat – eins pro Zug, dafür gibt\'s Mana für alles andere.',
      en: "Lands are your ATM – one per turn, and in exchange you get mana for everything else.",
    },
    exampleCards: ['Island'],
  },
  {
    id: 'card-type-battle',
    category: 'basics',
    term: { de: 'Kartentyp: Schlacht (Battle)', en: 'Card Type: Battle' },
    definitionNormal: {
      de: 'Schlachten sind Permanents mit Verteidigungsmarkern, die jede Spielerin außer der schützenden angreifen darf. Sind die Marker aufgebraucht, wird die Karte exiliert und ihre Rückseite gewirkt.',
      en: "Battles are permanents with defense counters that any player except its protector can attack. Once its counters are gone, it's exiled and its back face is cast.",
    },
    definitionTrottel: {
      de: 'Battles sind wie ein Boss mit Lebensbalken, den jeder außer dem "Beschützer" kleinhauen darf – ist er leer, klappt die Karte um.',
      en: 'Battles are like a boss with a health bar that everyone except its "protector" gets to beat on – empty it out and the card flips.',
    },
    exampleCards: ['Invasion of Zendikar'],
  },
  {
    id: 'mana-colors',
    category: 'basics',
    term: { de: 'Manafarben', en: 'Mana Colors' },
    definitionNormal: {
      de: 'Magic kennt fünf Farben – Weiß, Blau, Schwarz, Rot, Grün – plus farblos. Farblos heißt: kein einziges Farbsymbol, nicht dasselbe wie "mehrfarbig" oder einfach "ohne erkennbare Farbe".',
      en: 'Magic has five colors – white, blue, black, red, green – plus colorless. Colorless means no color pip at all, not the same thing as "multicolor" or just looking colorless.',
    },
    definitionTrottel: {
      de: 'Fünf Farben, jede mit eigener Persönlichkeit, plus Farblos für alles, dem das völlig egal ist.',
      en: "Five colors, each with its own personality, plus colorless for everything that couldn't care less.",
    },
  },
  {
    id: 'mana-value',
    category: 'basics',
    term: { de: 'Manawert (Mana Value)', en: 'Mana Value' },
    definitionNormal: {
      de: 'Der Manawert ist die Summe aller Zahlen und Symbole in den Manakosten, unabhängig von der Farbe – {2}{W}{W} hat Manawert 4. Früher "Converted Mana Cost" (CMC) genannt, 2021 in "Mana Value" umbenannt.',
      en: 'Mana value is the total of every number and symbol in a mana cost, regardless of color – {2}{W}{W} has mana value 4. Formerly called "converted mana cost" (CMC), renamed "mana value" in 2021.',
    },
    definitionTrottel: {
      de: 'Manawert ist einfach die Gesamtrechnung deiner Manakosten, egal welche Farbe – {2}{W}{W} macht 4, basta.',
      en: "Mana value is just the total bill of your mana cost, color be damned – {2}{W}{W} comes to 4, end of story.",
    },
  },
  {
    id: 'mana-hybrid-phyrexian',
    category: 'basics',
    term: { de: 'Hybrid- und Phyrexia-Mana', en: 'Hybrid and Phyrexian Mana' },
    definitionNormal: {
      de: 'Ein Hybrid-Symbol (z. B. {W/U}) darf mit einer von zwei Farben bezahlt werden – die Karte zählt trotzdem als beide Farben. Ein Phyrexia-Symbol (z. B. {U/P}) darf stattdessen auch mit 2 Lebenspunkten bezahlt werden.',
      en: 'A hybrid symbol (e.g. {W/U}) can be paid with either of two colors – the card still counts as both colors regardless of which was paid. A Phyrexian symbol (e.g. {U/P}) can instead be paid with 2 life.',
    },
    definitionTrottel: {
      de: 'Hybrid heißt: zwei Farben zur Auswahl, zählt trotzdem als beide. Phyrexia-Mana heißt: kein Bock auf die Farbe? Zahl einfach mit deinem eigenen Blut.',
      en: "Hybrid means pick either of two colors, counts as both anyway. Phyrexian mana means: don't feel like paying that color? Just pay with your own blood instead.",
    },
  },
  {
    id: 'zones-overview',
    category: 'basics',
    term: { de: 'Spielbereiche (Zonen) im Überblick', en: 'Game Zones Overview' },
    definitionNormal: {
      de: 'Magic kennt mehrere Spielbereiche: Bibliothek (verdecktes Deck), Hand (privat), Spielfeld (öffentlich, Permanents), Friedhof (offener Ablagestapel) und Exil (meist unzugänglich) – dazu Stapel und Kommandozone, die beide einen eigenen Lexikon-Eintrag haben.',
      en: 'Magic has several game zones: library (your face-down deck), hand (private), battlefield (public, where permanents live), graveyard (a face-up discard pile), and exile (mostly inaccessible) - plus the stack and command zone, both covered in their own glossary entries.',
    },
    definitionTrottel: {
      de: 'Jede Karte hat ihren Platz: Bibliothek ist der Vorrat, Hand ist geheim, Spielfeld ist die Bühne, Friedhof ist der Mülleimer, Exil ist eine andere Dimension.',
      en: "Every card has its place: library is the stockroom, hand is secret, battlefield is the stage, graveyard is the trash can, exile is a whole other dimension.",
    },
    relatedTerms: ['stack', 'command-zone'],
  },
];
