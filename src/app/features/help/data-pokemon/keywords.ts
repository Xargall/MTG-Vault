import { HelpTermInput } from '../data/types';

// Pokémon TCG's equivalent of a "keyword glossary": status conditions,
// turn actions, ability-naming eras, and the game's few genuinely named
// historical mechanics (Mega Evolution, Prism Star). Pokémon's rules
// engine is intentionally simpler than MTG's or Yu-Gi-Oh!'s - no stack, no
// priority, far fewer templated keywords overall - so this list is
// honestly shorter than data/keywords.ts or data-ygo/keywords.ts while
// still being full coverage for what the game actually names.
export const HELP_TERMS_POKEMON_KEYWORDS: HelpTermInput[] = [
  {
    id: 'pokemon-special-condition-overview',
    category: 'keywords',
    term: { de: 'Sonderzustände (Special Conditions)', en: 'Special Conditions' },
    definitionNormal: {
      de: 'Sonderzustände (Asleep, Confused, Paralyzed, Poisoned, Burned) betreffen nur das aktive Pokémon, werden mit einem Marker angezeigt und zwischen den Zügen beim Pokémon Checkup abgehandelt. Mehrere können gleichzeitig vorliegen (außer Asleep/Paralyzed schließen sich gegenseitig aus).',
      en: 'Special Conditions (Asleep, Confused, Paralyzed, Poisoned, Burned) only affect the Active Pokémon, are shown with a marker, and get resolved between turns during the Pokémon Checkup. Several can apply at once (except Asleep and Paralyzed are mutually exclusive).',
    },
    definitionTrottel: {
      de: 'Sonderzustände sind die Debuffs fürs aktive Pokémon – mehrere können gleichzeitig nerven, außer Schlaf und Paralyse vertragen sich nicht.',
      en: "Special Conditions are debuffs for the Active Pokémon – several can stack at once, except Asleep and Paralyzed don't get along.",
    },
    relatedTerms: ['pokemon-asleep', 'pokemon-confused', 'pokemon-paralyzed', 'pokemon-poisoned', 'pokemon-burned', 'pokemon-checkup'],
  },
  {
    id: 'pokemon-asleep',
    category: 'keywords',
    term: { de: 'Eingeschlafen (Asleep)', en: 'Asleep' },
    definitionNormal: {
      de: 'Ein eingeschlafenes Pokémon kann nicht angreifen und sich nicht zurückziehen. Beim Pokémon Checkup wird gemünzt: Zahl = aufwachen, Kopf = bleibt eingeschlafen.',
      en: "An Asleep Pokémon can't attack and can't retreat. During the Pokémon Checkup, flip a coin: tails wakes it up, heads it stays Asleep.",
    },
    definitionTrottel: {
      de: 'Eingeschlafen heißt: nix geht - weder angreifen noch flüchten. Münzwurf entscheidet, ob\'s aufwacht.',
      en: "Asleep means nothing doing - no attacking, no fleeing. A coin flip decides if it wakes up.",
    },
    relatedTerms: ['pokemon-checkup', 'pokemon-paralyzed'],
  },
  {
    id: 'pokemon-confused',
    category: 'keywords',
    term: { de: 'Verwirrt (Confused)', en: 'Confused' },
    definitionNormal: {
      de: 'Ein verwirrtes Pokémon darf zwar angreifen, muss dafür aber vorher münzen - bei Kopf schlägt der Angriff fehl und das eigene Pokémon nimmt 30 Schaden.',
      en: "A Confused Pokémon can still attack, but must flip a coin first - on tails, the attack fails and it deals 30 damage to itself instead.",
    },
    definitionTrottel: {
      de: 'Verwirrt heißt: Münzwurf vorm Angriff. Pech gehabt, und du haust dir selbst eine rein.',
      en: "Confused means flip a coin before attacking. Bad luck, and you clock yourself instead.",
    },
    relatedTerms: ['pokemon-checkup'],
  },
  {
    id: 'pokemon-paralyzed',
    category: 'keywords',
    term: { de: 'Paralysiert (Paralyzed)', en: 'Paralyzed' },
    definitionNormal: {
      de: 'Ein paralysiertes Pokémon kann weder angreifen noch sich zurückziehen. Anders als Schlaf endet die Paralyse automatisch beim nächsten Pokémon Checkup der betroffenen Spielerin, ohne Münzwurf.',
      en: "A Paralyzed Pokémon can neither attack nor retreat. Unlike Asleep, Paralysis ends automatically at its owner's next Pokémon Checkup, no coin flip needed.",
    },
    definitionTrottel: {
      de: 'Paralysiert ist wie Schlaf, nur ohne Münzwurf – es geht nach deinem nächsten Checkup garantiert wieder.',
      en: "Paralyzed is like Asleep but without the coin flip – it's guaranteed gone after your next Checkup.",
    },
    relatedTerms: ['pokemon-asleep', 'pokemon-checkup'],
  },
  {
    id: 'pokemon-poisoned',
    category: 'keywords',
    term: { de: 'Vergiftet (Poisoned)', en: 'Poisoned' },
    definitionNormal: {
      de: 'Ein vergiftetes Pokémon bekommt beim Pokémon Checkup automatisch 1 Schadensmarke (10 Schaden), sofern die Karte nichts anderes angibt - ohne Münzwurf, und es bleibt vergiftet, bis es geheilt wird.',
      en: "A Poisoned Pokémon automatically takes 1 damage counter (10 damage) at the Pokémon Checkup, unless a card says otherwise - no coin flip, and it stays Poisoned until cured.",
    },
    definitionTrottel: {
      de: 'Vergiftet heißt: jeden Checkup automatisch eine Schadensmarke, bis irgendwer es heilt.',
      en: 'Poisoned means one automatic damage counter every Checkup, until something cures it.',
    },
    relatedTerms: ['pokemon-checkup'],
  },
  {
    id: 'pokemon-burned',
    category: 'keywords',
    term: { de: 'Verbrannt (Burned)', en: 'Burned' },
    definitionNormal: {
      de: 'Ein verbranntes Pokémon bekommt beim Pokémon Checkup 2 Schadensmarken (20 Schaden) und danach wird gemünzt: Kopf = Verbrennung endet, Zahl = bleibt verbrannt.',
      en: "A Burned Pokémon takes 2 damage counters (20 damage) at the Pokémon Checkup, then a coin is flipped: heads ends the Burn, tails it stays.",
    },
    definitionTrottel: {
      de: 'Verbrannt tut gleich doppelt so weh wie Gift – dafür gibt\'s hinterher wenigstens einen Münzwurf auf Heilung.',
      en: "Burned hurts twice as much as Poison right away – but at least there's a coin flip for a cure afterward.",
    },
    relatedTerms: ['pokemon-checkup', 'pokemon-poisoned'],
  },
  {
    id: 'pokemon-checkup',
    category: 'keywords',
    term: { de: 'Pokémon Checkup', en: 'Pokémon Checkup' },
    definitionNormal: {
      de: 'Der Pokémon Checkup findet automatisch zwischen den Zügen statt (nach Zugende, vor dem Ziehen der nächsten Spielerin) und wertet alle Sonderzustände des aktiven Pokémon beider Spielerinnen gleichzeitig aus.',
      en: "The Pokémon Checkup happens automatically between turns (after the turn ends, before the next player draws), resolving all Special Conditions on both players' Active Pokémon at once.",
    },
    definitionTrottel: {
      de: 'Der Checkup ist die automatische Zwischenabrechnung – alle Sonderzustände werden auf einmal durchgewertet.',
      en: 'The Checkup is the automatic in-between tally – all Special Conditions get resolved at once.',
    },
    relatedTerms: ['pokemon-special-condition-overview', 'pokemon-special-condition-checkup'],
  },
  {
    id: 'pokemon-attach-energy',
    category: 'keywords',
    term: { de: 'Energie anlegen', en: 'Attach Energy' },
    definitionNormal: {
      de: 'Normalerweise darf pro Zug genau eine Energiekarte von der Hand an ein eigenes Pokémon angelegt werden - zusätzliche Anlagen sind nur über Fähigkeiten/Items/Supporter-Effekte möglich, die diese Grenze ausdrücklich nicht mitzählen.',
      en: "Normally exactly one Energy card from hand can be attached to one of your Pokémon per turn - additional attachments only happen through Ability/Item/Supporter effects that explicitly don't count against this limit.",
    },
    definitionTrottel: {
      de: 'Energie anlegen geht normalerweise einmal pro Zug – mehr nur mit einer Karte, die das extra erlaubt.',
      en: 'Attaching Energy normally works once per turn – more only with a card that specifically allows it.',
    },
    relatedTerms: ['pokemon-energy-attachment-once-per-turn'],
  },
  {
    id: 'pokemon-retreat',
    category: 'keywords',
    term: { de: 'Zurückziehen (Retreat)', en: 'Retreat' },
    definitionNormal: {
      de: 'Zurückziehen tauscht das aktive Pokémon gegen ein Bankpokémon, nachdem die Rückzugskosten (in Energie) bezahlt wurden. Normalerweise nur einmal pro Zug und nur in der eigenen Hauptphase.',
      en: "Retreating swaps the Active Pokémon for a Benched one, after paying the Retreat Cost (in Energy). Normally only once per turn, and only on your own turn.",
    },
    definitionTrottel: {
      de: 'Zurückziehen ist der Spielertausch – kostet Energie, und normalerweise nur einmal pro Zug.',
      en: 'Retreating is the player swap – costs Energy, and normally just once per turn.',
    },
    relatedTerms: ['pokemon-retreat-cost', 'pokemon-retreat-procedure'],
  },
  {
    id: 'pokemon-evolve',
    category: 'keywords',
    term: { de: 'Entwickeln (Evolve)', en: 'Evolve' },
    definitionNormal: {
      de: 'Entwickeln legt die nächste Entwicklungsstufe auf das passende Pokémon. Es behält alle Schadensmarken und angelegte Energie/Tools, bekommt aber die neuen Werte und kann nicht im selben Zug angespielt und entwickelt werden.',
      en: "Evolving places the next evolution stage onto the matching Pokémon. It keeps all damage counters and attached Energy/Tools, gains the new stats, but can't be played and evolved in the same turn.",
    },
    definitionTrottel: {
      de: 'Entwickeln legt die nächste Form oben drauf – Schaden und Ausrüstung bleiben, nur die Werte werden neu.',
      en: 'Evolving puts the next form on top – damage and gear stay, only the stats get refreshed.',
    },
    relatedTerms: ['pokemon-evolution-timing'],
  },
  {
    id: 'pokemon-knock-out',
    category: 'keywords',
    term: { de: 'K.o. (Knock Out)', en: 'Knock Out' },
    definitionNormal: {
      de: 'Ein Pokémon geht K.o., sobald seine Schadensmarken seine KP erreichen oder übersteigen - es wandert sofort in den Ablagestapel (zusammen mit allem, was daran angelegt war), und seine Besitzerin bekommt Beutekarten.',
      en: "A Pokémon is Knocked Out the moment its damage counters reach or exceed its HP - it goes straight to the Discard Pile (along with everything attached to it), and its owner takes Prize cards.",
    },
    definitionTrottel: {
      de: 'K.o. heißt: Lebensleiste voll mit Schaden, ab in den Müll - und der Gegner darf sich Beute holen.',
      en: "Knocked Out means the health bar's full of damage, off to the trash - and the opponent gets to grab Prize cards.",
    },
    relatedTerms: ['pokemon-knockout-prize-procedure', 'pokemon-hp'],
  },
  {
    id: 'pokemon-poke-power',
    category: 'keywords',
    term: { de: 'Poké-Power (historisch)', en: 'Poké-Power (Historical)' },
    definitionNormal: {
      de: 'Poké-Power (ältere Terminologie, vor 2011) war eine Fähigkeitsart, die normalerweise jederzeit im eigenen Zug nutzbar war, solange das Pokémon nicht durch einen Sonderzustand davon abgehalten wurde.',
      en: 'Poké-Power (older terminology, before 2011) was an ability type usable any time during your own turn, as long as the Pokémon wasn\'t stopped by a Special Condition.',
    },
    definitionTrottel: {
      de: 'Poké-Power war die alte Bezeichnung für "fast jederzeit nutzbare" Fähigkeiten.',
      en: 'Poké-Power was the old name for "usable almost any time" abilities.',
    },
    relatedTerms: ['pokemon-ability-modern'],
  },
  {
    id: 'pokemon-poke-body',
    category: 'keywords',
    term: { de: 'Poké-Body (historisch)', en: 'Poké-Body (Historical)' },
    definitionNormal: {
      de: 'Poké-Body (ältere Terminologie, vor 2011) war eine Fähigkeitsart, die durchgehend wirkte, ohne aktiviert zu werden müssen - ähnlich einem Dauer-Effekt.',
      en: 'Poké-Body (older terminology, before 2011) was an ability type that applied constantly without needing activation - similar to a continuous effect.',
    },
    definitionTrottel: {
      de: 'Poké-Body war die alte Bezeichnung für "läuft einfach durchgehend mit"-Fähigkeiten.',
      en: 'Poké-Body was the old name for "just runs in the background" abilities.',
    },
    relatedTerms: ['pokemon-ability-modern'],
  },
  {
    id: 'pokemon-ability-modern',
    category: 'keywords',
    term: { de: 'Fähigkeit (Ability, modern)', en: 'Ability (Modern)' },
    definitionNormal: {
      de: 'Seit 2011 heißen beide früheren Fähigkeitsarten (Poké-Power und Poké-Body) einheitlich "Ability" - der Kartentext selbst gibt an, ob sie aktiviert werden muss oder durchgehend wirkt.',
      en: 'Since 2011, both former ability types (Poké-Power and Poké-Body) are unified under "Ability" - the card text itself specifies whether it needs activating or applies constantly.',
    },
    definitionTrottel: {
      de: 'Heute heißt beides einfach "Ability" - der Kartentext selbst sagt dir, wie sie funktioniert.',
      en: 'Today it\'s all just "Ability" - the card text itself tells you how it works.',
    },
    relatedTerms: ['pokemon-poke-power', 'pokemon-poke-body'],
  },
  {
    id: 'pokemon-gx-attack',
    category: 'keywords',
    term: { de: 'GX-Angriff (GX Attack)', en: 'GX Attack' },
    definitionNormal: {
      de: 'Ein GX-Angriff darf pro Spiel insgesamt nur einmal benutzt werden, egal von welchem GX-Pokémon - als Markierung wird die Karte üblicherweise um 90° gedreht oder ein Marker gesetzt.',
      en: "A GX attack can only be used once per game in total, no matter which GX Pokémon uses it - typically marked by rotating the card 90° or placing a marker.",
    },
    definitionTrottel: {
      de: 'GX-Angriffe sind der eine Joker pro Spiel – einmal benutzt, ist er für den Rest der Partie weg.',
      en: "GX attacks are the one wildcard per game – use it once, and it's gone for the rest of the match.",
    },
    relatedTerms: ['pokemon-gx', 'pokemon-gx-vstar-once-per-game'],
  },
  {
    id: 'pokemon-vstar-power',
    category: 'keywords',
    term: { de: 'VSTAR Power', en: 'VSTAR Power' },
    definitionNormal: {
      de: 'Eine VSTAR Power (Angriff oder Fähigkeit) darf pro Spiel insgesamt nur einmal benutzt werden, egal von welchem VSTAR-Pokémon - markiert mit einem speziellen VSTAR-Marker.',
      en: "A VSTAR Power (attack or ability) can only be used once per game in total, no matter which VSTAR Pokémon uses it - marked with a special VSTAR marker.",
    },
    definitionTrottel: {
      de: 'VSTAR Power ist der GX-Joker zurück - einmal pro Spiel, markiert mit einem eigenen Stern-Marker.',
      en: "VSTAR Power brings back the GX wildcard - once per game, marked with its own star token.",
    },
    relatedTerms: ['pokemon-vstar', 'pokemon-gx-vstar-once-per-game'],
  },
  {
    id: 'pokemon-rule-box',
    category: 'keywords',
    term: { de: 'Regelkasten (Rule Box)', en: 'Rule Box' },
    definitionNormal: {
      de: 'Der Regelkasten ist der weiß hinterlegte Textblock auf besonderen Pokémon (ex, GX, V, VMAX, VSTAR u. a.), der ihre Spezialregel erklärt - u. a. wie viele Beutekarten sie bei K.o. abgeben.',
      en: "The Rule Box is the white text block on special Pokémon (ex, GX, V, VMAX, VSTAR, etc.) spelling out their special rule - including how many Prize cards they give up when Knocked Out.",
    },
    definitionTrottel: {
      de: 'Der Regelkasten verrät dir sofort, ob eine Karte eine Extra-Regel hat – meist auch, wie teuer sie für den Gegner im K.o.-Fall ist.',
      en: "The Rule Box tells you right away a card has a special rule - usually also how costly it is for the opponent if it gets Knocked Out.",
    },
    relatedTerms: ['pokemon-ex', 'pokemon-gx', 'pokemon-v'],
  },
  {
    id: 'pokemon-mega-evolution',
    category: 'keywords',
    term: { de: 'Mega-Entwicklung (historisch)', en: 'Mega Evolution (Historical)' },
    definitionNormal: {
      de: 'Mega-Entwicklung (2015-2016, XY-Ära) war eine spezielle Entwicklungsform (M-Pokémon-EX), die anstelle des normalen Zuges durchgeführt wurde und den Zug sofort beendete, dafür aber sehr starke Werte brachte.',
      en: 'Mega Evolution (2015-2016, XY era) was a special evolution form (M Pokémon-EX) performed instead of your normal play, immediately ending your turn, but granting very strong stats.',
    },
    definitionTrottel: {
      de: 'Mega-Entwicklung war Alles-oder-nichts – massiv stärker, aber dein Zug war damit sofort vorbei.',
      en: 'Mega Evolution was all-or-nothing – hugely stronger, but your turn ended the instant you did it.',
    },
  },
  {
    id: 'pokemon-prism-star',
    category: 'keywords',
    term: { de: 'Prisma-Stern (Prism Star, historisch)', en: 'Prism Star (Historical)' },
    definitionNormal: {
      de: 'Prisma-Stern-Karten (2018, markiert mit ◇) waren auf eine einzige Kopie pro Deck beschränkt. Ging eine Prisma-Stern-Karte vom Feld, musste sie statt in den Ablagestapel verdeckt ins Deck gelegt werden.',
      en: 'Prism Star cards (2018, marked with ◇) were limited to a single copy per deck. If a Prism Star card left play, it had to go face-down into the deck instead of the Discard Pile.',
    },
    definitionTrottel: {
      de: 'Prisma-Stern-Karten waren Einzelstücke mit Extra-Regel: statt in den Müll gehen sie verdeckt zurück ins Deck.',
      en: 'Prism Star cards were one-offs with an extra rule: instead of the trash, they go face-down back into the deck.',
    },
  },
  {
    id: 'pokemon-devolve',
    category: 'keywords',
    term: { de: 'Zurückentwickeln (Devolve)', en: 'Devolve' },
    definitionNormal: {
      de: 'Ein paar seltene Karteneffekte lassen ein entwickeltes Pokémon eine Entwicklungsstufe zurückfallen - die obere Entwicklungskarte geht auf die Hand zurück, Schaden und angelegte Karten bleiben beim darunterliegenden Pokémon.',
      en: 'A handful of rare card effects devolve an evolved Pokémon back a stage - the top evolution card returns to hand, while damage and attached cards stay on the Pokémon underneath.',
    },
    definitionTrottel: {
      de: 'Zurückentwickeln ist die Rückspultaste – die oberste Entwicklungsstufe geht zurück auf die Hand.',
      en: 'Devolving is the rewind button – the top evolution stage goes back to your hand.',
    },
  },
  {
    id: 'pokemon-technical-machine',
    category: 'keywords',
    term: { de: 'Technical Machine & Rocket\'s Secret Machine (historisch)', en: "Technical Machine & Rocket's Secret Machine (Historical)" },
    definitionNormal: {
      de: 'Technical Machine (Base Set-Ära) und Rocket\'s Secret Machine (Team Rocket-Set) waren frühe Trainerkarten-Unterarten, die sich wie eine Karte spielen ließen, aber dauerhaft liegen blieben und einen zusätzlichen Angriff verliehen.',
      en: "Technical Machine (Base Set era) and Rocket's Secret Machine (Team Rocket set) were early Trainer card subtypes played like a normal card but staying in play, granting an extra attack.",
    },
    definitionTrottel: {
      de: 'Technical Machines waren frühe Add-ons, die wie ein Item gespielt wurden, aber liegen blieben und einen Bonus-Angriff brachten.',
      en: "Technical Machines were early add-ons played like an Item but left in play, granting a bonus attack.",
    },
  },
];
