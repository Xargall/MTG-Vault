import { HelpTermInput } from '../data/types';

// "Typische Situationen" - concrete, confusing in-game moments, each with a
// step-by-step walkthrough. Mirrors several keyword/format entries with a
// deeper, scenario-based dive (e.g. pokemon-knock-out ->
// pokemon-knockout-prize-procedure), the same short-definition/deep-dive
// pairing the MTG and Yu-Gi-Oh! data already use.
export const HELP_TERMS_POKEMON_SITUATIONS: HelpTermInput[] = [
  {
    id: 'pokemon-mulligan-procedure',
    category: 'situations',
    term: { de: 'Starthand ohne Basis-Pokémon', en: 'Opening Hand With No Basic Pokémon' },
    definitionNormal: {
      de: 'Enthält die Starthand kein einziges Basis-Pokémon, muss sie offen gezeigt, zurückgemischt und neu gezogen werden - das darf sich wiederholen. Für jede so gezeigte Hand darf die Gegnerin eine zusätzliche Karte ziehen.',
      en: 'If the opening hand has no Basic Pokémon at all, it must be revealed, shuffled back in, and redrawn - this can repeat. For each hand revealed this way, the opponent gets to draw one extra card.',
    },
    definitionTrottel: {
      de: 'Kein Basis-Pokémon auf der Hand? Zeigen, zurückmischen, neu ziehen - und der Gegner darf sich dafür eine Bonuskarte ziehen.',
      en: "No Basic Pokémon in hand? Reveal it, shuffle it back, redraw - and the opponent gets a bonus card for it.",
    },
    relatedTerms: ['pokemon-basic-pokemon', 'pokemon-deck'],
    steps: [
      { de: 'Du ziehst deine Starthand von 7 Karten.', en: 'You draw your opening hand of 7 cards.' },
      {
        de: 'Enthält sie ein Basis-Pokémon?',
        en: 'Does it contain a Basic Pokémon?',
        branches: [
          { de: 'Ja: normal weiterspielen.', en: 'Yes: play on normally.' },
          { de: 'Nein: Hand offen zeigen, zurückmischen, neu 7 Karten ziehen.', en: 'No: reveal the hand, shuffle it back, draw a fresh 7.' },
        ],
      },
      { de: 'Das kann sich beliebig oft wiederholen.', en: 'This can repeat as many times as needed.' },
      { de: 'Für jede gezeigte Hand ohne Basis-Pokémon darf die Gegnerin eine Karte extra ziehen.', en: 'For each hand revealed with no Basic Pokémon, the opponent draws one extra card.' },
    ],
  },
  {
    id: 'pokemon-knockout-prize-procedure',
    category: 'situations',
    term: { de: 'Ein Pokémon wird k.o. geschlagen - Schritt für Schritt', en: 'A Pokémon Gets Knocked Out, Step by Step' },
    definitionNormal: {
      de: 'Sobald die Schadensmarken eines Pokémon seine KP erreichen oder übersteigen, geht es sofort K.o., bevor irgendetwas anderes passiert - die Anzahl der Beutekarten hängt vom Regelkasten-Status ab.',
      en: "The moment a Pokémon's damage counters reach or exceed its HP, it's immediately Knocked Out before anything else happens - the number of Prize cards taken depends on its Rule Box status.",
    },
    definitionTrottel: {
      de: 'Volle Schadensanzeige = sofort raus, noch bevor irgendwas anderes passieren kann. Die Beute hängt davon ab, was für eine Karte es war.',
      en: "Full damage meter = out immediately, before anything else can happen. The payout depends on what kind of card it was.",
    },
    relatedTerms: ['pokemon-knock-out', 'pokemon-prize-count-rule'],
    steps: [
      { de: 'Ein Pokémon nimmt Schaden (durch Angriff, Effekt oder Sonderzustand).', en: 'A Pokémon takes damage (from an attack, an effect, or a Special Condition).' },
      { de: 'Schadensmarken erreichen oder übersteigen seine KP.', en: 'Damage counters reach or exceed its HP.' },
      { de: 'Es geht sofort K.o. und wandert mit allem Angelegten in den Ablagestapel.', en: 'It\'s immediately Knocked Out and goes to the Discard Pile along with everything attached.' },
      { de: 'Die k.o. schlagende Spielerin nimmt 1, 2 oder 3 Beutekarten, je nach Art des k.o. geschlagenen Pokémon.', en: "The player who scored the KO takes 1, 2, or 3 Prize cards, depending on the kind of Pokémon that was Knocked Out." },
      { de: 'War es das aktive Pokémon, muss sofort ein neues aus der Bank nachrücken (falls vorhanden).', en: "If it was the Active Pokémon, a new one must immediately move up from the Bench (if any)." },
    ],
  },
  {
    id: 'pokemon-evolution-timing',
    category: 'situations',
    term: { de: 'Wann darf ich entwickeln?', en: 'When Can I Evolve?' },
    definitionNormal: {
      de: 'Ein Pokémon darf nicht in dem Zug entwickelt werden, in dem es ins Spiel kam, und nicht mehrfach im selben Zug. Ausnahme: Effekte wie Rare Candy erlauben, eine Entwicklungsstufe direkt zu überspringen.',
      en: "A Pokémon can't be evolved the turn it entered play, and can't be evolved more than once in the same turn. Exception: effects like Rare Candy let you skip a stage entirely.",
    },
    definitionTrottel: {
      de: 'Frisch hingelegt heißt: diese Runde noch keine Entwicklung. Außer eine Karte wie Rare Candy überspringt die Regel komplett.',
      en: "Freshly played means no evolving this turn. Unless a card like Rare Candy skips the rule entirely.",
    },
    relatedTerms: ['pokemon-evolve', 'pokemon-stage-1', 'pokemon-stage-2'],
    steps: [
      { de: 'Ein Basis-Pokémon ist bereits seit mindestens einem Zug im Spiel.', en: 'A Basic Pokémon has been in play for at least one turn already.' },
      { de: 'Du legst die passende Entwicklungskarte darauf.', en: 'You place the matching evolution card on top of it.' },
      { de: 'Schaden und angelegte Karten bleiben erhalten, die Werte werden aktualisiert.', en: 'Damage and attached cards carry over, stats get updated.' },
      { de: 'Dieses Pokémon kann in diesem Zug nicht nochmal entwickelt werden.', en: "That Pokémon can't be evolved again this turn." },
    ],
  },
  {
    id: 'pokemon-retreat-procedure',
    category: 'situations',
    term: { de: 'Zurückziehen - was genau passiert dabei?', en: 'Retreating - What Exactly Happens?' },
    definitionNormal: {
      de: 'Um zurückzuziehen, wird zuerst so viel Energie wie die Rückzugskosten vom aktiven Pokémon abgeworfen, danach wird es gegen ein Bankpokémon getauscht - solange das aktive Pokémon nicht Asleep oder Paralyzed ist.',
      en: "To retreat, first discard Energy equal to the Retreat Cost from the Active Pokémon, then swap it with a Benched one - as long as the Active Pokémon isn't Asleep or Paralyzed.",
    },
    definitionTrottel: {
      de: 'Erst zahlen (Energie abwerfen), dann tauschen - geht aber nicht, wenn dein aktives Pokémon schläft oder paralysiert ist.',
      en: "Pay first (discard Energy), then swap - but it doesn't work if your Active Pokémon is Asleep or Paralyzed.",
    },
    relatedTerms: ['pokemon-retreat', 'pokemon-retreat-cost'],
    steps: [
      { de: 'Du willst dein aktives Pokémon gegen ein Bankpokémon tauschen.', en: 'You want to swap your Active Pokémon for a Benched one.' },
      {
        de: 'Ist das aktive Pokémon eingeschlafen oder paralysiert?',
        en: 'Is the Active Pokémon Asleep or Paralyzed?',
        branches: [
          { de: 'Ja: Zurückziehen ist nicht möglich.', en: "Yes: retreating isn't possible." },
          { de: 'Nein: die Rückzugskosten in Energie werden abgeworfen.', en: 'No: Energy equal to the Retreat Cost is discarded.' },
        ],
      },
      { de: 'Das aktive und das gewählte Bankpokémon tauschen die Plätze.', en: 'The Active Pokémon and the chosen Benched one swap places.' },
    ],
  },
  {
    id: 'pokemon-special-condition-checkup',
    category: 'situations',
    term: { de: 'Der Pokémon Checkup im Detail', en: 'The Pokémon Checkup in Detail' },
    definitionNormal: {
      de: 'Beim Checkup werden zunächst Vergiftung und Verbrennung als Schaden angewendet, danach die Münzwürfe für Verbrennung (endet bei Kopf) und Schlaf (endet bei Zahl) durchgeführt. Paralyse endet automatisch ohne Münzwurf.',
      en: "At the Checkup, Poison and Burn damage apply first, then the coin flips for Burn (ends on heads) and Asleep (ends on tails) happen. Paralysis ends automatically with no coin flip.",
    },
    definitionTrottel: {
      de: 'Erst kommt der automatische Schaden (Gift, Verbrennung), dann die Münzwürfe - Paralyse braucht gar keinen, die ist eh vorbei.',
      en: "Automatic damage (Poison, Burn) comes first, then the coin flips - Paralysis doesn't even need one, it's over regardless.",
    },
    relatedTerms: ['pokemon-checkup', 'pokemon-special-condition-overview'],
    steps: [
      { de: 'Der Zug endet, der Pokémon Checkup beginnt.', en: 'The turn ends, the Pokémon Checkup begins.' },
      { de: 'Vergiftungsschaden (1 Marke) und Verbrennungsschaden (2 Marken) werden zugefügt.', en: 'Poison damage (1 counter) and Burn damage (2 counters) are applied.' },
      { de: 'Für Verbrennung wird gemünzt: Kopf = endet, Zahl = bleibt.', en: 'A coin is flipped for Burn: heads ends it, tails it stays.' },
      { de: 'Für Schlaf wird gemünzt: Zahl = wacht auf, Kopf = bleibt eingeschlafen.', en: 'A coin is flipped for Asleep: tails wakes it up, heads it stays Asleep.' },
      { de: 'Paralyse endet automatisch, ohne Münzwurf.', en: 'Paralysis ends automatically, no coin flip needed.' },
    ],
  },
  {
    id: 'pokemon-active-knocked-out-no-bench',
    category: 'situations',
    term: { de: 'Aktives Pokémon k.o., keine Bank übrig', en: 'Active Pokémon Knocked Out With an Empty Bench' },
    definitionNormal: {
      de: 'Geht das aktive Pokémon K.o. und es gibt kein Bankpokémon, das nachrücken könnte, verliert die betroffene Spielerin das Spiel sofort - unabhängig vom Stand der Beutekarten.',
      en: "If the Active Pokémon is Knocked Out and there's no Benched Pokémon to move up, that player loses the game immediately - regardless of how many Prize cards remain.",
    },
    definitionTrottel: {
      de: 'Kein Ersatz auf der Bank, wenn\'s den letzten Kämpfer erwischt? Spiel sofort verloren - egal wie viele Beutekarten noch übrig sind.',
      en: "No backup on the bench when your last fighter goes down? Game over immediately - no matter how many Prize cards are left.",
    },
    relatedTerms: ['pokemon-win-conditions', 'pokemon-knock-out', 'pokemon-bench'],
    steps: [
      { de: 'Das aktive Pokémon geht K.o.', en: "The Active Pokémon is Knocked Out." },
      {
        de: 'Gibt es ein Pokémon auf der Bank?',
        en: 'Is there a Pokémon on the Bench?',
        branches: [
          { de: 'Ja: eines muss sofort als neues aktives Pokémon gewählt werden.', en: 'Yes: one must immediately be chosen as the new Active Pokémon.' },
          { de: 'Nein: das Spiel ist sofort verloren.', en: 'No: the game is lost immediately.' },
        ],
      },
    ],
  },
  {
    id: 'pokemon-deck-out-loss',
    category: 'situations',
    term: { de: 'Kein Nachziehen möglich (Deck-Out)', en: 'Unable to Draw (Deck-Out)' },
    definitionNormal: {
      de: 'Muss eine Spielerin zu Beginn ihres Zuges ziehen und ihr Deck ist leer, verliert sie das Spiel sofort an diesem Punkt - unabhängig vom Stand der Beutekarten oder der übrigen Pokémon.',
      en: "If a player needs to draw at the start of their turn and their deck is empty, they lose the game immediately at that point - regardless of Prize cards or remaining Pokémon.",
    },
    definitionTrottel: {
      de: 'Kein Deck mehr zum Ziehen? Spiel sofort vorbei, egal wie gut du sonst dastehst.',
      en: "No deck left to draw from? Game over right there, no matter how good your board looks otherwise.",
    },
    relatedTerms: ['pokemon-deck', 'pokemon-win-conditions'],
    steps: [
      { de: 'Ein neuer Zug beginnt, die Spielerin muss ziehen.', en: 'A new turn begins, the player must draw.' },
      {
        de: 'Ist das Deck leer?',
        en: 'Is the deck empty?',
        branches: [
          { de: 'Nein: normal weiterziehen.', en: 'No: draw and continue normally.' },
          { de: 'Ja: die Spielerin verliert das Spiel sofort.', en: 'Yes: the player loses the game immediately.' },
        ],
      },
    ],
  },
  {
    id: 'pokemon-gx-vstar-once-per-game',
    category: 'situations',
    term: { de: 'Mehrere GX-/VSTAR-Pokémon im selben Deck', en: 'Multiple GX/VSTAR Pokémon in the Same Deck' },
    definitionNormal: {
      de: 'Das Einmal-pro-Spiel-Limit gilt für die Spielerin, nicht für ein einzelnes Pokémon: Sobald irgendein GX-Angriff genutzt wurde, darf kein weiteres GX-Pokémon im selben Deck in diesem Spiel noch einen GX-Angriff nutzen (gleiches Prinzip bei VSTAR Power).',
      en: "The once-per-game limit applies to the player, not a single Pokémon: once any GX attack has been used, no other GX Pokémon in that deck may use a GX attack for the rest of that game (same principle for VSTAR Power).",
    },
    definitionTrottel: {
      de: 'Das Limit gilt fürs ganze Deck, nicht nur für eine Karte – einmal benutzt, ist der Joker für den Rest des Spiels komplett weg.',
      en: "The limit covers your whole deck, not just one card – use it once, and that wildcard is gone for the entire rest of the game.",
    },
    relatedTerms: ['pokemon-gx-attack', 'pokemon-vstar-power'],
    steps: [
      { de: 'Dein Deck enthält mehrere verschiedene GX-Pokémon.', en: 'Your deck has several different GX Pokémon.' },
      { de: 'Eines davon nutzt seinen GX-Angriff - der Marker wird gesetzt/gedreht.', en: 'One of them uses its GX attack - the marker is set/flipped.' },
      { de: 'Ab jetzt darf KEIN GX-Pokémon in diesem Spiel mehr einen GX-Angriff nutzen, auch kein anderes.', en: "From now on, NO GX Pokémon may use a GX attack for the rest of the game, not even a different one." },
    ],
  },
  {
    id: 'pokemon-stadium-one-at-a-time',
    category: 'situations',
    term: { de: 'Zwei Stadium-Karten gleichzeitig?', en: 'Two Stadium Cards at Once?' },
    definitionNormal: {
      de: 'Spielt eine Spielerin eine neue Stadium-Karte, während bereits eine im Spiel ist (egal von wem), wird die alte sofort in den Ablagestapel ihrer Besitzerin gelegt - es gibt nie mehr als eine Stadium-Karte gleichzeitig im Spiel.',
      en: "If a player plays a new Stadium while one is already in play (no matter whose), the old one is immediately discarded to its owner's Discard Pile - there's never more than one Stadium in play at once.",
    },
    definitionTrottel: {
      de: 'Neues Stadium rein heißt: das alte fliegt sofort raus, egal wem es gehörte.',
      en: "New Stadium in means the old one flies straight out, no matter whose it was.",
    },
    relatedTerms: ['pokemon-stadium-card'],
    steps: [
      { de: 'Eine Stadium-Karte liegt bereits im Spiel.', en: 'A Stadium card is already in play.' },
      { de: 'Eine Spielerin spielt eine neue Stadium-Karte.', en: 'A player plays a new Stadium card.' },
      { de: 'Die alte Stadium-Karte wird sofort in den Ablagestapel ihrer Besitzerin gelegt.', en: "The old Stadium card is immediately discarded to its owner's Discard Pile." },
      { de: 'Die neue Stadium-Karte gilt ab jetzt für beide Spielerinnen.', en: 'The new Stadium card now applies to both players.' },
    ],
  },
  {
    id: 'pokemon-energy-attachment-once-per-turn',
    category: 'situations',
    term: { de: 'Mehr als eine Energie pro Zug anlegen', en: 'Attaching More Than One Energy per Turn' },
    definitionNormal: {
      de: 'Die "eine Energie pro Zug"-Grenze gilt nur für das manuelle Anlegen von der Hand. Fähigkeiten, Items oder Supporter, die Energie anlegen, zählen separat und dürfen zusätzlich zur manuellen Anlage genutzt werden.',
      en: 'The "one Energy per turn" limit only applies to manually attaching from hand. Abilities, Items, or Supporters that attach Energy count separately and can be used in addition to the manual attachment.',
    },
    definitionTrottel: {
      de: 'Die Ein-Energie-Grenze gilt nur fürs Anlegen von Hand - alles, was eine Karte zusätzlich erlaubt, zählt separat.',
      en: "The one-Energy limit only covers attaching from hand - anything a card grants on top of that counts separately.",
    },
    relatedTerms: ['pokemon-attach-energy'],
    steps: [
      { de: 'Du legst eine Energiekarte von der Hand an - die manuelle Grenze für diesen Zug ist aufgebraucht.', en: "You attach an Energy card from hand - your manual limit for this turn is used up." },
      { de: 'Eine Fähigkeit, ein Item oder Supporter legt zusätzlich Energie an.', en: 'An Ability, Item, or Supporter attaches additional Energy.' },
      { de: 'Das zählt nicht gegen die manuelle Ein-pro-Zug-Grenze, da es eine eigene Quelle ist.', en: "That doesn't count against the manual one-per-turn limit, since it's its own separate source." },
    ],
  },
  {
    id: 'pokemon-ace-spec-one-copy',
    category: 'situations',
    term: { de: 'ACE SPEC in der Praxis', en: 'ACE SPEC in Practice' },
    definitionNormal: {
      de: 'Auch wenn eine Karte normalerweise die 4-Kopien-Grenze hätte - trägt sie den ACE SPEC-Hinweis, zählt nur eine einzige Kopie im gesamten Deck, Haupt- wie Nebeneffekt-Slot eingeschlossen.',
      en: 'Even if a card would normally allow up to 4 copies - if it carries the ACE SPEC marker, only a single copy is allowed in the entire deck, full stop.',
    },
    definitionTrottel: {
      de: 'ACE SPEC schlägt die normale 4er-Regel - egal was sonst gilt, hier ist nach einer Kopie Schluss.',
      en: "ACE SPEC overrides the normal 4-copy rule - whatever else applies, it caps at one copy here.",
    },
    relatedTerms: ['pokemon-ace-spec-rule', 'pokemon-deck-construction-rules'],
    steps: [
      { de: 'Du willst eine Karte mit ACE SPEC-Markierung ins Deck aufnehmen.', en: 'You want to include a card with the ACE SPEC marker in your deck.' },
      { de: 'Prüfe: enthält das Deck bereits eine andere ACE SPEC-Karte?', en: 'Check: does the deck already contain a different ACE SPEC card?' },
      {
        de: 'Ist das der Fall?',
        en: 'Is that the case?',
        branches: [
          { de: 'Nein: die Karte darf als eine Kopie ins Deck.', en: 'No: the card may go in as one copy.' },
          { de: 'Ja: eine zweite ACE SPEC-Karte ist nicht erlaubt, egal welche.', en: "Yes: a second ACE SPEC card isn't allowed, whichever it is." },
        ],
      },
    ],
  },
];
