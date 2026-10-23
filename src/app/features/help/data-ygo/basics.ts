import { HelpTermInput } from '../data/types';

// Card types (by Main/Extra Deck placement), core stats, zones and turn
// phases - the Yu-Gi-Oh! equivalent of the MTG basics.ts file. IDs are
// prefixed `ygo-` throughout data-ygo/ so they stay unique against the MTG
// data files even though both live in the same combined HELP_TERMS list
// (see help-terms.ts/help-terms.spec.ts).
export const HELP_TERMS_YGO_BASICS: HelpTermInput[] = [
  {
    id: 'ygo-card-type-monster',
    category: 'basics',
    term: { de: 'Kartentyp: Monsterkarte', en: 'Card Type: Monster Card' },
    definitionNormal: {
      de: 'Monsterkarten werden beschworen, um anzugreifen und zu verteidigen. Sie haben ATK/DEF-Werte und je nach Typ weitere Eigenschaften wie Stufe, Rang oder Pendel-Skala.',
      en: 'Monster Cards are summoned to attack and defend. They have ATK/DEF values and, depending on type, extra properties like Level, Rank, or Pendulum Scale.',
    },
    definitionTrottel: {
      de: 'Monster sind deine Kämpfer – alles, was aufs Feld kommt, um draufzuhauen oder sich in den Weg zu stellen.',
      en: 'Monsters are your fighters – anything you put on the field to hit stuff or stand in the way.',
    },
    relatedTerms: ['ygo-atk-def', 'ygo-card-type-spell', 'ygo-card-type-trap'],
    exampleCards: ['Dark Magician'],
  },
  {
    id: 'ygo-card-type-spell',
    category: 'basics',
    term: { de: 'Kartentyp: Zauberkarte', en: 'Card Type: Spell Card' },
    definitionNormal: {
      de: 'Zauberkarten (grün) haben einmalige oder dauerhafte Effekte. Je nach Unterart (Normal, Schnellzauber, Dauerzauber, Ausrüstung, Feld, Ritual) gelten unterschiedliche Regeln, wann sie aktiviert werden dürfen.',
      en: 'Spell Cards (green) have one-shot or ongoing effects. Depending on subtype (Normal, Quick-Play, Continuous, Equip, Field, Ritual), different rules govern when they can be activated.',
    },
    definitionTrottel: {
      de: 'Zauberkarten sind dein Werkzeugkasten – grüne Karten für so ziemlich jeden Zweck.',
      en: 'Spell Cards are your toolbox – green cards for pretty much any job.',
    },
    relatedTerms: ['ygo-normal-spell', 'ygo-quick-play-spell', 'ygo-continuous-spell'],
    exampleCards: ['Pot of Greed'],
  },
  {
    id: 'ygo-card-type-trap',
    category: 'basics',
    term: { de: 'Kartentyp: Fallenkarte', en: 'Card Type: Trap Card' },
    definitionNormal: {
      de: 'Fallenkarten (lila) werden verdeckt auf dem Feld gesetzt und müssen (außer bei wenigen Ausnahmen) eine Runde warten, bevor sie aktiviert werden dürfen. Unterarten: Normal, Dauerfalle, Konterfalle.',
      en: 'Trap Cards (purple/pink) are Set face-down and - with a few exceptions - must wait one full turn before they can be activated. Subtypes: Normal, Continuous, Counter.',
    },
    definitionTrottel: {
      de: 'Fallen sind dein Hinterhalt – verdeckt hinlegen, warten, und dann BÄM, wenn\'s am wenigsten passt.',
      en: 'Traps are your ambush – set them face-down, wait, then BAM, right when it hurts most.',
    },
    relatedTerms: ['ygo-normal-trap', 'ygo-continuous-trap', 'ygo-counter-trap', 'ygo-set-monster'],
    exampleCards: ['Mirror Force'],
  },
  {
    id: 'ygo-normal-monster',
    category: 'basics',
    term: { de: 'Normal-Monster', en: 'Normal Monster' },
    definitionNormal: {
      de: 'Normal-Monster (orange/gelb) haben keinen aktivierbaren Effekt, nur Flavourtext. Sie beschwören, angreifen, fertig.',
      en: 'Normal Monsters (orange/tan) have no activatable effect, just flavor text. Summon them, attack, done.',
    },
    definitionTrottel: {
      de: 'Normal-Monster sind die ehrlichen Haudraufs – keine Tricks, nur Stärke gegen Stärke.',
      en: 'Normal Monsters are the honest brawlers – no tricks, just strength against strength.',
    },
    relatedTerms: ['ygo-effect-monster'],
    exampleCards: ['Blue-Eyes White Dragon'],
  },
  {
    id: 'ygo-effect-monster',
    category: 'basics',
    term: { de: 'Effekt-Monster', en: 'Effect Monster' },
    definitionNormal: {
      de: 'Effekt-Monster (orange) haben einen oder mehrere Kartentext-Effekte, die ausgelöst, aktiviert oder dauerhaft wirken können. Die meisten gedruckten Monster sind Effekt-Monster.',
      en: 'Effect Monsters (orange) have one or more card-text effects, which may be triggered, activated, or ongoing. Most printed monsters are Effect Monsters.',
    },
    definitionTrottel: {
      de: 'Effekt-Monster sind die Haudraufs mit Extra-Trick im Ärmel – lesen lohnt sich.',
      en: 'Effect Monsters are the brawlers with an extra trick up their sleeve – worth reading the fine print.',
    },
    relatedTerms: ['ygo-trigger-effect', 'ygo-ignition-effect'],
    exampleCards: ['Red-Eyes Black Dragon'],
  },
  {
    id: 'ygo-ritual-monster',
    category: 'basics',
    term: { de: 'Ritual-Monster', en: 'Ritual Monster' },
    definitionNormal: {
      de: 'Ritual-Monster (blau) liegen zunächst auf der Hand und werden per Ritualzauber beschworen, der Monster von passendem oder höherem Levelwert als Tribut auf den Friedhof schickt.',
      en: 'Ritual Monsters (blue) start in the hand and are Summoned via a Ritual Spell that tributes monsters whose Levels add up to the required amount.',
    },
    definitionTrottel: {
      de: 'Ritual-Monster wollen ein Opfer, bevor sie auftauchen – ein Zauber verbrennt dafür andere Monster als Zutaten.',
      en: 'Ritual Monsters want a sacrifice before they show up – a spell burns other monsters as ingredients.',
    },
    relatedTerms: ['ygo-ritual-spell', 'ygo-ritual-summon'],
    exampleCards: ['Demise, King of Armageddon'],
  },
  {
    id: 'ygo-fusion-monster',
    category: 'basics',
    term: { de: 'Fusions-Monster', en: 'Fusion Monster' },
    definitionNormal: {
      de: 'Fusions-Monster (violett) starten im Extra Deck und werden durch Fusionsbeschwörung aus zwei oder mehr Materialmonstern erschaffen, meist per Fusionszauber.',
      en: 'Fusion Monsters (purple) start in the Extra Deck and are created via Fusion Summon from two or more material monsters, usually through a Fusion Spell.',
    },
    definitionTrottel: {
      de: 'Fusions-Monster sind wie ein Smoothie – zwei Zutaten-Monster rein, ein stärkeres Ergebnis raus.',
      en: 'Fusion Monsters are like a smoothie – toss in two ingredient monsters, get one stronger result out.',
    },
    relatedTerms: ['ygo-fusion-summon', 'ygo-contact-fusion', 'ygo-extra-deck'],
    exampleCards: ['Elemental HERO Flame Wingman'],
  },
  {
    id: 'ygo-synchro-monster',
    category: 'basics',
    term: { de: 'Synchro-Monster', en: 'Synchro Monster' },
    definitionNormal: {
      de: 'Synchro-Monster (weiß) starten im Extra Deck. Ihre Stufe entspricht exakt der Summe der Stufen aller Materialmonster - mindestens ein Tuner-Monster muss darunter sein.',
      en: "Synchro Monsters (white) start in the Extra Deck. Their Level exactly equals the combined Levels of their material monsters - at least one Tuner monster must be among them.",
    },
    definitionTrottel: {
      de: 'Synchro-Monster sind Teamwork in Reinform: ein Tuner stimmt den Rest genau auf die richtige Stufe ab.',
      en: 'Synchro Monsters are teamwork in its purest form: a Tuner tunes the rest to exactly the right Level.',
    },
    relatedTerms: ['ygo-synchro-summon', 'ygo-tuner-monster', 'ygo-extra-deck'],
    exampleCards: ['Stardust Dragon'],
  },
  {
    id: 'ygo-xyz-monster',
    category: 'basics',
    term: { de: 'Xyz-Monster', en: 'Xyz Monster' },
    definitionNormal: {
      de: 'Xyz-Monster (schwarz) starten im Extra Deck und haben statt einer Stufe einen Rang. Sie werden auf gleichstufige Materialmonster gestapelt, die zu Xyz-Material werden.',
      en: 'Xyz Monsters (black) start in the Extra Deck and have a Rank instead of a Level. They\'re stacked on top of same-Level material monsters, which become Xyz Material.',
    },
    definitionTrottel: {
      de: 'Xyz-Monster türmen sich auf ihre Zutaten – die werden zu Treibstoff, den du nach Bedarf verbrauchst.',
      en: 'Xyz Monsters pile up on their ingredients – which become fuel you burn through as needed.',
    },
    relatedTerms: ['ygo-xyz-summon', 'ygo-rank', 'ygo-xyz-material'],
    exampleCards: ['Number 39: Utopia'],
  },
  {
    id: 'ygo-pendulum-monster',
    category: 'basics',
    term: { de: 'Pendel-Monster', en: 'Pendulum Monster' },
    definitionNormal: {
      de: 'Pendel-Monster sind gleichzeitig Hauptdeck- und Extra-Deck-Monster: Sie können normal beschworen werden oder, in der Pendel-Zone platziert, später per Pendelbeschwörung mehrere Monster gleichzeitig aus der Hand holen.',
      en: "Pendulum Monsters are both Main Deck and Extra Deck monsters at once: they can be Summoned normally, or placed in a Pendulum Zone to later Pendulum Summon multiple monsters from the hand at once.",
    },
    definitionTrottel: {
      de: 'Pendel-Monster können zwei Jobs: normal mitspielen, oder als Zauber-Pendel geparkt werden, um später einen ganzen Schwung Monster auf einmal zu holen.',
      en: 'Pendulum Monsters can do two jobs: play normally, or park as a pendulum to later pull a whole bunch of monsters at once.',
    },
    relatedTerms: ['ygo-pendulum-summon', 'ygo-pendulum-scale', 'ygo-pendulum-zone', 'ygo-pendulum-effect'],
    exampleCards: ['Odd-Eyes Pendulum Dragon'],
  },
  {
    id: 'ygo-link-monster',
    category: 'basics',
    term: { de: 'Link-Monster', en: 'Link Monster' },
    definitionNormal: {
      de: 'Link-Monster (dunkelblau) starten im Extra Deck, haben keine DEF und werden per Link-Beschwörung erschaffen. Ihr Link-Rating zeigt an, wie viele Pfeile sie besitzen.',
      en: "Link Monsters (dark blue) start in the Extra Deck, have no DEF, and are created via Link Summon. Their Link Rating shows how many Link Arrows they have.",
    },
    definitionTrottel: {
      de: 'Link-Monster haben keine Verteidigung, dafür Pfeile, die zeigen, wen sie taktisch unterstützen.',
      en: 'Link Monsters skip defense entirely but come with arrows pointing at who they back up tactically.',
    },
    relatedTerms: ['ygo-link-summon', 'ygo-link-rating', 'ygo-link-marker', 'ygo-extra-deck'],
    exampleCards: ['Firewall Dragon'],
  },
  {
    id: 'ygo-attribute',
    category: 'basics',
    term: { de: 'Attribut', en: 'Attribute' },
    definitionNormal: {
      de: 'Jedes Monster hat genau ein Attribut: LICHT, FINSTERNIS, ERDE, WASSER, FEUER, WIND oder GÖTTLICH (nur für wenige legendäre Monster). Viele Karteneffekte beziehen sich darauf.',
      en: 'Every monster has exactly one Attribute: LIGHT, DARK, EARTH, WATER, FIRE, WIND, or DIVINE (only for a handful of legendary monsters). Many card effects care about it.',
    },
    definitionTrottel: {
      de: 'Attribut ist das Element deines Monsters – Feuer, Wasser, Wind und Co. Viele Karten fragen danach.',
      en: "Attribute is your monster's element – fire, water, wind and friends. Lots of cards ask about it.",
    },
    exampleCards: ['Blue-Eyes White Dragon'],
  },
  {
    id: 'ygo-monster-type',
    category: 'basics',
    term: { de: 'Monstertyp (Spezies)', en: 'Monster Type (Species)' },
    definitionNormal: {
      de: 'Zusätzlich zum Attribut hat jedes Monster einen Typ wie Drache, Zauberer, Krieger oder Maschine - die "Spezies" der Karte. Viele Deckarchetypen und Supportkarten drehen sich um einen bestimmten Typ.',
      en: 'On top of its Attribute, every monster has a Type like Dragon, Spellcaster, Warrior, or Machine - the card\'s "species". Many deck archetypes and support cards revolve around a specific Type.',
    },
    definitionTrottel: {
      de: 'Der Typ ist die Berufsgruppe deines Monsters – Drache, Krieger, Maschine und so weiter. Viele Decks bauen genau um eine davon herum.',
      en: "Type is your monster's job category – Dragon, Warrior, Machine and so on. Plenty of decks are built around exactly one of them.",
    },
    exampleCards: ['Dark Magician'],
  },
  {
    id: 'ygo-atk-def',
    category: 'basics',
    term: { de: 'ATK / DEF', en: 'ATK / DEF' },
    definitionNormal: {
      de: 'ATK (Angriffspunkte) bestimmt den Schaden im Angriff, DEF (Verteidigungspunkte) wird nur in Verteidigungsposition relevant. Link-Monster haben keine DEF.',
      en: "ATK (Attack points) determines damage dealt while attacking, DEF (Defense points) only matters in Defense Position. Link Monsters have no DEF at all.",
    },
    definitionTrottel: {
      de: 'ATK ist die Keule, DEF ist der Schild. Link-Monster haben gar keinen Schild dabei.',
      en: "ATK is the club, DEF is the shield. Link Monsters don't even bring a shield.",
    },
    relatedTerms: ['ygo-attack-defense-position'],
  },
  {
    id: 'ygo-level',
    category: 'basics',
    term: { de: 'Stufe (Level)', en: 'Level' },
    definitionNormal: {
      de: 'Die Stufe (1-12 Sterne) bestimmt, ob und wie viele Tribute für die Normalbeschwörung nötig sind, und ist Grundlage für Synchrobeschwörung. Xyz- und Link-Monster haben statt Stufe einen Rang bzw. gar keinen von beidem.',
      en: 'Level (1-12 stars) determines whether and how many tributes a Normal Summon needs, and is the basis for Synchro Summoning. Xyz and Link Monsters have a Rank instead, or neither.',
    },
    definitionTrottel: {
      de: 'Stufe = Sterne oben auf der Karte. Je mehr Sterne, desto mehr musst du meist dafür opfern.',
      en: "Level = the stars on top of the card. More stars usually means more you have to sacrifice for it.",
    },
    relatedTerms: ['ygo-tribute-summon', 'ygo-synchro-summon'],
  },
  {
    id: 'ygo-rank',
    category: 'basics',
    term: { de: 'Rang (Rank)', en: 'Rank' },
    definitionNormal: {
      de: 'Der Rang ersetzt bei Xyz-Monstern die Stufe. Für eine Xyz-Beschwörung werden Materialmonster mit exakt diesem Levelwert benötigt (einige Karten erlauben Ausnahmen).',
      en: "Rank replaces Level for Xyz Monsters. An Xyz Summon needs material monsters at exactly that Level (some cards grant exceptions).",
    },
    definitionTrottel: {
      de: 'Rang ist die Xyz-Version von Stufe – die Materialmonster müssen genau passen, sonst klappt der Turm nicht.',
      en: "Rank is the Xyz version of Level – the material monsters have to match exactly, or the stack doesn't work.",
    },
    relatedTerms: ['ygo-xyz-summon', 'ygo-xyz-material'],
  },
  {
    id: 'ygo-link-rating',
    category: 'basics',
    term: { de: 'Link-Rating & Link-Pfeile', en: 'Link Rating & Link Arrows' },
    definitionNormal: {
      de: 'Das Link-Rating gibt an, wie viele Link-Pfeile ein Link-Monster hat (= wie viele Materialmonster für seine Beschwörung nötig sind). Die Pfeile zeigen auf benachbarte Zonen und bestimmen, welche davon als "co-verlinkt" gelten.',
      en: 'Link Rating shows how many Link Arrows a Link Monster has (= how many material monsters its Summon needs). The arrows point at adjacent zones and determine which of them count as "co-linked".',
    },
    definitionTrottel: {
      de: 'Link-Pfeile sind wie Wegweiser – sie zeigen, wen das Monster taktisch "an der Hand" hat.',
      en: 'Link Arrows are like signposts – they show who the monster is tactically "holding hands" with.',
    },
    relatedTerms: ['ygo-link-summon', 'ygo-co-linked', 'ygo-extra-link'],
  },
  {
    id: 'ygo-pendulum-scale',
    category: 'basics',
    term: { de: 'Pendel-Skala (Pendulum Scale)', en: 'Pendulum Scale' },
    definitionNormal: {
      de: 'Die Pendel-Skala (oben links/rechts auf der Karte) legt fest, welche Stufenbereiche bei einer Pendelbeschwörung aus der Hand kommen dürfen - zwischen den Skalenwerten der beiden Pendel-Monster in der Pendel-Zone.',
      en: 'Pendulum Scale (top-left/right on the card) sets which Level range can be Pendulum Summoned from the hand - between the scale values of the two Pendulum Monsters in the Pendulum Zones.',
    },
    definitionTrottel: {
      de: 'Die Skala steckt den Rahmen ab, was zwischen den beiden Pendeln überhaupt reinpasst.',
      en: 'Scale marks out the window of what even fits between the two pendulums.',
    },
    relatedTerms: ['ygo-pendulum-monster', 'ygo-pendulum-summon', 'ygo-pendulum-zone'],
  },
  {
    id: 'ygo-main-deck',
    category: 'basics',
    term: { de: 'Hauptdeck (Main Deck)', en: 'Main Deck' },
    definitionNormal: {
      de: 'Das Hauptdeck besteht aus 40 bis 60 Karten und enthält alle Monster-, Zauber- und Fallenkarten außer denen im Extra Deck.',
      en: 'The Main Deck consists of 40 to 60 cards and holds every Monster, Spell, and Trap Card except those in the Extra Deck.',
    },
    definitionTrottel: {
      de: 'Das Hauptdeck ist dein normaler Kartenstapel – 40 bis 60 Karten, der Kern deines Decks.',
      en: 'The Main Deck is your regular pile of cards – 40 to 60 cards, the heart of your deck.',
    },
    relatedTerms: ['ygo-extra-deck', 'ygo-side-deck'],
  },
  {
    id: 'ygo-extra-deck',
    category: 'basics',
    term: { de: 'Extra Deck', en: 'Extra Deck' },
    definitionNormal: {
      de: 'Das Extra Deck fasst bis zu 15 Fusions-, Ritual-, Synchro-, Xyz- und Link-Monster, offen hingelegt. Sie starten dort und werden erst durch ihre jeweilige Beschwörungsart ins Spiel gebracht.',
      en: "The Extra Deck holds up to 15 Fusion, Ritual, Synchro, Xyz, and Link Monsters, kept face-up. They start there and only enter play through their respective Summoning method.",
    },
    definitionTrottel: {
      de: 'Das Extra Deck ist die Werkbank für deine Spezial-Monster – die kommen erst per Spezialtrick aufs Feld.',
      en: 'The Extra Deck is the workbench for your special monsters – they only get on the field with the right special trick.',
    },
    relatedTerms: ['ygo-main-deck', 'ygo-fusion-monster', 'ygo-synchro-monster', 'ygo-xyz-monster', 'ygo-link-monster'],
  },
  {
    id: 'ygo-side-deck',
    category: 'basics',
    term: { de: 'Side Deck', en: 'Side Deck' },
    definitionNormal: {
      de: 'Das Side Deck enthält bis zu 15 zusätzliche Karten, die zwischen den Duellen eines Matches gegen Karten aus Haupt- oder Extra Deck eingetauscht werden dürfen.',
      en: "The Side Deck holds up to 15 additional cards that may be swapped in for Main or Extra Deck cards between the Duels of a Match.",
    },
    definitionTrottel: {
      de: 'Das Side Deck ist deine Werkzeugkiste für die Pause – zwischen den Duellen darfst du umbauen.',
      en: "The Side Deck is your halftime toolbox – you get to rebuild between Duels.",
    },
    relatedTerms: ['ygo-main-deck', 'ygo-extra-deck'],
  },
  {
    id: 'ygo-hand',
    category: 'basics',
    term: { de: 'Hand', en: 'Hand' },
    definitionNormal: {
      de: 'Die Hand ist privat - nur die eigene Spielerin sieht ihren Inhalt, außer Effekte erzwingen das Aufdecken.',
      en: 'The Hand is private - only its owner sees its contents, unless an effect forces a reveal.',
    },
    definitionTrottel: {
      de: 'Die Hand ist dein Geheimfach – niemand schaut rein, außer eine Karte zwingt dich dazu.',
      en: 'Your Hand is your secret compartment – nobody looks in unless a card forces you to.',
    },
  },
  {
    id: 'ygo-graveyard',
    category: 'basics',
    term: { de: 'Friedhof (Graveyard/GY)', en: 'Graveyard (GY)' },
    definitionNormal: {
      de: 'Der Friedhof ist ein offener Ablagestapel für zerstörte, als Tribut benutzte, gemillte oder entsorgte Karten. Viele Effekte greifen gezielt auf ihn zu.',
      en: 'The Graveyard is a face-up discard pile for destroyed, tributed, milled, or discarded cards. Plenty of effects interact with it directly.',
    },
    definitionTrottel: {
      de: 'Der Friedhof ist offen einsehbar für alle – dein Mülleimer, in dem trotzdem noch viel brauchbares Zeug liegt.',
      en: "The Graveyard is visible to everyone – your trash can that still has plenty of useful stuff in it.",
    },
    relatedTerms: ['ygo-mill', 'ygo-banished'],
  },
  {
    id: 'ygo-banished',
    category: 'basics',
    term: { de: 'Verbannungszone (Banished)', en: 'Banished Zone' },
    definitionNormal: {
      de: 'Verbannte (früher "aus dem Spiel entfernte") Karten liegen außerhalb des normalen Spielgeschehens und sind für die meisten Friedhof-Effekte unerreichbar.',
      en: 'Banished (formerly "removed from play") cards sit outside the normal flow of the game and are out of reach for most Graveyard-targeting effects.',
    },
    definitionTrottel: {
      de: 'Verbannt heißt: weg vom Feld UND weg vom Friedhof – die meisten "Hol-aus-dem-Friedhof"-Karten können da nicht mehr zugreifen.',
      en: "Banished means gone from the field AND gone from the Graveyard – most 'get it back from the Graveyard' cards can't reach it there.",
    },
    relatedTerms: ['ygo-graveyard'],
  },
  {
    id: 'ygo-field-zone',
    category: 'basics',
    term: { de: 'Feldzauber-Zone (Field Zone)', en: 'Field Zone' },
    definitionNormal: {
      de: 'Die Feldzauber-Zone ist ein eigener Platz für genau eine Feldzauberkarte pro Spielerin, unabhängig von den übrigen Zauber/Fallen-Zonen.',
      en: "The Field Zone is a dedicated slot for exactly one Field Spell per player, separate from the regular Spell & Trap Zones.",
    },
    definitionTrottel: {
      de: 'Die Feldzauber-Zone ist der Sonderplatz fürs Deck-Thema – da passt immer nur ein Feldzauber rein.',
      en: "The Field Zone is the special slot for your deck's theme card – only ever one Field Spell fits there.",
    },
    relatedTerms: ['ygo-field-spell'],
  },
  {
    id: 'ygo-monster-zones',
    category: 'basics',
    term: { de: 'Monsterzonen & Extra Monsterzonen', en: 'Monster Zones & Extra Monster Zones' },
    definitionNormal: {
      de: 'Jede Spielerin hat 5 reguläre Monsterzonen. Dazu kommen 2 geteilte Extra Monsterzonen in der Mitte, die nur von Extra-Deck-Monstern belegt werden dürfen, die über einen Link-Pfeil "freigeschaltet" wurden - oder frei, falls keine Link-Monster im Spiel sind.',
      en: "Each player has 5 regular Monster Zones. There are also 2 shared Extra Monster Zones in the middle, which only Extra Deck monsters may use once 'unlocked' by a Link Arrow - or freely, if no Link Monsters are in play.",
    },
    definitionTrottel: {
      de: 'Die Extra Monsterzonen sind das Niemandsland in der Mitte – ohne Link-Pfeil, der draufzeigt, bleiben sie für Extra-Deck-Monster meist dicht.',
      en: "The Extra Monster Zones are the no-man's-land in the middle – without a Link Arrow pointing at them, they usually stay closed to Extra Deck monsters.",
    },
    relatedTerms: ['ygo-link-rating', 'ygo-extra-link'],
  },
  {
    id: 'ygo-spell-trap-zone',
    category: 'basics',
    term: { de: 'Zauber-/Fallenzonen', en: 'Spell & Trap Zones' },
    definitionNormal: {
      de: 'Jede Spielerin hat 5 Zauber-/Fallenzonen für Normal-, Dauer- und Konterzauber/-fallen sowie Ausrüstungskarten - getrennt von der Feldzauber-Zone.',
      en: "Each player has 5 Spell & Trap Zones for Normal, Continuous, and Counter Spells/Traps, plus Equip Cards - separate from the Field Zone.",
    },
    definitionTrottel: {
      de: 'Die Zauber-/Fallenzonen sind das Regal für alles Grüne und Lila – außer dem einen Sonderfach für Feldzauber.',
      en: "The Spell & Trap Zones are the shelf for everything green and purple – except the one special slot for Field Spells.",
    },
    relatedTerms: ['ygo-field-zone'],
  },
  {
    id: 'ygo-draw-phase',
    category: 'basics',
    term: { de: 'Zugphase (Draw Phase)', en: 'Draw Phase' },
    definitionNormal: {
      de: 'In der Zugphase zieht die aktive Spielerin genau eine Karte (im ersten Zug des Duells entfällt das für die beginnende Spielerin).',
      en: "In the Draw Phase, the turn player draws exactly one card (skipped for whoever goes first in the Duel).",
    },
    definitionTrottel: {
      de: 'Zugphase = eine frische Karte ziehen, fertig. Außer du bist im allerersten Zug.',
      en: "Draw Phase = draw one fresh card, done. Unless it's the very first turn.",
    },
  },
  {
    id: 'ygo-standby-phase',
    category: 'basics',
    term: { de: 'Standby-Phase', en: 'Standby Phase' },
    definitionNormal: {
      de: 'Die Standby-Phase folgt der Zugphase und dient nur dazu, dass bestimmte Karteneffekte ("während der Standby-Phase") überhaupt einen Zeitpunkt zum Auslösen haben.',
      en: 'The Standby Phase follows the Draw Phase and exists mainly so certain card effects ("during the Standby Phase") have a defined moment to trigger.',
    },
    definitionTrottel: {
      de: 'Die Standby-Phase ist eine kurze Verschnaufpause – meist passiert nichts, außer eine Karte sagt explizit "jetzt".',
      en: 'Standby Phase is a short breather – usually nothing happens unless a card explicitly says "now".',
    },
  },
  {
    id: 'ygo-main-phase',
    category: 'basics',
    term: { de: 'Hauptphase 1 & 2', en: 'Main Phase 1 & 2' },
    definitionNormal: {
      de: 'In beiden Hauptphasen dürfen Normal-/Tribut-/Spezialbeschwörungen, Zauber- und Fallenaktivierungen sowie der Wechsel der Kampfposition erfolgen. Hauptphase 1 liegt vor, Hauptphase 2 nach der Kampfphase.',
      en: 'Both Main Phases allow Normal/Tribute/Special Summons, Spell and Trap activations, and Battle Position changes. Main Phase 1 comes before the Battle Phase, Main Phase 2 after it.',
    },
    definitionTrottel: {
      de: 'Hauptphase ist deine Werkbank-Zeit – vor dem Kampf zum Vorbereiten, danach zum Aufräumen.',
      en: "Main Phase is your workbench time – before the fight to set up, after it to clean up.",
    },
    relatedTerms: ['ygo-battle-phase'],
  },
  {
    id: 'ygo-battle-phase',
    category: 'basics',
    term: { de: 'Kampfphase (Battle Phase)', en: 'Battle Phase' },
    definitionNormal: {
      de: 'Die Kampfphase gliedert sich in Start-, Angriffserklärungs-, Schadens- und Endschritt. Nur hier dürfen Angriffe erklärt werden.',
      en: 'The Battle Phase is split into the Start Step, Battle Step, Damage Step, and End Step. Attacks can only be declared here.',
    },
    definitionTrottel: {
      de: 'Die Kampfphase ist der eigentliche Schlagabtausch – alles andere ist nur Vorbereitung dafür.',
      en: 'The Battle Phase is the actual fight – everything else is just setup for it.',
    },
    relatedTerms: ['ygo-damage-step', 'ygo-direct-attack'],
  },
  {
    id: 'ygo-end-phase',
    category: 'basics',
    term: { de: 'Endphase (End Phase)', en: 'End Phase' },
    definitionNormal: {
      de: 'Die Endphase beendet den Zug. Hat eine Spielerin mehr als 6 Handkarten, muss sie bis auf 6 abwerfen, bevor der Zug endet.',
      en: 'The End Phase ends the turn. If a player holds more than 6 cards in hand, they must discard down to 6 before the turn ends.',
    },
    definitionTrottel: {
      de: 'Feierabend – und falls deine Hand zu voll ist, musst du vorher noch aufräumen.',
      en: "Quitting time – and if your hand's too full, you tidy up first.",
    },
  },
  {
    id: 'ygo-attack-defense-position',
    category: 'basics',
    term: { de: 'Angriffs- & Verteidigungsposition', en: 'Attack & Defense Position' },
    definitionNormal: {
      de: 'Ein Monster steht entweder aufrecht in Angriffsposition (ATK zählt im Kampf) oder liegend in Verteidigungsposition (DEF zählt). Normalerweise nur einmal pro Zug wechselbar, außer ein Effekt sagt etwas anderes.',
      en: "A monster is either upright in Attack Position (its ATK counts in battle) or sideways in Defense Position (its DEF counts). Normally changeable only once per turn, unless an effect says otherwise.",
    },
    definitionTrottel: {
      de: 'Stehend = Angriffsmodus, liegend = Schildmodus. Einmal pro Zug darfst du umdrehen.',
      en: "Standing = attack mode, sideways = shield mode. You get one flip per turn.",
    },
    relatedTerms: ['ygo-atk-def', 'ygo-battle-position-change'],
  },
  {
    id: 'ygo-face-up-down',
    category: 'basics',
    term: { de: 'Offen & Verdeckt', en: 'Face-Up & Face-Down' },
    definitionNormal: {
      de: 'Karten können offen (für beide sichtbar) oder verdeckt (nur die Rückseite sichtbar) liegen. Monster dürfen verdeckt in Verteidigungsposition liegen (siehe "Setzen"), Zauber/Fallen verdeckt in ihren Zonen.',
      en: 'Cards can be face-up (visible to both players) or face-down (only the back visible). Monsters may lie face-down in Defense Position (see "Set"), Spells/Traps face-down in their zones.',
    },
    definitionTrottel: {
      de: 'Offen heißt: jeder sieht, was es ist. Verdeckt heißt: Überraschung bleibt gewahrt, bis es zuschlägt.',
      en: "Face-up means everyone sees what it is. Face-down means the surprise stays intact until it strikes.",
    },
    relatedTerms: ['ygo-set-monster'],
  },
];
