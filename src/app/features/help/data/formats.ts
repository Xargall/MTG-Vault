import { HelpTermInput } from './types';

// Commander-specific rules the app's own decks/precons already lean on.
// A general format-overview (Standard/Modern/Draft/etc.) is planned here too
// - see project memory on the glossary expansion.
export const HELP_TERMS_FORMATS: HelpTermInput[] = [
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
    relatedTerms: ['legend-rule'],
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
    relatedTerms: ['format-commander', 'game-changer-card', 'mass-land-denial', 'two-card-combo'],
  },
  {
    id: 'game-changer-card',
    category: 'formats',
    term: { de: 'Game Changer (Spielveränderer)', en: 'Game Changer' },
    definitionNormal: {
      de: 'Game Changer ist eine offizielle Liste besonders mächtiger Commander-Karten (aktuell 53 Stück), deren Anzahl im Deck mit über die Bracket-Einstufung entscheidet – je mehr davon, desto höher das Bracket.',
      en: 'Game Changer is an official list of especially powerful Commander cards (53 as of writing) whose count in a deck is one of the factors deciding its bracket - more of them pushes the bracket higher.',
    },
    definitionTrottel: {
      de: 'Game Changer sind die Karten auf der offiziellen "zu stark für die unteren Brackets"-Liste – je mehr davon im Deck, desto eher landest du in einem höheren Bracket.',
      en: 'Game Changers are the cards on the official "too strong for the lower brackets" list – the more of them in your deck, the higher bracket you land in.',
    },
    relatedTerms: ['brackets'],
  },
  {
    id: 'mass-land-denial',
    category: 'formats',
    term: { de: 'Mass Land Denial', en: 'Mass Land Denial' },
    definitionNormal: {
      de: 'Mass Land Denial bezeichnet Effekte, die mehreren Gegnern gleichzeitig Länder zerstören oder wegnehmen. In Commander gilt das als besonders unfair und fließt in die Bracket-Einstufung eines Decks ein.',
      en: "Mass land denial refers to effects that destroy or take away multiple lands from several opponents at once. Considered especially unfair in Commander, its presence feeds into a deck's bracket rating.",
    },
    definitionTrottel: {
      de: 'Mass Land Denial heißt: allen gleichzeitig die Länder wegnehmen – gilt als einer der fiesesten Spielzüge überhaupt und zieht das Bracket nach oben.',
      en: "Mass land denial means ripping away everyone's lands at once – widely seen as one of the meanest moves in the game, and it pulls the bracket up.",
    },
    relatedTerms: ['brackets'],
  },
  {
    id: 'two-card-combo',
    category: 'formats',
    term: { de: 'Zwei-Karten-Combo', en: 'Two-Card Combo' },
    definitionNormal: {
      de: 'Eine Zwei-Karten-Combo ist eine Kombination aus genau zwei Karten, die zusammen ein meist unendliches oder spielentscheidendes Ergebnis erzeugen. Anzahl und Geschwindigkeit solcher Combos fließen in die Bracket-Einstufung eines Commander-Decks ein.',
      en: "A two-card combo is a combination of exactly two cards that together produce a (usually infinite or game-ending) result. How many a deck has, and how fast they come together, feeds into its Commander bracket rating.",
    },
    definitionTrottel: {
      de: 'Eine Zwei-Karten-Combo heißt: zwei Karten auf den Tisch, Spiel vorbei – genau solche Kombos drücken ein Deck Richtung höheres Bracket.',
      en: 'A two-card combo means: two cards hit the table, game over – exactly the kind of thing that pushes a deck toward a higher bracket.',
    },
    relatedTerms: ['brackets'],
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
    id: 'format-commander',
    category: 'formats',
    term: { de: 'Format: Commander (CMD)', en: 'Format: Commander (CMD)' },
    definitionNormal: {
      de: 'Commander (auch EDH) ist das meistgespielte Format: meist zu viert, 99 Hauptdeck-Karten als Singleton plus ein legendärer Commander in der Kommandozone, üblicherweise 40 Lebenspunkte Start. Erlaubt sind nur Karten innerhalb der Farbidentität des Commanders.',
      en: "Commander (also EDH) is the most-played format: typically four players, a 99-card singleton main deck plus one legendary commander in the command zone, usually starting at 40 life. Only cards within the commander's color identity are allowed.",
    },
    definitionTrottel: {
      de: 'Commander ist die große Multiplayer-Party: Jede bringt eine Anführerin mit, der Rest des Decks darf nur so bunt sein wie sie. 40 Leben, damit’s länger dauert.',
      en: "Commander is the big multiplayer party: everyone brings a leader, and the rest of the deck can only be as colorful as they are. 40 life, so it actually lasts a while.",
    },
    relatedTerms: ['command-zone', 'color-identity', 'singleton', 'brackets'],
  },
  {
    id: 'format-oathbreaker',
    category: 'formats',
    term: { de: 'Format: Oathbreaker (OB)', en: 'Format: Oathbreaker (OB)' },
    definitionNormal: {
      de: 'Oathbreaker ist eine kleinere Commander-Variante: Statt eines legendären Commanders steht ein Planeswalker in der Kommandozone, dazu ein einzelner passender "Signature Spell" (Hexerei oder Spontanzauber). Das Hauptdeck hat 60 statt 99 Karten.',
      en: 'Oathbreaker is a smaller Commander variant: instead of a legendary commander, a planeswalker sits in the command zone, paired with one matching "signature spell" (an instant or sorcery). The main deck has 60 cards instead of 99.',
    },
    definitionTrottel: {
      de: 'Oathbreaker ist Commander im Kurzformat: Dein Planeswalker bringt nur einen Lieblingszauber statt einer ganzen Kreaturen-Entourage mit.',
      en: "Oathbreaker is Commander on fast-forward: your planeswalker only brings one favorite spell along instead of a whole creature entourage.",
    },
    relatedTerms: ['format-commander'],
  },
  {
    id: 'format-duel-commander',
    category: 'formats',
    term: { de: 'Format: Duel Commander (DC)', en: 'Format: Duel Commander (DC)' },
    definitionNormal: {
      de: 'Duel Commander ist die 1-gegen-1-Variante von Commander: 100 Karten Singleton wie gewohnt, aber nur 20 statt 40 Lebenspunkte Start. Die Bannliste läuft unabhängig von der regulären Commander-Bannliste.',
      en: 'Duel Commander is the 1-vs-1 variant of Commander: the usual 100-card singleton, but starting at 20 life instead of 40. Its banned list runs independently of the regular Commander banned list.',
    },
    definitionTrottel: {
      de: 'Duel Commander ist Commander im Duell: gleiche Deckbau-Regeln, aber auf 20 Leben runtergekürzt und mit eigener Bannliste.',
      en: 'Duel Commander is Commander, head to head: same deckbuilding rules, just trimmed down to 20 life with its own banned list.',
    },
    relatedTerms: ['format-commander'],
  },
  {
    id: 'format-pauper-commander',
    category: 'formats',
    term: { de: 'Format: Pauper Commander (PCM)', en: 'Format: Pauper Commander (PCM)' },
    definitionNormal: {
      de: 'Pauper Commander kombiniert Commander mit Pauper: Das 99-Karten-Hauptdeck darf nur aus Common-Karten bestehen, der Commander selbst muss eine Uncommon-Legende sein (oder eine speziell dafür gedruckte Karte).',
      en: 'Pauper Commander combines Commander with Pauper: the 99-card main deck may only contain common-rarity cards, while the commander itself must be an uncommon legendary (or a card specifically printed to serve as one).',
    },
    definitionTrottel: {
      de: 'Pauper Commander ist Commander im Sonderangebot: Hauptdeck nur Commons, die Anführerin darf immerhin Uncommon sein.',
      en: 'Pauper Commander is Commander on clearance: the main deck is commons only, though the leader at least gets to be an uncommon.',
    },
    relatedTerms: ['format-commander', 'format-pauper'],
  },
  {
    id: 'format-brawl',
    category: 'formats',
    term: { de: 'Format: Brawl (BRL)', en: 'Format: Brawl (BRL)' },
    definitionNormal: {
      de: 'Brawl (bis Ende 2023 "Historic Brawl") ist ein 1-gegen-1-Commander-Ableger auf MTG Arena: 100 Karten Singleton, eine Legendäre Kreatur/ein Planeswalker/Fahrzeug/Raumschiff als Commander, 25 Lebenspunkte Start, Kartenpool aus dem digitalen Format Historic.',
      en: 'Brawl (called "Historic Brawl" until late 2023) is a 1-vs-1 Commander spin-off on MTG Arena: 100-card singleton, a legendary creature/planeswalker/Vehicle/Spacecraft as commander, 25 starting life, drawing its card pool from the digital Historic format.',
    },
    definitionTrottel: {
      de: 'Brawl ist Commander für Arena: nur zwei Spieler, nur digital, 25 statt 40 Leben.',
      en: 'Brawl is Commander for the Arena crowd: just two players, Arena-exclusive, 25 life instead of 40.',
    },
    relatedTerms: ['format-commander', 'format-standard-brawl'],
  },
  {
    id: 'format-standard-brawl',
    category: 'formats',
    term: { de: 'Format: Standard Brawl (SBR)', en: 'Format: Standard Brawl (SBR)' },
    definitionNormal: {
      de: 'Standard Brawl ist die kleinere Brawl-Variante: 60 statt 100 Karten, Kartenpool aus dem aktuellen Standard-Format statt Historic, sonst gleiche Grundidee (Commander in der Kommandozone, Singleton).',
      en: 'Standard Brawl is the smaller Brawl variant: 60 cards instead of 100, drawing its card pool from the current Standard format instead of Historic, otherwise the same core idea (a commander in the command zone, singleton).',
    },
    definitionTrottel: {
      de: 'Standard Brawl ist Brawl im Kleinformat: nur 60 Karten, dafür nur aktuelle Standard-Karten erlaubt.',
      en: 'Standard Brawl is Brawl in miniature: just 60 cards, built only from whatever is currently Standard-legal.',
    },
    relatedTerms: ['format-brawl', 'format-standard'],
  },
  // NOTE: Competitive Brawl split off from casual Brawl very recently (2026)
  // and sources disagree on exact launch/rules details still settling at
  // time of writing - verify against Wizards' current Brawl page before any
  // future edit here.
  {
    id: 'format-competitive-brawl',
    category: 'formats',
    term: { de: 'Format: Competitive Brawl (CBR)', en: 'Format: Competitive Brawl (CBR)' },
    definitionNormal: {
      de: 'Competitive Brawl ist die separate Ranglisten-Warteschlange für Brawl auf MTG Arena: identischer Deckbau (100 Karten, Singleton, 25 Leben), aber eigene Bannliste und ohne das kostenlose Mulligan der normalen Brawl-Warteschlange.',
      en: "Competitive Brawl is the separate ranked queue for Brawl on MTG Arena: identical deckbuilding (100 cards, singleton, 25 life), but its own banned list and without casual Brawl's free mulligan.",
    },
    definitionTrottel: {
      de: 'Competitive Brawl ist Brawl im Ernstmodus: gleiche Deckbau-Regeln, aber kein Gratis-Mulligan mehr und eine eigene, strengere Bannliste.',
      en: 'Competitive Brawl is Brawl with the gloves off: same deckbuilding, but no more free mulligan and its own, stricter banned list.',
    },
    relatedTerms: ['format-brawl'],
  },
  {
    id: 'format-historic',
    category: 'formats',
    term: { de: 'Format: Historic (HIS)', en: 'Format: Historic (HIS)' },
    definitionNormal: {
      de: 'Historic ist ein reines MTG-Arena-Format: nicht-rotierend, umfasst praktisch alle auf Arena verfügbaren Sets (auch längst aus Standard rotierte) sowie einige Arena-exklusive Karten.',
      en: 'Historic is an MTG Arena-only format: non-rotating, covering practically every set available on Arena (including older ones long rotated out of Standard) plus a handful of Arena-exclusive cards.',
    },
    definitionTrottel: {
      de: 'Historic ist Arenas eigenes "alles, was wir digital haben"-Format – auch längst aus Standard verschwundene Sets zählen wieder mit.',
      en: 'Historic is Arena’s own "everything we have digitally" format – even sets long gone from Standard count again.',
    },
    relatedTerms: ['format-standard', 'format-timeless'],
  },
  {
    id: 'format-timeless',
    category: 'formats',
    term: { de: 'Format: Timeless (TIM)', en: 'Format: Timeless (TIM)' },
    definitionNormal: {
      de: 'Timeless ist ein 2024 eingeführtes, nicht-rotierendes MTG-Arena-Format im Eternal-Stil: ein deutlich größerer Kartenpool als Historic, inklusive einiger nur digital existierender, neu ausbalancierter Kartenversionen.',
      en: 'Timeless is a non-rotating, Eternal-style MTG Arena format introduced in 2024: a considerably larger card pool than Historic, including some digital-only rebalanced card versions.',
    },
    definitionTrottel: {
      de: 'Timeless ist Arenas Antwort auf Legacy & Vintage – ein riesiger, nie rotierender Kartenpool, nur eben digital.',
      en: "Timeless is Arena's answer to Legacy & Vintage – a huge, never-rotating card pool, just digital.",
    },
    relatedTerms: ['format-historic', 'format-legacy-vintage'],
  },
  {
    id: 'format-alchemy',
    category: 'formats',
    term: { de: 'Format: Alchemy (ALC)', en: 'Format: Alchemy (ALC)' },
    definitionNormal: {
      de: 'Alchemy baut auf dem Standard-Kartenpool auf, erlaubt zusätzlich aber digital-exklusive Karten und "rebalancte" (nur auf Arena angepasste) Versionen bestehender Karten.',
      en: "Alchemy builds on the Standard card pool, but additionally allows digital-exclusive cards and 'rebalanced' versions of existing cards (adjusted only on Arena).",
    },
    definitionTrottel: {
      de: 'Alchemy ist Standard mit Arena-Hausregeln – gleiche Karten, plus ein paar digitale Extras und nachjustierte Werte.',
      en: 'Alchemy is Standard with Arena house rules – same cards, plus a few digital extras and some rebalanced numbers.',
    },
    relatedTerms: ['format-standard', 'format-historic'],
  },
  {
    id: 'format-gladiator',
    category: 'formats',
    term: { de: 'Format: Gladiator (GLA)', en: 'Format: Gladiator (GLA)' },
    definitionNormal: {
      de: 'Gladiator ist ein reines MTG-Arena-Singleton-Format: 100 Karten, nur eine Kopie jeder Karte außer Basisländern wie bei Commander, aber ohne Commander/Kommandozone – klassisches 1-gegen-1 aus dem Historic-Kartenpool.',
      en: 'Gladiator is an MTG Arena-only singleton format: 100 cards, only one copy of each card except basic lands like Commander, but with no commander or command zone - straightforward 1-vs-1 drawn from the Historic card pool.',
    },
    definitionTrottel: {
      de: 'Gladiator ist Commander ohne Anführerin – Singleton-Regel ja, Kommandozone nein.',
      en: 'Gladiator is Commander without the leader – singleton rule, yes; command zone, no.',
    },
    relatedTerms: ['singleton', 'format-historic'],
  },
  {
    id: 'format-future',
    category: 'formats',
    term: { de: 'Legalität: Future (Future Standard, FUT)', en: 'Legality: Future (Future Standard, FUT)' },
    definitionNormal: {
      de: '"Future" ist kein eigenes Spielformat, sondern eine technische Scryfall-Markierung: Sie zeigt an, welche Karten in Standard legal sein werden, sobald ihr Set alle anderen aus der Rotation verdrängt hat – nützlich, um die kommende Standard-Rotation vorherzusehen.',
      en: '"Future" isn\'t a format you actually play - it\'s a technical Scryfall tag showing which cards will be Standard-legal once their set has pushed everything else out of rotation, useful for previewing where the Standard rotation is headed.',
    },
    definitionTrottel: {
      de: 'Future ist ein Blick in die Standard-Glaskugel: welche Karten bald mitspielen dürfen, sobald die Rotation sie einholt.',
      en: "Future is a peek into Standard's crystal ball: which cards get to join once rotation catches up to them.",
    },
    relatedTerms: ['format-standard'],
  },
  {
    id: 'format-penny-dreadful',
    category: 'formats',
    term: { de: 'Format: Penny Dreadful (PDL)', en: 'Format: Penny Dreadful (PDL)' },
    definitionNormal: {
      de: 'Penny Dreadful ist ein von der Community (nicht von Wizards) organisiertes Budget-Format: Erlaubt sind nur Karten, die zu einem regelmäßig neu geprüften Stichtag unter einem festgelegten Centbetrag kosteten. Der Kartenpool verschiebt sich dadurch, wenn Preise schwanken.',
      en: 'Penny Dreadful is a community-run (not Wizards-sanctioned) budget format: only cards priced under a set cents threshold as of a periodically re-checked snapshot date are legal, so the card pool shifts as prices move.',
    },
    definitionTrottel: {
      de: 'Penny Dreadful ist das Flohmarkt-Format: nur spottbillige Karten erlaubt, und die Liste ändert sich, sobald sich die Preise bewegen.',
      en: 'Penny Dreadful is the flea-market format: only dirt-cheap cards allowed, and the list shifts whenever prices do.',
    },
    relatedTerms: ['format-pauper'],
  },
  {
    id: 'format-old-school',
    category: 'formats',
    term: { de: 'Format: Old School 93/94 (OS)', en: 'Format: Old School 93/94 (OS)' },
    definitionNormal: {
      de: 'Old School 93/94 ist ein von der Community gepflegtes Retro-Format: Erlaubt sind nur Karten aus den frühesten Sets (1993/1994, z. B. Alpha, Beta, Arabian Nights, Antiquities, Legends, The Dark) – welche Sets und Nachdrucke genau zählen, hängt vom jeweiligen Regelwerk der Spielgruppe ab (z. B. "Toronto"-, "Atlantic"- oder "Madrid"-Regeln).',
      en: 'Old School 93/94 is a community-run retro format: only cards from the earliest sets (1993/1994, e.g. Alpha, Beta, Arabian Nights, Antiquities, Legends, The Dark) are legal - exactly which sets and reprints count depends on the specific ruleset a playgroup uses (e.g. "Toronto", "Atlantic", or "Madrid" rules).',
    },
    definitionTrottel: {
      de: 'Old School 93/94 ist Magic wie bei Oma: nur die allerersten Sets, und selbst da streiten sich die Spielgruppen noch über die genaue Liste.',
      en: 'Old School 93/94 is Magic like your grandparents played it: only the very first sets, and playgroups still argue over the exact list.',
    },
  },
  {
    id: 'format-premodern',
    category: 'formats',
    term: { de: 'Format: Premodern (PM)', en: 'Format: Premodern (PM)' },
    definitionNormal: {
      de: 'Premodern ist ein von der Community gepflegtes Format für die Ära zwischen Old School und Modern: Sets von Vierte Edition bis Scourge (1995–2003), mit eigener, kurzer Bannliste.',
      en: 'Premodern is a community-run format for the era between Old School and Modern: sets from Fourth Edition through Scourge (1995-2003), with its own short banned list.',
    },
    definitionTrottel: {
      de: 'Premodern füllt die Lücke zwischen Old School und Modern – die 90er-Jahre-Sets, bevor der moderne Kartenrahmen kam.',
      en: "Premodern fills the gap between Old School and Modern – the '90s-era sets, before the modern card frame arrived.",
    },
    relatedTerms: ['format-old-school', 'format-modern'],
  },
  {
    id: 'format-predh',
    category: 'formats',
    term: { de: 'Format: PreDH (PDH)', en: 'Format: PreDH (PDH)' },
    definitionNormal: {
      de: 'PreDH (Pre-Commander EDH) ist eine Commander-Variante, die nur Karten bis einschließlich New Phyrexia (2011, das letzte Set vor dem offiziellen Commander-Produkt) erlaubt – sonst gelten die regulären Commander-Regeln und die reguläre Bannliste.',
      en: 'PreDH (pre-Commander EDH) is a Commander variant that only allows cards up through New Phyrexia (2011, the last set before the official Commander product) - otherwise the regular Commander rules and banned list apply.',
    },
    definitionTrottel: {
      de: 'PreDH ist Commander, bevor es offiziell "Commander" hieß – nur Karten aus der Zeit davor sind erlaubt.',
      en: 'PreDH is Commander from before it was officially called "Commander" – only cards from that earlier era are allowed.',
    },
    relatedTerms: ['format-commander'],
  },
  {
    id: 'format-the-list',
    category: 'formats',
    term: { de: 'The List (TL)', en: 'The List (TL)' },
    definitionNormal: {
      de: '"The List" ist eigentlich kein Spielformat, sondern ein Nachdruck-Mechanismus: Bestimmte ältere, nostalgische Karten werden zufällig als Bonuskarte in Booster-Packungen bestimmter Produkte gemischt. Die zugehörige Scryfall-Markierung zeigt nur an, ob eine Karte für diesen Pool infrage kommt – mit der Legalität in einem Deck hat das nichts zu tun.',
      en: '"The List" isn\'t actually a format to play - it\'s a reprint mechanic: certain older, nostalgic cards are randomly inserted as bonus cards into booster packs of certain products. The matching Scryfall tag just marks whether a card is eligible for that pool - it has nothing to do with deck legality.',
    },
    definitionTrottel: {
      de: 'The List ist keine Spielweise, sondern eine Lostrommel: Manche alten Karten landen zufällig als Bonus im Booster, fertig.',
      en: "The List isn't a way to play – it's a raffle drum: some old cards randomly land as a bonus in your booster, that's it.",
    },
  },
  {
    id: 'format-standard',
    category: 'formats',
    term: { de: 'Format: Standard (STD)', en: 'Format: Standard (STD)' },
    definitionNormal: {
      de: 'Standard ist ein rotierendes Format: Nur die Sets der letzten paar Jahre sind erlaubt, ältere Sets scheiden nach und nach wieder aus. Den genauen Rotationsrhythmus passt Wizards von Zeit zu Zeit an.',
      en: "Standard is a rotating format: only the last few years of sets are legal, with older sets rotating out over time. Wizards occasionally adjusts the exact rotation schedule.",
    },
    definitionTrottel: {
      de: 'Standard ist Mode von der Stange – nur die aktuellen Jahrgänge sind erlaubt, der Rest ist "letzte Saison".',
      en: 'Standard is off-the-rack fashion – only the current crop is in, everything older is "last season".',
    },
    relatedTerms: ['format-future', 'format-alchemy'],
  },
  {
    id: 'format-modern',
    category: 'formats',
    term: { de: 'Format: Modern (MOD)', en: 'Format: Modern (MOD)' },
    definitionNormal: {
      de: 'Modern ist nicht-rotierend und beginnt beim modernen Kartenrahmen (2003, ab Achte Edition/Mirrodin) – jedes reguläre Set seitdem ist erlaubt. Die meisten Sonderprodukte (z. B. Commander-Precons) sind nicht automatisch legal.',
      en: "Modern is non-rotating and starts at the modern card frame (2003, from Eighth Edition/Mirrodin onward) - every regular set since is legal. Most supplemental products (e.g. Commander precons) aren't automatically legal.",
    },
    definitionTrottel: {
      de: 'Modern ist der große Fundus seit 2003 – fast alles seitdem ist erlaubt, Sonderangebote ausgenommen.',
      en: "Modern is the big stockpile since 2003 – almost everything since then is legal, special offers excluded.",
    },
    relatedTerms: ['format-premodern'],
  },
  {
    id: 'format-legacy-vintage',
    category: 'formats',
    term: { de: 'Format: Legacy (LEG) & Vintage (VIN)', en: 'Format: Legacy (LEG) & Vintage (VIN)' },
    definitionNormal: {
      de: 'Legacy erlaubt (bis auf eine Bannliste) fast die gesamte Kartengeschichte seit Alpha. Vintage erlaubt praktisch alles – selbst die mächtigsten Karten (z. B. die "Power Nine") sind dort nicht verboten, sondern nur auf eine Kopie pro Deck beschränkt ("restricted").',
      en: 'Legacy allows almost the entire card pool back to Alpha (minus a banned list). Vintage allows practically everything - even the most powerful cards (e.g. the "Power Nine") aren\'t banned there, just restricted to one copy per deck.',
    },
    definitionTrottel: {
      de: 'Legacy & Vintage sind die "alles erlaubt"-Formate – bei Vintage dürfen sogar die fiesesten Karten mitspielen, halt nur einmal.',
      en: 'Legacy and Vintage are the "anything goes" formats – in Vintage even the nastiest cards get to play, just one copy at a time.',
    },
  },
  {
    id: 'format-pioneer',
    category: 'formats',
    term: { de: 'Format: Pioneer (PIO)', en: 'Format: Pioneer (PIO)' },
    definitionNormal: {
      de: 'Pioneer ist nicht-rotierend und beginnt bei Return to Ravnica (2012) – jedes neue Standard-legale Set kommt automatisch dazu.',
      en: 'Pioneer is non-rotating and starts at Return to Ravnica (2012) - every new Standard-legal set is automatically added to it.',
    },
    definitionTrottel: {
      de: 'Pioneer ist Modern light – der Fundus startet erst 2012, dafür ist er übersichtlicher.',
      en: "Pioneer is Modern-lite – the pool only starts in 2012, which keeps it more manageable.",
    },
  },
  {
    id: 'format-pauper',
    category: 'formats',
    term: { de: 'Format: Pauper (PAU)', en: 'Format: Pauper (PAU)' },
    definitionNormal: {
      de: 'Pauper erlaubt ausschließlich Karten der Seltenheitsstufe "Gewöhnlich" (Common).',
      en: 'Pauper only allows cards printed at common rarity.',
    },
    definitionTrottel: {
      de: 'Pauper ist das Billig-Format – nur Commons erlaubt, aber oft überraschend stark.',
      en: 'Pauper is the bargain-bin format – commons only, but often surprisingly powerful.',
    },
    relatedTerms: ['format-pauper-commander', 'format-penny-dreadful'],
  },
  {
    id: 'format-draft',
    category: 'formats',
    term: { de: 'Format: Draft', en: 'Format: Draft' },
    definitionNormal: {
      de: 'Beim Booster Draft öffnet jede Spielerin Boosterpackungen und wählt reihum eine Karte nach der anderen aus, der Rest wird weitergereicht. Die Anzahl Karten pro Packung variiert je nach Produkt.',
      en: 'In a booster draft, each player opens packs and picks one card at a time, passing the rest around the table. The number of cards per pack varies by product.',
    },
    definitionTrottel: {
      de: 'Draft ist Reihum-Shoppen: eine Karte nehmen, Rest weiterreichen, bis das Deck fertig ist.',
      en: 'Draft is pass-it-on shopping: take one card, pass the rest, repeat until your deck is done.',
    },
  },
  {
    id: 'format-sealed',
    category: 'formats',
    term: { de: 'Format: Sealed', en: 'Format: Sealed' },
    definitionNormal: {
      de: 'Bei Sealed öffnet jede Spielerin einen festen Pool an Boosterpackungen und baut ihr Deck direkt daraus, ohne zu draften.',
      en: 'In Sealed, each player opens a fixed pool of packs and builds their deck straight from it, without drafting.',
    },
    definitionTrottel: {
      de: 'Sealed ist wie Draft, nur ohne Reihum-Picken – du bekommst deinen Stapel und musst damit klarkommen.',
      en: "Sealed is like Draft without the passing-around – you get your pile and have to make it work.",
    },
  },
];
