import { HelpTermInput } from '../data/types';

// Formats, legality, and deck-construction rules - the Pokémon TCG
// equivalent of data/formats.ts (MTG) and data-ygo/formats.ts (Yu-Gi-Oh!).
export const HELP_TERMS_POKEMON_FORMATS: HelpTermInput[] = [
  {
    id: 'pokemon-format-standard',
    category: 'formats',
    term: { de: 'Format: Standard', en: 'Format: Standard' },
    definitionNormal: {
      de: 'Standard ist das rotierende Hauptformat: nur Sets mit einem aktuell gültigen Regulierungsmarkierung (Regulation Mark) sind erlaubt. Ältere Marks fallen regelmäßig raus, sobald ein neues Regelwerk eingeführt wird.',
      en: "Standard is the main rotating format: only sets with a currently legal Regulation Mark are allowed. Older marks drop out periodically whenever a new rule set is introduced.",
    },
    definitionTrottel: {
      de: 'Standard ist das aktuelle Format – nur Karten mit frischem Regulierungs-Buchstaben sind erlaubt.',
      en: 'Standard is the current format – only cards with a fresh Regulation letter are allowed.',
    },
    relatedTerms: ['pokemon-regulation-marks'],
  },
  {
    id: 'pokemon-format-expanded',
    category: 'formats',
    term: { de: 'Format: Expanded', en: 'Format: Expanded' },
    definitionNormal: {
      de: 'Expanded ist nicht-rotierend und erlaubt alle Karten ab der Black & White-Ära (2011) - ein deutlich größerer Kartenpool als Standard.',
      en: 'Expanded is non-rotating and allows every card from the Black & White era (2011) onward - a much larger card pool than Standard.',
    },
    definitionTrottel: {
      de: 'Expanded ist der große Fundus seit 2011 – fast alles aus dieser Zeit ist erlaubt.',
      en: 'Expanded is the big stockpile since 2011 – almost everything from that era onward is legal.',
    },
  },
  {
    id: 'pokemon-format-unlimited',
    category: 'formats',
    term: { de: 'Format: Unlimited', en: 'Format: Unlimited' },
    definitionNormal: {
      de: 'Unlimited erlaubt die gesamte Kartengeschichte seit Base Set (1999), sieht heute aber praktisch keinen offiziellen Turnierspielbetrieb mehr.',
      en: 'Unlimited allows the entire card pool back to Base Set (1999), though it sees essentially no official tournament play today.',
    },
    definitionTrottel: {
      de: 'Unlimited ist "alles erlaubt seit 1999" – heute aber eher eine Randnotiz als ein aktives Format.',
      en: 'Unlimited is "anything goes since 1999" – these days more a footnote than an active format.',
    },
  },
  {
    id: 'pokemon-regulation-marks',
    category: 'formats',
    term: { de: 'Regulierungsmarkierung (Regulation Mark)', en: 'Regulation Mark' },
    definitionNormal: {
      de: 'Die Regulierungsmarkierung (ein Buchstabe unten links auf der Karte, seit 2021) bestimmt die Standard-Legalität - statt eines festen Rotationsdatums wird einfach festgelegt, welche Buchstaben aktuell erlaubt sind.',
      en: "The Regulation Mark (a letter in the bottom-left of the card, since 2021) determines Standard legality - instead of a fixed rotation date, it's simply decided which letters are currently allowed.",
    },
    definitionTrottel: {
      de: 'Der Regulierungsbuchstabe ist der Pass-Stempel der Karte – nur bestimmte Buchstaben dürfen gerade mitspielen.',
      en: "The Regulation letter is the card's passport stamp – only certain letters get to play right now.",
    },
    relatedTerms: ['pokemon-format-standard'],
  },
  {
    id: 'pokemon-deck-construction-rules',
    category: 'formats',
    term: { de: 'Deckbau-Regeln', en: 'Deck Construction Rules' },
    definitionNormal: {
      de: 'Ein Deck besteht aus genau 60 Karten, mit höchstens 4 Kopien jeder Karte (nach Name) - außer Basis-Energie, die keiner Mengenbeschränkung unterliegt.',
      en: 'A deck consists of exactly 60 cards, with at most 4 copies of any card (by name) - except Basic Energy, which has no copy limit at all.',
    },
    definitionTrottel: {
      de: 'Genau 60 Karten, maximal 4 von jeder - außer Basis-Energie, da darfst du so viel reinpacken, wie du willst.',
      en: "Exactly 60 cards, max 4 of anything - except Basic Energy, pack in as much as you want.",
    },
    relatedTerms: ['pokemon-basic-energy', 'pokemon-deck'],
  },
  {
    id: 'pokemon-ace-spec-rule',
    category: 'formats',
    term: { de: 'ACE SPEC-Regel', en: 'ACE SPEC Rule' },
    definitionNormal: {
      de: 'Eine als "ACE SPEC" markierte Karte darf nur in einer einzigen Kopie im gesamten Deck enthalten sein - unabhängig von der normalen 4-Kopien-Grenze, die für die meisten anderen Karten gilt.',
      en: 'A card marked "ACE SPEC" may only appear as a single copy in the entire deck - regardless of the normal 4-copy limit that applies to most other cards.',
    },
    definitionTrottel: {
      de: 'ACE SPEC heißt: egal wie viele Kopien du sonst haben dürftest, hier ist bei einer Schluss.',
      en: "ACE SPEC means: no matter how many copies you'd normally be allowed, here it's capped at one.",
    },
    relatedTerms: ['pokemon-deck-construction-rules', 'pokemon-ace-spec-one-copy'],
  },
  {
    id: 'pokemon-prize-count-rule',
    category: 'formats',
    term: { de: 'Beutekarten-Anzahl je nach Pokémon-Art', en: 'Prize Card Count by Pokémon Kind' },
    definitionNormal: {
      de: 'Normale Pokémon geben bei K.o. eine Beutekarte, Pokémon mit Regelkasten (ex, EX, GX, V, VSTAR, Prime) zwei, und Tag Team-GX sowie VMAX geben drei.',
      en: 'Regular Pokémon give up one Prize card on Knock Out, Pokémon with a Rule Box (ex, EX, GX, V, VSTAR, Prime) give two, and Tag Team GX and VMAX give three.',
    },
    definitionTrottel: {
      de: 'Je fetter die Karte, desto teurer der K.o. für den Besitzer: normal = 1, Regelkasten = 2, Tag Team/VMAX = 3 Beutekarten.',
      en: "The beefier the card, the pricier the Knock Out for its owner: regular = 1, Rule Box = 2, Tag Team/VMAX = 3 Prize cards.",
    },
    relatedTerms: ['pokemon-rule-box', 'pokemon-knockout-prize-procedure'],
  },
  {
    id: 'pokemon-match-structure',
    category: 'formats',
    term: { de: 'Match-Struktur', en: 'Match Structure' },
    definitionNormal: {
      de: 'Turniermatches werden je nach Event entweder als Single-Spiel (Best of 1) oder im Best-of-3-Format gespielt - anders als bei einigen anderen Sammelkartenspielen gibt es kein formelles Side Decking zwischen den Spielen.',
      en: "Tournament matches are played either as a single game (Best of 1) or Best of 3, depending on the event - unlike some other TCGs, there's no formal side-decking between games.",
    },
    definitionTrottel: {
      de: 'Je nach Turnier reicht ein einziges Spiel oder es geht auf Best of 3 - umbauen zwischendurch gibt\'s hier nicht.',
      en: "Depending on the tournament, one game is enough or it goes to Best of 3 - no rebuilding your deck in between, though.",
    },
  },
];
