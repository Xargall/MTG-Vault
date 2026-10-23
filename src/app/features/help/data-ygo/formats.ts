import { HelpTermInput } from '../data/types';

// Formats, the banlist, and deck-construction rules - the Yu-Gi-Oh!
// equivalent of data/formats.ts. TCG-specific throughout (this app only
// covers the TCG, not OCG card pools/rulings).
export const HELP_TERMS_YGO_FORMATS: HelpTermInput[] = [
  {
    id: 'ygo-format-tcg-ocg',
    category: 'formats',
    term: { de: 'TCG vs. OCG', en: 'TCG vs. OCG' },
    definitionNormal: {
      de: 'Das TCG (Trading Card Game, u. a. Nordamerika/Europa) und das OCG (Official Card Game, Japan/Asien) sind zwei getrennte Kartenpools mit eigenem Release-Zeitplan und eigener Bannliste. Diese App bezieht sich durchgehend auf das TCG.',
      en: 'The TCG (Trading Card Game, North America/Europe etc.) and OCG (Official Card Game, Japan/Asia) are two separate card pools with their own release schedule and banlist. This app refers to the TCG throughout.',
    },
    definitionTrottel: {
      de: 'TCG und OCG sind wie zwei Parallelwelten derselben Serie - ähnliche Karten, aber unterschiedliche Erlaubnislisten und Zeitpläne.',
      en: 'TCG and OCG are like two parallel universes of the same show – similar cards, but different permission lists and timing.',
    },
  },
  {
    id: 'ygo-format-advanced',
    category: 'formats',
    term: { de: 'Format: Advanced', en: 'Format: Advanced Format' },
    definitionNormal: {
      de: 'Advanced Format ist das aktuelle Standard-Turnierformat des TCG, in dem die aktuelle Bannliste (Forbidden/Limited/Semi-Limited) voll angewendet wird.',
      en: "Advanced Format is the TCG's current default tournament format, where the current Banlist (Forbidden/Limited/Semi-Limited) fully applies.",
    },
    definitionTrottel: {
      de: 'Advanced ist das normale Turnierformat - die Bannliste gilt hier ganz normal.',
      en: 'Advanced is the regular tournament format – the Banlist applies as usual here.',
    },
    relatedTerms: ['ygo-banlist'],
  },
  {
    id: 'ygo-format-traditional',
    category: 'formats',
    term: { de: 'Format: Traditional', en: 'Format: Traditional Format' },
    definitionNormal: {
      de: 'Im Traditional Format gelten verbotene Karten als auf eine Kopie limitiert, statt komplett verboten zu sein - ein Format, das heute kaum noch offiziell gespielt wird.',
      en: 'In Traditional Format, Forbidden cards are instead treated as Limited to one copy rather than fully banned - a format that sees essentially no official play today.',
    },
    definitionTrottel: {
      de: 'Traditional macht aus "verboten" einfach "nur eine Kopie" - heute aber praktisch nur noch eine Randnotiz.',
      en: 'Traditional turns "banned" into just "one copy allowed" - these days pretty much a footnote, though.',
    },
    relatedTerms: ['ygo-forbidden', 'ygo-format-advanced'],
  },
  {
    id: 'ygo-format-speed-duel',
    category: 'formats',
    term: { de: 'Format: Speed Duel', en: 'Format: Speed Duel' },
    definitionNormal: {
      de: 'Speed Duel ist ein eigenständiges, schnelleres Format mit 20 Lebenspunkten, 3 Monsterzonen, 3 Zauber-/Fallenzonen, 30-Karten-Decks und einer eigenen, viel kleineren Kartenliste/Bannliste.',
      en: 'Speed Duel is its own faster-paced format with 20 Life Points, 3 Monster Zones, 3 Spell & Trap Zones, 30-card decks, and its own much smaller legal card pool/banlist.',
    },
    definitionTrottel: {
      de: 'Speed Duel ist das Schnellformat: kleineres Feld, kleineres Deck, kürzere Spiele.',
      en: 'Speed Duel is the fast-format: smaller field, smaller deck, shorter games.',
    },
  },
  {
    id: 'ygo-banlist',
    category: 'formats',
    term: { de: 'Bannliste (Banlist)', en: 'Banlist' },
    definitionNormal: {
      de: 'Die Bannliste erscheint mehrmals jährlich und stuft einzelne Karten als Forbidden, Limited oder Semi-Limited ein, um das Metagame im Advanced Format auszubalancieren.',
      en: 'The Banlist is published several times a year and classifies individual cards as Forbidden, Limited, or Semi-Limited, to balance the Advanced Format metagame.',
    },
    definitionTrottel: {
      de: 'Die Bannliste ist die regelmäßige "Was darf wie oft mit"-Liste, die zu starke Karten einbremst.',
      en: 'The Banlist is the regular "how many copies, if any" list that reins in cards that got too strong.',
    },
    relatedTerms: ['ygo-forbidden', 'ygo-limited', 'ygo-semi-limited'],
  },
  {
    id: 'ygo-forbidden',
    category: 'formats',
    term: { de: 'Verboten (Forbidden)', en: 'Forbidden' },
    definitionNormal: {
      de: 'Eine als "Forbidden" gelistete Karte darf im Advanced Format in keinem Deck (Haupt-, Extra- oder Side-Deck) enthalten sein.',
      en: 'A card listed as "Forbidden" may not be included in any deck (Main, Extra, or Side) at all in Advanced Format.',
    },
    definitionTrottel: {
      de: 'Forbidden heißt: null Kopien, egal wo - nicht mal ins Side Deck.',
      en: "Forbidden means zero copies, period – not even in the Side Deck.",
    },
    relatedTerms: ['ygo-banlist'],
  },
  {
    id: 'ygo-limited',
    category: 'formats',
    term: { de: 'Limitiert (Limited)', en: 'Limited' },
    definitionNormal: {
      de: 'Eine als "Limited" gelistete Karte darf nur in einer einzigen Kopie über Haupt-, Extra- und Side-Deck zusammen enthalten sein.',
      en: 'A card listed as "Limited" may only be included as a single copy total across Main, Extra, and Side Deck combined.',
    },
    definitionTrottel: {
      de: 'Limited heißt: genau eine Kopie, egal wie du sie auf deine Decks verteilst.',
      en: "Limited means exactly one copy total, however you split it across your decks.",
    },
    relatedTerms: ['ygo-banlist'],
  },
  {
    id: 'ygo-semi-limited',
    category: 'formats',
    term: { de: 'Semi-limitiert (Semi-Limited)', en: 'Semi-Limited' },
    definitionNormal: {
      de: 'Eine als "Semi-Limited" gelistete Karte darf in bis zu zwei Kopien über Haupt-, Extra- und Side-Deck zusammen enthalten sein.',
      en: 'A card listed as "Semi-Limited" may be included in up to two copies total across Main, Extra, and Side Deck combined.',
    },
    definitionTrottel: {
      de: 'Semi-Limited heißt: bis zu zwei Kopien insgesamt - ein bisschen mehr Spielraum als Limited.',
      en: "Semi-Limited means up to two copies total – a bit more room than Limited.",
    },
    relatedTerms: ['ygo-banlist'],
  },
  {
    id: 'ygo-deck-size-rules',
    category: 'formats',
    term: { de: 'Deckgrößen-Regeln', en: 'Deck Size Rules' },
    definitionNormal: {
      de: 'Das Hauptdeck muss 40-60 Karten enthalten, Extra Deck und Side Deck jeweils maximal 15. Von jeder Karte (nach Name) sind maximal 3 Kopien über alle drei Decks hinweg erlaubt, sofern die Bannliste nichts anderes vorschreibt.',
      en: 'The Main Deck must have 40-60 cards, with the Extra Deck and Side Deck each capped at 15. Up to 3 copies of any card (by name) are allowed across all three decks combined, unless the Banlist says otherwise.',
    },
    definitionTrottel: {
      de: 'Hauptdeck: 40-60 Karten. Extra & Side: maximal 15 jeweils. Von jeder Karte höchstens 3, außer die Bannliste sagt was anderes.',
      en: "Main Deck: 40-60 cards. Extra & Side: max 15 each. Max 3 of any card, unless the Banlist says otherwise.",
    },
    relatedTerms: ['ygo-main-deck', 'ygo-extra-deck', 'ygo-side-deck', 'ygo-banlist'],
  },
  {
    id: 'ygo-master-rule',
    category: 'formats',
    term: { de: 'Master Rule', en: 'Master Rule' },
    definitionNormal: {
      de: 'Die "Master Rule" bezeichnet die grundlegenden Feld-/Zonenregeln des Spiels, die über mehrere Versionen hinweg angepasst wurden - u. a. die Einführung der Extra Monsterzonen mit Master Rule 4 (Link-Monster-Ära).',
      en: 'The "Master Rule" refers to the game\'s core field/zone rules, which have been revised across several versions - most notably introducing the Extra Monster Zones with Master Rule 4 (the Link Monster era).',
    },
    definitionTrottel: {
      de: 'Master Rule ist der Name für "wie das Feld grundsätzlich aufgebaut ist" - und das wurde im Laufe der Jahre mehrfach überarbeitet.',
      en: 'Master Rule is the name for "how the field is laid out at the most basic level" - and that\'s been reworked more than once over the years.',
    },
    relatedTerms: ['ygo-monster-zones', 'ygo-link-monster'],
    // NOTE: current Master Rule version number changes over time - worth a quick check against the latest official rulebook before publishing.
  },
  {
    id: 'ygo-best-of-three',
    category: 'formats',
    term: { de: 'Match & Side Decking', en: 'Match & Side Decking' },
    definitionNormal: {
      de: 'Ein Turnier-Match besteht meist aus bis zu drei Duellen (Best of 3). Zwischen den Duellen darf jede Spielerin ihr Deck mit dem Side Deck umbauen, solange die Deckgrößen-Regeln danach weiterhin eingehalten werden.',
      en: 'A tournament Match is usually best-of-three Duels. Between Duels, each player may rebuild their deck using their Side Deck, as long as deck size rules are still met afterward.',
    },
    definitionTrottel: {
      de: 'Nach jedem Duell darfst du dein Deck mit dem Side Deck umbauen - solange am Ende alle Größenregeln noch passen.',
      en: "After each Duel, you get to rebuild your deck using the Side Deck - as long as everything still fits the size rules afterward.",
    },
    relatedTerms: ['ygo-side-deck', 'ygo-deck-size-rules'],
  },
];
