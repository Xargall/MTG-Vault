import { HelpTermInput } from '../data/types';

// Card supertypes/subtypes, stats, zones and turn structure - the Pokémon
// equivalent of data/basics.ts (MTG) and data-ygo/basics.ts (Yu-Gi-Oh!).
// IDs prefixed `pokemon-` throughout data-pokemon/ so they stay unique
// against the MTG/YGO data files in the combined HELP_TERMS list (see
// help-terms.ts/help-terms.spec.ts). No exampleCards on these entries - see
// CLAUDE.md's Hilfe/Lexikon section for why (no DB mirror for Pokémon yet,
// unlike MTG/Yu-Gi-Oh!, so batch image lookups are an untested live-API
// load risk).
export const HELP_TERMS_POKEMON_BASICS: HelpTermInput[] = [
  {
    id: 'pokemon-card-type-pokemon',
    category: 'basics',
    term: { de: 'Kartentyp: Pokémon-Karte', en: 'Card Type: Pokémon Card' },
    definitionNormal: {
      de: 'Pokémon-Karten sind die Kämpfer - sie haben KP, Angriffe, oft eine Schwäche/Resistenz und Rückzugskosten.',
      en: 'Pokémon Cards are the fighters - they have HP, Attacks, often a Weakness/Resistance, and a Retreat Cost.',
    },
    definitionTrottel: {
      de: 'Pokémon-Karten sind deine Kämpfer – alles, was auf dem Spielfeld tatsächlich kloppt.',
      en: 'Pokémon Cards are your fighters – anything that actually throws punches on the field.',
    },
    relatedTerms: ['pokemon-hp', 'pokemon-card-type-trainer', 'pokemon-card-type-energy'],
  },
  {
    id: 'pokemon-card-type-trainer',
    category: 'basics',
    term: { de: 'Kartentyp: Trainerkarte', en: 'Card Type: Trainer Card' },
    definitionNormal: {
      de: 'Trainerkarten unterstützen deine Pokémon. Unterarten: Item, Supporter, Stadium, Pokémon-Tool - jede mit eigenen Regeln, wie oft sie pro Zug gespielt werden darf.',
      en: 'Trainer Cards support your Pokémon. Subtypes: Item, Supporter, Stadium, Pokémon Tool - each with its own rules for how often it can be played per turn.',
    },
    definitionTrottel: {
      de: 'Trainerkarten sind dein Werkzeugkasten – alles, was keine Energie und kein Pokémon ist, fällt hier rein.',
      en: "Trainer Cards are your toolbox – anything that isn't an Energy or a Pokémon falls into this bucket.",
    },
    relatedTerms: ['pokemon-item', 'pokemon-supporter', 'pokemon-stadium-card', 'pokemon-tool'],
  },
  {
    id: 'pokemon-card-type-energy',
    category: 'basics',
    term: { de: 'Kartentyp: Energiekarte', en: 'Card Type: Energy Card' },
    definitionNormal: {
      de: 'Energiekarten werden an Pokémon angelegt und bezahlen die Energiekosten von Angriffen. Unterarten: Basis-Energie (ein Typ) und Spezial-Energie (oft mit Zusatzeffekt/-einschränkung).',
      en: "Energy Cards attach to Pokémon and pay the Energy cost of Attacks. Subtypes: Basic Energy (one type) and Special Energy (often with a bonus effect or restriction).",
    },
    definitionTrottel: {
      de: 'Energiekarten sind der Sprit – ohne die geht bei Angriffen gar nichts.',
      en: "Energy Cards are the fuel – without them, Attacks go nowhere.",
    },
    relatedTerms: ['pokemon-basic-energy', 'pokemon-special-energy'],
  },
  {
    id: 'pokemon-basic-pokemon',
    category: 'basics',
    term: { de: 'Basis-Pokémon', en: 'Basic Pokémon' },
    definitionNormal: {
      de: 'Ein Basis-Pokémon kann direkt aus der Hand ins Spiel gebracht werden, ohne dass dafür etwas Anderes schon auf dem Feld liegen muss. Jedes Deck braucht mindestens eines.',
      en: "A Basic Pokémon can be played straight from hand with nothing else needing to already be in play. Every deck needs at least one.",
    },
    definitionTrottel: {
      de: 'Basis-Pokémon sind der Startpunkt – die darfst du jederzeit einfach so hinlegen.',
      en: 'Basic Pokémon are the starting point – you can just plop them down any time.',
    },
    relatedTerms: ['pokemon-stage-1', 'pokemon-mulligan-procedure'],
  },
  {
    id: 'pokemon-stage-1',
    category: 'basics',
    term: { de: 'Stufe 1-Pokémon (Stage 1)', en: 'Stage 1 Pokémon' },
    definitionNormal: {
      de: 'Ein Stufe-1-Pokémon entwickelt sich aus dem passenden Basis-Pokémon, das dafür bereits (seit mindestens einem Zug) im Spiel sein muss.',
      en: 'A Stage 1 Pokémon evolves from the matching Basic Pokémon, which must already be in play (for at least one turn).',
    },
    definitionTrottel: {
      de: 'Stufe 1 ist das Upgrade – das passende Basis-Pokémon muss schon eine Weile auf dem Feld stehen.',
      en: "Stage 1 is the upgrade – the matching Basic has to already be sitting on the field for a bit.",
    },
    relatedTerms: ['pokemon-basic-pokemon', 'pokemon-evolution-timing'],
  },
  {
    id: 'pokemon-stage-2',
    category: 'basics',
    term: { de: 'Stufe 2-Pokémon (Stage 2)', en: 'Stage 2 Pokémon' },
    definitionNormal: {
      de: 'Ein Stufe-2-Pokémon entwickelt sich aus dem passenden Stufe-1-Pokémon - die volle Entwicklungskette Basis → Stufe 1 → Stufe 2 muss also durchlaufen werden.',
      en: 'A Stage 2 Pokémon evolves from the matching Stage 1 Pokémon - so the full evolution chain Basic → Stage 1 → Stage 2 has to be followed.',
    },
    definitionTrottel: {
      de: 'Stufe 2 ist die Endstufe – erst Basis, dann Stufe 1, dann endlich das volle Potenzial.',
      en: "Stage 2 is the final form – Basic first, then Stage 1, then finally the full glow-up.",
    },
    relatedTerms: ['pokemon-stage-1', 'pokemon-evolution-timing'],
  },
  {
    id: 'pokemon-ex',
    category: 'basics',
    term: { de: 'Pokémon-ex / EX', en: 'Pokémon ex / EX' },
    definitionNormal: {
      de: 'Pokémon-ex gibt es in zwei unabhängigen Epochen mit demselben Namen: großgeschrieben "EX" (2003-2007, Ruby & Sapphire-Ära) und das moderne, kleingeschriebene "ex" (ab 2023, Scarlet & Violet-Ära). Beide sind stärkere Pokémon mit einem weißen Regelkasten-Text und geben bei K.o. dem Gegner zwei Beutekarten statt einer.',
      en: 'Pokémon ex exist in two unrelated eras sharing the same name: capitalized "EX" (2003-2007, Ruby & Sapphire era) and the modern, lowercase "ex" (2023 onward, Scarlet & Violet era). Both are stronger Pokémon with a white rule-box text, giving the opponent two Prize cards instead of one when Knocked Out.',
    },
    definitionTrottel: {
      de: 'ex/EX-Pokémon sind die aufgemotzten Versionen – stärker, aber wer sie k.o. schlägt, zieht gleich zwei Beutekarten statt einer.',
      en: 'ex/EX Pokémon are the souped-up versions – stronger, but knocking one out nets the opponent two Prize cards instead of one.',
    },
    relatedTerms: ['pokemon-rule-box', 'pokemon-prize-cards', 'pokemon-knockout-prize-procedure'],
  },
  {
    id: 'pokemon-gx',
    category: 'basics',
    term: { de: 'Pokémon-GX', en: 'Pokémon-GX' },
    definitionNormal: {
      de: 'Pokémon-GX (2017-2019, Sun & Moon-Ära) tragen einen zusätzlichen, besonders starken GX-Angriff, der pro Spiel nur einmal benutzt werden darf. Bei K.o. gibt es zwei Beutekarten.',
      en: 'Pokémon-GX (2017-2019, Sun & Moon era) carry an extra, especially powerful GX attack that can only be used once per game. Getting Knocked Out gives up two Prize cards.',
    },
    definitionTrottel: {
      de: 'GX-Pokémon haben einen Mega-Angriff, den du dir für den einen perfekten Moment aufsparst – nur einmal pro Spiel.',
      en: 'GX Pokémon pack a mega-attack you save for the one perfect moment – only once per game.',
    },
    relatedTerms: ['pokemon-gx-attack', 'pokemon-tag-team-gx', 'pokemon-rule-box'],
  },
  {
    id: 'pokemon-tag-team-gx',
    category: 'basics',
    term: { de: 'Tag Team-GX', en: 'Tag Team GX' },
    definitionNormal: {
      de: 'Tag Team-GX-Karten zeigen zwei (oder mehr) Pokémon auf einer Karte mit kombinierten Werten. Sie geben bei K.o. drei Beutekarten statt zwei.',
      en: 'Tag Team GX cards depict two (or more) Pokémon on one card with combined stats. Getting Knocked Out gives up three Prize cards instead of two.',
    },
    definitionTrottel: {
      de: 'Tag Team-GX ist ein Zweier-Team auf einer Karte - entsprechend teuer wird\'s für den Gegner, wenn es fällt: drei Beutekarten.',
      en: "Tag Team GX is a two-for-one card - and it costs the opponent accordingly if it falls: three Prize cards.",
    },
    relatedTerms: ['pokemon-gx', 'pokemon-knockout-prize-procedure'],
  },
  {
    id: 'pokemon-v',
    category: 'basics',
    term: { de: 'Pokémon V', en: 'Pokémon V' },
    definitionNormal: {
      de: 'Pokémon V (ab 2020, Sword & Shield-Ära) sind durchgehend stärkere Pokémon mit weißem Regelkasten-Text. Bei K.o. gibt es zwei Beutekarten.',
      en: 'Pokémon V (2020 onward, Sword & Shield era) are consistently stronger Pokémon with a white rule-box text. Getting Knocked Out gives up two Prize cards.',
    },
    definitionTrottel: {
      de: 'Pokémon V sind die durchgehend aufgewerteten Karten der aktuellen Ära – stärker, aber auch wertvoller für den Gegner, falls sie fallen.',
      en: "Pokémon V are the consistently upgraded cards of the current era – stronger, but worth more to the opponent if they fall.",
    },
    relatedTerms: ['pokemon-vmax', 'pokemon-vstar', 'pokemon-rule-box'],
  },
  {
    id: 'pokemon-vmax',
    category: 'basics',
    term: { de: 'Pokémon VMAX', en: 'Pokémon VMAX' },
    definitionNormal: {
      de: 'Ein Pokémon VMAX entwickelt sich aus dem passenden Pokémon V und ist besonders stark. Bei K.o. gibt es drei Beutekarten.',
      en: 'A Pokémon VMAX evolves from the matching Pokémon V and is especially powerful. Getting Knocked Out gives up three Prize cards.',
    },
    definitionTrottel: {
      de: 'VMAX ist die XXL-Version von V - entsprechend teuer für den Gegner, wenn sie fällt: drei Beutekarten.',
      en: "VMAX is the XXL version of V - and it costs the opponent accordingly if it falls: three Prize cards.",
    },
    relatedTerms: ['pokemon-v', 'pokemon-knockout-prize-procedure'],
  },
  {
    id: 'pokemon-vstar',
    category: 'basics',
    term: { de: 'Pokémon VSTAR', en: 'Pokémon VSTAR' },
    definitionNormal: {
      de: 'Ein Pokémon VSTAR entwickelt sich aus dem passenden Pokémon V und trägt eine VSTAR Power (Angriff oder Fähigkeit), die pro Spiel nur einmal nutzbar ist. Bei K.o. gibt es zwei Beutekarten.',
      en: 'A Pokémon VSTAR evolves from the matching Pokémon V and carries a VSTAR Power (an attack or ability) usable only once per game. Getting Knocked Out gives up two Prize cards.',
    },
    definitionTrottel: {
      de: 'VSTAR bringt die GX-Idee zurück – ein besonderer Move, den du dir für den entscheidenden Moment aufsparst.',
      en: "VSTAR brings back the GX idea – one special move you save for the decisive moment.",
    },
    relatedTerms: ['pokemon-v', 'pokemon-vstar-power'],
  },
  {
    id: 'pokemon-prime',
    category: 'basics',
    term: { de: 'Pokémon Prime (historisch)', en: 'Pokémon Prime (Historical)' },
    definitionNormal: {
      de: 'Pokémon Prime (2010-2011, HeartGold & SoulSilver-Ära) waren besonders starke Versionen bekannter Pokémon mit goldener Namensumrandung, ohne eigenen Regelkasten-Text und ohne Bonus-Beutekarten.',
      en: 'Pokémon Prime (2010-2011, HeartGold & SoulSilver era) were especially powerful versions of familiar Pokémon with a gold-bordered name, no rule-box text, and no bonus Prize cards.',
    },
    definitionTrottel: {
      de: 'Pokémon Prime waren die "Director\'s Cut"-Version bekannter Pokémon – stark, aber ohne den Beutekarten-Malus von EX & Co.',
      en: "Pokémon Prime were the 'director's cut' versions of familiar Pokémon – strong, but without the Prize-card penalty EX and friends carry.",
    },
  },
  {
    id: 'pokemon-legend',
    category: 'basics',
    term: { de: 'Pokémon LEGEND (historisch)', en: 'Pokémon LEGEND (Historical)' },
    definitionNormal: {
      de: 'Pokémon LEGEND (2010-2011) bestanden aus zwei Kartenhälften, die nur zusammen (beide im Spiel) als ein einziges Pokémon funktionierten.',
      en: 'Pokémon LEGEND (2010-2011) consisted of two card halves that only worked as a single Pokémon when both were in play together.',
    },
    definitionTrottel: {
      de: 'LEGEND-Pokémon waren Puzzle-Karten – erst beide Hälften zusammen ergeben ein ganzes Pokémon.',
      en: 'LEGEND Pokémon were puzzle cards – only both halves together make a whole Pokémon.',
    },
  },
  {
    id: 'pokemon-break',
    category: 'basics',
    term: { de: 'Pokémon BREAK (historisch)', en: 'Pokémon BREAK (Historical)' },
    definitionNormal: {
      de: 'Ein Pokémon BREAK (2015-2016) wurde quer über das darunterliegende Pokémon gelegt (keine reguläre Entwicklung) und behielt dessen Fähigkeiten/Schaden, bekam aber zusätzliche Werte/Angriffe.',
      en: 'A Pokémon BREAK (2015-2016) was placed sideways over the Pokémon underneath it (not a regular evolution), keeping its abilities/damage while gaining extra stats/attacks.',
    },
    definitionTrottel: {
      de: 'BREAK-Pokémon wurden quer über das alte Pokémon gelegt wie ein Aufsatz – alles Alte blieb, kam aber oben drauf noch was dazu.',
      en: 'BREAK Pokémon got laid sideways over the old one like an add-on – everything old stayed, plus something extra on top.',
    },
  },
  {
    id: 'pokemon-radiant',
    category: 'basics',
    term: { de: 'Radiant-Pokémon', en: 'Radiant Pokémon' },
    definitionNormal: {
      de: 'Radiant-Pokémon (ab 2022) sind besonders seltene, starke Varianten - pro Deck ist nur ein einziges Radiant-Pokémon erlaubt, unabhängig vom Namen.',
      en: 'Radiant Pokémon (2022 onward) are especially rare, powerful variants - only a single Radiant Pokémon is allowed per deck, regardless of name.',
    },
    definitionTrottel: {
      de: 'Radiant-Pokémon sind der eine Glanzpunkt im Deck – mehr als eines geht gar nicht, egal welches.',
      en: 'Radiant Pokémon are the one showpiece in your deck – you literally can\'t run more than one, whichever it is.',
    },
  },
  {
    id: 'pokemon-restored',
    category: 'basics',
    term: { de: 'Wiederhergestelltes Pokémon (Restored)', en: 'Restored Pokémon' },
    definitionNormal: {
      de: 'Ein wiederhergestelltes Pokémon (z. B. aus einem Fossil) wird über eine spezielle Trainerkarte oder einen entsprechenden Fossil-Effekt statt durch normale Entwicklung ins Spiel gebracht.',
      en: "A Restored Pokémon (e.g. from a Fossil) enters play via a special Trainer card or matching Fossil effect, instead of through regular evolution.",
    },
    definitionTrottel: {
      de: 'Wiederhergestellte Pokémon kommen aus dem Fossil statt aus der normalen Entwicklungskette.',
      en: 'Restored Pokémon come from a Fossil instead of the usual evolution chain.',
    },
  },
  {
    id: 'pokemon-shining-crystal',
    category: 'basics',
    term: { de: 'Shining- & Crystal-Pokémon (historisch)', en: 'Shining & Crystal Pokémon (Historical)' },
    definitionNormal: {
      de: 'Shining-Pokémon (Neo-Ära, 2000-2002) und Crystal-Pokémon (EX-Ära, 2006-2007) waren seltene Glanz-/Sonderversionen bekannter Pokémon mit eigenem Artwork-Stil - Vorläufer heutiger Alt-Art-Karten.',
      en: 'Shining Pokémon (Neo era, 2000-2002) and Crystal Pokémon (EX era, 2006-2007) were rare shiny/special versions of familiar Pokémon with their own art style - forerunners of today\'s alt-art cards.',
    },
    definitionTrottel: {
      de: 'Shining- und Crystal-Pokémon waren die Ur-Glanzkarten – Vorfahren der heutigen Alt-Art-Chase-Karten.',
      en: 'Shining and Crystal Pokémon were the original shiny cards – ancestors of today\'s alt-art chase cards.',
    },
  },
  {
    id: 'pokemon-lvx',
    category: 'basics',
    term: { de: 'Pokémon LV.X (historisch)', en: 'Pokémon LV.X (Historical)' },
    definitionNormal: {
      de: 'Pokémon LV.X (2007-2009, Diamond & Pearl-Ära) wurden wie ein Trainer-Item quer über ein passendes Pokémon der gleichen Art gelegt (keine reguläre Entwicklung), um es "aufzuleveln" und stärkere Werte/Fähigkeiten zu verleihen.',
      en: 'Pokémon LV.X (2007-2009, Diamond & Pearl era) were placed sideways over a matching same-species Pokémon like a Trainer item (not a regular evolution), "leveling it up" with stronger stats/abilities.',
    },
    definitionTrottel: {
      de: 'LV.X war Level-Up per Kartenauflage – wie ein Item, das das passende Pokémon quer überdeckt und stärker macht.',
      en: 'LV.X was a level-up by card overlay – like an item laid sideways over the matching Pokémon to power it up.',
    },
  },
  {
    id: 'pokemon-item',
    category: 'basics',
    term: { de: 'Item-Karte', en: 'Item Card' },
    definitionNormal: {
      de: 'Item-Karten sind Trainerkarten ohne Mengenbeschränkung pro Zug - so viele wie gewünscht dürfen pro Zug gespielt werden (sofern das Deck genug Kopien enthält).',
      en: 'Item cards are Trainer cards with no per-turn limit - as many as you like can be played in a single turn (as long as your deck has that many copies).',
    },
    definitionTrottel: {
      de: 'Items sind die Spiel-so-viele-du-willst-Karten – keine Begrenzung pro Zug.',
      en: 'Items are the play-as-many-as-you-want cards – no per-turn cap.',
    },
    relatedTerms: ['pokemon-card-type-trainer'],
  },
  {
    id: 'pokemon-supporter',
    category: 'basics',
    term: { de: 'Supporter-Karte', en: 'Supporter Card' },
    definitionNormal: {
      de: 'Supporter-Karten sind die mächtigsten Trainerkarten - deshalb darf normalerweise nur eine pro Zug gespielt werden.',
      en: 'Supporter cards are the most powerful Trainer cards - which is why normally only one can be played per turn.',
    },
    definitionTrottel: {
      de: 'Supporter sind die starken Karten mit eingebauter Bremse – nur eine pro Zug.',
      en: 'Supporters are the strong cards with a built-in speed limit – only one per turn.',
    },
    relatedTerms: ['pokemon-card-type-trainer'],
  },
  {
    id: 'pokemon-stadium-card',
    category: 'basics',
    term: { de: 'Stadium-Karte', en: 'Stadium Card' },
    definitionNormal: {
      de: 'Eine Stadium-Karte bleibt nach dem Spielen dauerhaft im Spiel und wirkt für beide Spieler. Es darf immer nur eine einzige Stadium-Karte gleichzeitig im Spiel sein - egal von wem.',
      en: "A Stadium card stays in play once played and affects both players. Only one Stadium card may be in play at a time - no matter whose it is.",
    },
    definitionTrottel: {
      de: 'Stadium-Karten verändern die Spielumgebung für beide – und es passt immer nur eine gleichzeitig rein.',
      en: 'Stadium cards change the playing field for both players – and only ever one fits at a time.',
    },
    relatedTerms: ['pokemon-stadium-one-at-a-time'],
  },
  {
    id: 'pokemon-tool',
    category: 'basics',
    term: { de: 'Pokémon-Tool', en: 'Pokémon Tool' },
    definitionNormal: {
      de: 'Ein Pokémon-Tool wird an ein Pokémon angelegt und wirkt dauerhaft, solange es dort bleibt - normalerweise nur ein Tool pro Pokémon, sofern nichts anderes angegeben ist.',
      en: "A Pokémon Tool attaches to a Pokémon and keeps working as long as it stays there - normally only one Tool per Pokémon, unless stated otherwise.",
    },
    definitionTrottel: {
      de: 'Tools sind das Upgrade für ein Pokémon – normalerweise nur eines gleichzeitig pro Pokémon.',
      en: 'Tools are the upgrade for a Pokémon – normally only one at a time per Pokémon.',
    },
  },
  {
    id: 'pokemon-basic-energy',
    category: 'basics',
    term: { de: 'Basis-Energie', en: 'Basic Energy' },
    definitionNormal: {
      de: 'Basis-Energiekarten liefern genau einen Energietyp (z. B. Feuer), haben keinen eigenen Zusatztext und unterliegen - anders als sonstige Karten - keiner 4-Kopien-Grenze pro Deck.',
      en: "Basic Energy cards provide exactly one Energy type (e.g. Fire), carry no extra text, and - unlike other cards - aren't subject to the 4-copy-per-deck limit.",
    },
    definitionTrottel: {
      de: 'Basis-Energie ist der schnöde, aber unbegrenzte Treibstoff – von der darfst du so viele reinpacken, wie du willst.',
      en: 'Basic Energy is the plain but unlimited fuel – pack in as many as you like.',
    },
    relatedTerms: ['pokemon-deck-construction-rules'],
  },
  {
    id: 'pokemon-special-energy',
    category: 'basics',
    term: { de: 'Spezial-Energie', en: 'Special Energy' },
    definitionNormal: {
      de: 'Spezial-Energiekarten liefern Energie mit einem Zusatzeffekt oder einer Einschränkung (z. B. mehrere Typen gleichzeitig, oder ein Bonus/Malus) und unterliegen wie normale Karten der 4-Kopien-Grenze.',
      en: 'Special Energy cards provide Energy with a bonus effect or restriction (e.g. multiple types at once, or a perk/drawback) and, like regular cards, are subject to the 4-copy limit.',
    },
    definitionTrottel: {
      de: 'Spezial-Energie ist Premium-Treibstoff mit Extra-Trick - dafür gilt wieder die normale 4er-Grenze.',
      en: "Special Energy is premium fuel with an extra trick - but the normal 4-copy cap applies again.",
    },
  },
  {
    id: 'pokemon-hp',
    category: 'basics',
    term: { de: 'KP (Hit Points)', en: 'HP (Hit Points)' },
    definitionNormal: {
      de: 'KP zeigen, wie viel Schaden ein Pokémon aushält, bevor es K.o. geht. Schadensmarken werden gesammelt, bis ihre Summe die KP erreicht oder übersteigt.',
      en: "HP shows how much damage a Pokémon can take before it's Knocked Out. Damage counters pile up until their total reaches or exceeds HP.",
    },
    definitionTrottel: {
      de: 'KP sind die Lebensleiste – voller Balken an Schadensmarken, und das Pokémon ist weg.',
      en: "HP is the health bar – fill it up with damage counters and the Pokémon's gone.",
    },
  },
  {
    id: 'pokemon-weakness',
    category: 'basics',
    term: { de: 'Schwäche (Weakness)', en: 'Weakness' },
    definitionNormal: {
      de: 'Trifft ein Angriff ein Pokémon mit passender Schwäche, wird der Schaden üblicherweise verdoppelt (×2) - der genaue Multiplikator steht auf der Karte.',
      en: "If an attack hits a Pokémon with a matching Weakness, the damage is usually doubled (×2) - the exact multiplier is printed on the card.",
    },
    definitionTrottel: {
      de: 'Schwäche ist der wunde Punkt – trifft der richtige Typ, hagelt\'s doppelten Schaden.',
      en: 'Weakness is the sore spot – hit it with the right type and the damage doubles.',
    },
    relatedTerms: ['pokemon-resistance'],
  },
  {
    id: 'pokemon-resistance',
    category: 'basics',
    term: { de: 'Resistenz (Resistance)', en: 'Resistance' },
    definitionNormal: {
      de: 'Trifft ein Angriff ein Pokémon mit passender Resistenz, wird der Schaden meist um einen festen Betrag (häufig -30) reduziert, steht aber genau auf der Karte.',
      en: "If an attack hits a Pokémon with a matching Resistance, damage is usually reduced by a fixed amount (often -30), exactly as printed on the card.",
    },
    definitionTrottel: {
      de: 'Resistenz ist die eingebaute Rüstung – trifft der richtige Typ, gibt\'s einen festen Rabatt auf den Schaden.',
      en: 'Resistance is built-in armor – hit it with the right type and damage gets a fixed discount.',
    },
    relatedTerms: ['pokemon-weakness'],
  },
  {
    id: 'pokemon-retreat-cost',
    category: 'basics',
    term: { de: 'Rückzugskosten (Retreat Cost)', en: 'Retreat Cost' },
    definitionNormal: {
      de: 'Die Rückzugskosten geben an, wie viele Energiekarten abgeworfen werden müssen, um das aktive Pokémon mit einem Bankpokémon zu tauschen.',
      en: "Retreat Cost shows how many Energy cards must be discarded to swap the Active Pokémon with a Benched one.",
    },
    definitionTrottel: {
      de: 'Rückzugskosten sind der Preis fürs Verschwinden – so viel Energie musst du abwerfen, um auszutauschen.',
      en: 'Retreat Cost is the price of vanishing – that much Energy gets discarded to swap out.',
    },
    relatedTerms: ['pokemon-retreat-procedure'],
  },
  {
    id: 'pokemon-deck',
    category: 'basics',
    term: { de: 'Deck', en: 'Deck' },
    definitionNormal: {
      de: 'Das Deck besteht aus genau 60 Karten und liegt verdeckt bereit. Muss am Beginn eines Zuges gezogen werden und ist es leer, verliert man sofort.',
      en: 'A deck consists of exactly 60 cards, kept face-down. Drawing is required at the start of each turn, and an empty deck means an immediate loss.',
    },
    definitionTrottel: {
      de: 'Das Deck ist dein Vorrat – genau 60 Karten, und ist er leer, verlierst du automatisch.',
      en: "The deck is your stockpile – exactly 60 cards, and running out means an automatic loss.",
    },
    relatedTerms: ['pokemon-deck-out-loss'],
  },
  {
    id: 'pokemon-hand',
    category: 'basics',
    term: { de: 'Hand', en: 'Hand' },
    definitionNormal: {
      de: 'Die Hand ist privat - nur die eigene Spielerin sieht ihren Inhalt, außer ein Effekt erzwingt das Aufdecken.',
      en: 'The Hand is private - only its owner sees its contents, unless an effect forces a reveal.',
    },
    definitionTrottel: {
      de: 'Die Hand ist dein Geheimfach – niemand schaut rein, außer eine Karte zwingt dich dazu.',
      en: 'Your Hand is your secret compartment – nobody looks in unless a card forces you to.',
    },
  },
  {
    id: 'pokemon-discard-pile',
    category: 'basics',
    term: { de: 'Ablagestapel (Discard Pile)', en: 'Discard Pile' },
    definitionNormal: {
      de: 'Der Ablagestapel ist ein offener Stapel für benutzte Items/Supporter/Stadien, verbrauchte Energie, abgeworfene Karten und k.o. geschlagene Pokémon.',
      en: 'The Discard Pile is a face-up pile for used Items/Supporters/Stadiums, used-up Energy, discarded cards, and Knocked Out Pokémon.',
    },
    definitionTrottel: {
      de: 'Der Ablagestapel ist offen einsehbar – dein Mülleimer, in dem trotzdem viele Effekte noch rumstöbern.',
      en: 'The Discard Pile is visible to everyone – your trash can that plenty of effects still dig through.',
    },
  },
  {
    id: 'pokemon-prize-cards',
    category: 'basics',
    term: { de: 'Beutekarten (Prize Cards)', en: 'Prize Cards' },
    definitionNormal: {
      de: 'Zu Spielbeginn werden 6 Karten verdeckt als Beutekarten beiseitegelegt. Für jedes k.o. geschlagene gegnerische Pokémon nimmt man eine oder mehrere davon auf die Hand (Anzahl je nach Pokémon-Art). Wer alle Beutekarten aufgenommen hat, gewinnt.',
      en: 'At the start of the game, 6 cards are set aside face-down as Prize cards. Each time an opposing Pokémon is Knocked Out, one or more are taken into hand (how many depends on the Pokémon\'s kind). Taking all Prize cards wins the game.',
    },
    definitionTrottel: {
      de: 'Beutekarten sind deine Siegtreppe – 6 Stück, und für jedes besiegte gegnerische Pokémon steigst du eine oder mehrere Stufen hoch.',
      en: 'Prize cards are your staircase to victory – 6 of them, and every opposing Pokémon you take down climbs you one or more steps.',
    },
    relatedTerms: ['pokemon-knockout-prize-procedure', 'pokemon-win-conditions'],
  },
  {
    id: 'pokemon-active-spot',
    category: 'basics',
    term: { de: 'Aktivplatz (Active Spot)', en: 'Active Spot' },
    definitionNormal: {
      de: 'Der Aktivplatz ist die eine Position, von der aus ein Pokémon angreifen und angegriffen werden kann. Jede Spielerin hat genau einen.',
      en: "The Active Spot is the one position a Pokémon can attack and be attacked from. Each player has exactly one.",
    },
    definitionTrottel: {
      de: 'Der Aktivplatz ist der Ring – nur wer dort steht, darf kämpfen und wird angegriffen.',
      en: 'The Active Spot is the ring – only whoever stands there fights and gets hit.',
    },
    relatedTerms: ['pokemon-bench', 'pokemon-retreat-procedure'],
  },
  {
    id: 'pokemon-bench',
    category: 'basics',
    term: { de: 'Bank (Bench)', en: 'Bench' },
    definitionNormal: {
      de: 'Die Bank hält bis zu 5 Pokémon (Standardregel) in Reserve - sie können nicht angreifen oder angegriffen werden, außer durch wenige Spezialeffekte.',
      en: 'The Bench holds up to 5 Pokémon (standard rule) in reserve - they can\'t attack or be attacked, except via a handful of special effects.',
    },
    definitionTrottel: {
      de: 'Die Bank ist deine Reservebank – sicher geparkt, bis sie gebraucht werden.',
      en: 'The Bench is your reserve lineup – parked safely until needed.',
    },
    relatedTerms: ['pokemon-active-spot'],
  },
  {
    id: 'pokemon-lost-zone',
    category: 'basics',
    term: { de: 'Verlorene Zone (Lost Zone)', en: 'Lost Zone' },
    definitionNormal: {
      de: 'Die Verlorene Zone ist eine eigene Zone außerhalb des Ablagestapels - Karten, die dorthin wandern, sind für den Rest des Spiels komplett unerreichbar, auch für Effekte, die sonst auf den Ablagestapel zugreifen.',
      en: "The Lost Zone is its own zone outside the Discard Pile - cards sent there are completely unreachable for the rest of the game, even for effects that otherwise interact with the Discard Pile.",
    },
    definitionTrottel: {
      de: 'Die Verlorene Zone ist wirklich verloren – anders als der Ablagestapel kommt da nichts mehr raus.',
      en: "The Lost Zone is truly lost – unlike the Discard Pile, nothing comes back out of there.",
    },
  },
  {
    id: 'pokemon-win-conditions',
    category: 'basics',
    term: { de: 'Siegbedingungen', en: 'Win Conditions' },
    definitionNormal: {
      de: 'Man gewinnt, indem man alle Beutekarten aufgenommen hat, oder wenn die gegnerische Spielerin kein einziges Pokémon mehr im Spiel hat, oder wenn die Gegnerin zu Zugbeginn nicht ziehen kann (leeres Deck).',
      en: "You win by taking all your Prize cards, or if the opponent has no Pokémon left in play at all, or if the opponent can't draw at the start of their turn (empty deck).",
    },
    definitionTrottel: {
      de: 'Du gewinnst auf drei Arten: alle Beutekarten abgeräumt, dem Gegner gehen die Pokémon aus, oder der Gegner kann nicht mehr ziehen.',
      en: "You win three ways: clear out all your Prize cards, the opponent runs out of Pokémon, or the opponent can't draw anymore.",
    },
    relatedTerms: ['pokemon-prize-cards', 'pokemon-active-knocked-out-no-bench', 'pokemon-deck-out-loss'],
  },
  {
    id: 'pokemon-turn-structure',
    category: 'basics',
    term: { de: 'Zugablauf', en: 'Turn Structure' },
    definitionNormal: {
      de: 'Ein Zug beginnt mit Ziehen einer Karte, danach folgen beliebig viele Aktionen in beliebiger Reihenfolge (Pokémon spielen/entwickeln, Trainer spielen, Energie anlegen, zurückziehen), und endet optional mit genau einem Angriff.',
      en: 'A turn starts with drawing a card, followed by any number of actions in any order (playing/evolving Pokémon, playing Trainers, attaching Energy, retreating), and optionally ends with exactly one attack.',
    },
    definitionTrottel: {
      de: 'Erst ziehen, dann machst du so viel du willst in beliebiger Reihenfolge, und am Ende darfst du einmal angreifen.',
      en: "Draw first, then do as much as you want in any order, and finish with one attack if you want.",
    },
  },
];
