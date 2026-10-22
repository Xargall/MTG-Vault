import { HelpTerm } from './types';

// Commander-specific rules the app's own decks/precons already lean on.
// A general format-overview (Standard/Modern/Draft/etc.) is planned here too
// - see project memory on the glossary expansion.
export const HELP_TERMS_FORMATS: HelpTerm[] = [
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
    id: 'format-standard',
    category: 'formats',
    term: { de: 'Format: Standard', en: 'Format: Standard' },
    definitionNormal: {
      de: 'Standard ist ein rotierendes Format: Nur die Sets der letzten paar Jahre sind erlaubt, ältere Sets scheiden nach und nach wieder aus. Den genauen Rotationsrhythmus passt Wizards von Zeit zu Zeit an.',
      en: "Standard is a rotating format: only the last few years of sets are legal, with older sets rotating out over time. Wizards occasionally adjusts the exact rotation schedule.",
    },
    definitionTrottel: {
      de: 'Standard ist Mode von der Stange – nur die aktuellen Jahrgänge sind erlaubt, der Rest ist "letzte Saison".',
      en: 'Standard is off-the-rack fashion – only the current crop is in, everything older is "last season".',
    },
  },
  {
    id: 'format-modern',
    category: 'formats',
    term: { de: 'Format: Modern', en: 'Format: Modern' },
    definitionNormal: {
      de: 'Modern ist nicht-rotierend und beginnt beim modernen Kartenrahmen (2003, ab Achte Edition/Mirrodin) – jedes reguläre Set seitdem ist erlaubt. Die meisten Sonderprodukte (z. B. Commander-Precons) sind nicht automatisch legal.',
      en: "Modern is non-rotating and starts at the modern card frame (2003, from Eighth Edition/Mirrodin onward) - every regular set since is legal. Most supplemental products (e.g. Commander precons) aren't automatically legal.",
    },
    definitionTrottel: {
      de: 'Modern ist der große Fundus seit 2003 – fast alles seitdem ist erlaubt, Sonderangebote ausgenommen.',
      en: "Modern is the big stockpile since 2003 – almost everything since then is legal, special offers excluded.",
    },
  },
  {
    id: 'format-legacy-vintage',
    category: 'formats',
    term: { de: 'Format: Legacy & Vintage', en: 'Format: Legacy & Vintage' },
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
    term: { de: 'Format: Pioneer', en: 'Format: Pioneer' },
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
    term: { de: 'Format: Pauper', en: 'Format: Pauper' },
    definitionNormal: {
      de: 'Pauper erlaubt ausschließlich Karten der Seltenheitsstufe "Gewöhnlich" (Common).',
      en: 'Pauper only allows cards printed at common rarity.',
    },
    definitionTrottel: {
      de: 'Pauper ist das Billig-Format – nur Commons erlaubt, aber oft überraschend stark.',
      en: 'Pauper is the bargain-bin format – commons only, but often surprisingly powerful.',
    },
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
