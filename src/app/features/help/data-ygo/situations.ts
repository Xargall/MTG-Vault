import { HelpTermInput } from '../data/types';

// "Typische Situationen" - concrete, confusing in-game moments, each with a
// step-by-step walkthrough. Mirrors several keyword entries with a deeper,
// scenario-based dive (e.g. ygo-chain -> ygo-chain-resolution-order), the
// same short-definition/deep-dive pairing the MTG data already uses.
export const HELP_TERMS_YGO_SITUATIONS: HelpTermInput[] = [
  {
    id: 'ygo-chain-resolution-order',
    category: 'situations',
    term: { de: 'Eine Chain auflösen', en: 'Resolving a Chain' },
    definitionNormal: {
      de: 'Reagiert ein Spieler auf eine Aktivierung mit einer weiteren, entsteht eine Chain. Sie löst sich komplett in umgekehrter Reihenfolge auf - der letzte Chain Link zuerst, der erste zuletzt.',
      en: 'When a player responds to an activation with another, a Chain forms. It resolves completely in reverse order - the last Chain Link first, the first Chain Link last.',
    },
    definitionTrottel: {
      de: 'Wie beim Teller-Stapel: der zuletzt obendrauf gelegte Zauber/Falle löst sich zuerst auf.',
      en: 'Just like a stack of plates: whatever Spell/Trap went on top last resolves first.',
    },
    relatedTerms: ['ygo-chain', 'ygo-chain-link'],
    steps: [
      { de: 'Eine Karte wird aktiviert (Chain Link 1).', en: 'A card is activated (Chain Link 1).' },
      { de: 'Ein anderer Spieler reagiert mit einer weiteren Aktivierung (Chain Link 2).', en: 'Another player responds with another activation (Chain Link 2).' },
      { de: 'Das kann sich beliebig oft fortsetzen (Chain Link 3, 4, ...).', en: 'This can keep going (Chain Link 3, 4, ...).' },
      { de: 'Niemand reagiert mehr - die Chain ist komplett.', en: 'Nobody responds further - the Chain is complete.' },
      { de: 'Sie löst sich von hinten nach vorn auf: zuletzt aktiviert, zuerst aufgelöst.', en: 'It resolves back to front: last activated, first resolved.' },
    ],
    exampleCards: ['Solemn Judgment'],
  },
  {
    id: 'ygo-negate-summon-vs-effect',
    category: 'situations',
    term: { de: 'Beschwörung negieren vs. Effekt negieren', en: 'Negating a Summon vs. an Effect' },
    definitionNormal: {
      de: 'Wird eine Spezialbeschwörung selbst negiert, kommt das Monster gar nicht erst ins Spiel (es geht dahin zurück, wo es vorher war). Wird stattdessen nur ein Effekt des bereits beschworenen Monsters negiert, bleibt das Monster einfach auf dem Feld stehen.',
      en: "If a Special Summon itself is negated, the monster never actually enters play (it goes back to wherever it came from). If instead only an effect of an already-Summoned monster is negated, the monster simply stays on the field.",
    },
    definitionTrottel: {
      de: 'Beschwörung negiert = das Monster kommt gar nicht erst durch die Tür. Effekt negiert = es steht schon drin, nur seine Ansage verpufft.',
      en: "Summon negated = the monster never even makes it through the door. Effect negated = it's already standing there, only its announcement fizzles.",
    },
    relatedTerms: ['ygo-special-summon', 'ygo-negate'],
    steps: [
      { de: 'Ein Monster wird spezialbeschworen oder eine seiner Fähigkeiten ausgelöst/aktiviert.', en: 'A monster is Special Summoned, or one of its abilities is triggered/activated.' },
      {
        de: 'Wird die Beschwörung oder der Effekt negiert?',
        en: 'Is it the Summon or the effect that gets negated?',
        branches: [
          { de: 'Beschwörung negiert: das Monster kommt nie aufs Feld.', en: 'Summon negated: the monster never hits the field.' },
          { de: 'Effekt negiert: das Monster bleibt auf dem Feld, nur sein Effekt verpufft.', en: "Effect negated: the monster stays on the field, only its effect fizzles." },
        ],
      },
    ],
  },
  {
    id: 'ygo-destroy-banish-bounce-distinction',
    category: 'situations',
    term: { de: 'Zerstört, verbannt oder zurückgelegt - was zählt wofür?', en: 'Destroyed, Banished, or Returned - What Counts for What?' },
    definitionNormal: {
      de: 'Effekte mit Bedingung "wenn diese Karte zerstört wird" lösen bei Verbannung, Rückgabe auf die Hand/ins Deck oder Tribut-Verwendung NICHT aus - diese Aktionen sind jeweils eigene, verschiedene Vorgänge, keine Zerstörung.',
      en: "Effects conditioned on 'if this card is destroyed' do NOT trigger if the card is banished, returned to hand/deck, or used as a tribute instead - each of those is its own distinct action, not destruction.",
    },
    definitionTrottel: {
      de: 'Nur "zerstört" zählt als "zerstört". Verbannt, zurückgelegt oder als Tribut benutzt ist jeweils etwas komplett anderes.',
      en: 'Only "destroyed" counts as "destroyed". Banished, bounced, or tributed are each their own separate thing entirely.',
    },
    relatedTerms: ['ygo-destroy', 'ygo-banished'],
    steps: [
      { de: 'Eine Karte mit "wenn diese Karte zerstört wird"-Effekt verlässt das Feld.', en: "A card with a 'when this card is destroyed' effect leaves the field." },
      {
        de: 'Wie genau hat sie das Feld verlassen?',
        en: 'How exactly did it leave the field?',
        branches: [
          { de: 'Durch Zerstörung (Kampf oder Effekt): der Effekt löst aus.', en: 'Via destruction (battle or effect): the effect triggers.' },
          { de: 'Verbannt, zurückgelegt oder als Tribut benutzt: der Effekt löst NICHT aus.', en: 'Banished, bounced, or tributed: the effect does NOT trigger.' },
        ],
      },
    ],
  },
  {
    id: 'ygo-direct-attack-conditions',
    category: 'situations',
    term: { de: 'Wann darf ich direkt angreifen?', en: 'When Can I Attack Directly?' },
    definitionNormal: {
      de: 'Ein direkter Angriff gegen die gegnerische Spielerin ist normalerweise nur möglich, wenn sie zum Zeitpunkt der Angriffserklärung kein einziges Monster kontrolliert - oder ein Karteneffekt es ausdrücklich erlaubt (z. B. Toon-Monster).',
      en: "A direct attack against the opposing player is normally only possible if they control zero monsters at the moment the attack is declared - or a card effect explicitly allows it (e.g. Toon monsters).",
    },
    definitionTrottel: {
      de: 'Kein Monster beim Gegner? Dann darfst du direkt auf die Lebenspunkte zielen. Sonst brauchst du eine Karte, die das extra erlaubt.',
      en: "No monster on the opponent's side? Then you can aim straight for their life points. Otherwise you need a card that specifically allows it.",
    },
    relatedTerms: ['ygo-direct-attack'],
    steps: [
      { de: 'Die Kampfphase beginnt, du willst angreifen.', en: 'The Battle Phase begins, you want to attack.' },
      {
        de: 'Kontrolliert der Gegner Monster?',
        en: 'Does the opponent control any monsters?',
        branches: [
          { de: 'Nein: du darfst direkt angreifen.', en: "No: you may attack directly." },
          { de: 'Ja: nur mit einem Effekt, der das explizit erlaubt.', en: 'Yes: only with an effect that explicitly allows it.' },
        ],
      },
    ],
  },
  {
    id: 'ygo-priority-chain-building',
    category: 'situations',
    term: { de: 'Wie entsteht eigentlich eine Chain?', en: 'How Does a Chain Actually Start?' },
    definitionNormal: {
      de: 'Nach jeder Aktivierung bekommt zuerst der Gegner die Möglichkeit, mit einem Quick-Effekt, einer Falle oder einem Schnellzauber zu reagieren, bevor die ursprüngliche Karte sich auflöst. Reagiert niemand, löst sich die oberste (letzte) Aktivierung auf.',
      en: "After any activation, the opponent gets the first chance to respond with a Quick Effect, Trap, or Quick-Play Spell before the original card resolves. If nobody responds, the topmost (most recent) activation resolves.",
    },
    definitionTrottel: {
      de: 'Jedes Mal, wenn jemand was aktiviert, darf der andere kurz reagieren, bevor überhaupt was passiert. Erst wenn beide "nein danke" sagen, geht\'s weiter.',
      en: "Every time someone activates something, the other player gets a brief chance to respond before anything actually happens. Only once both say 'nothing from me' does it move on.",
    },
    relatedTerms: ['ygo-chain', 'ygo-quick-effect', 'ygo-counter-trap'],
    steps: [
      { de: 'Ein Spieler aktiviert eine Karte oder einen Effekt.', en: 'A player activates a card or effect.' },
      { de: 'Der andere Spieler darf mit einem Spell-Speed-2/3-Effekt reagieren (Falle, Schnellzauber, Quick-Effekt, Konterfalle).', en: 'The other player may respond with a Spell Speed 2/3 effect (Trap, Quick-Play Spell, Quick Effect, Counter Trap).' },
      { de: 'Reagiert niemand mehr, löst sich die zuletzt hinzugefügte Aktivierung zuerst auf.', en: 'Once nobody responds further, the most recently added activation resolves first.' },
    ],
  },
  {
    id: 'ygo-damage-step-walkthrough',
    category: 'situations',
    term: { de: 'Der Schadensschritt - was geht noch, was nicht mehr?', en: 'The Damage Step - What Still Works, What Doesn\'t?' },
    definitionNormal: {
      de: 'Sobald der Schadensschritt beginnt, dürfen keine neuen Beschwörungen, Zauber oder normalen Fallen mehr aktiviert werden. Nur Effekte mit der Formulierung "während des Schadensberechnung" oder vergleichbare dürfen hier noch eingreifen.',
      en: 'Once the Damage Step begins, no new Summons, Spells, or regular Traps may be activated. Only effects worded "during damage calculation" or similar may still intervene at this point.',
    },
    definitionTrottel: {
      de: 'Sobald der Schadensschritt läuft, ist die Tür für die meisten Tricks zu - nur ganz wenige Spezial-Effekte dürfen hier noch reinfunken.',
      en: "Once the Damage Step is running, the door is shut on most tricks – only a handful of special effects can still sneak in here.",
    },
    relatedTerms: ['ygo-damage-step', 'ygo-battle-phase'],
    steps: [
      { de: 'Angriff wird erklärt, Blocker (falls vorhanden) wird bestimmt.', en: 'Attack is declared, a blocker (if any) is determined.' },
      { de: 'Vor dem Schadensschritt: letzte Chance für reguläre Zauber/Fallen/Monstereffekte.', en: 'Before the Damage Step: last chance for regular Spells/Traps/monster effects.' },
      { de: 'Der Schadensschritt beginnt - ATK/DEF werden final festgelegt.', en: 'The Damage Step begins - ATK/DEF are finalized.' },
      { de: 'Nur noch Effekte mit "während der Schadensberechnung" dürfen eingreifen.', en: "Only effects worded 'during damage calculation' may still intervene." },
      { de: 'Schaden wird berechnet und zugefügt.', en: 'Damage is calculated and dealt.' },
    ],
  },
  {
    id: 'ygo-fusion-material-cost-timing',
    category: 'situations',
    term: { de: 'Wann genau werden Fusions-Materialmonster verbraucht?', en: 'Exactly When Are Fusion Materials Used Up?' },
    definitionNormal: {
      de: 'Die Materialmonster werden als Kosten bezahlt, sobald der Fusionszauber aktiviert wird - noch bevor er sich auflöst. Sie zählen von diesem Moment an bereits als "als Fusionsmaterial verwendet", unabhängig davon, ob der Zauber am Ende negiert wird.',
      en: "The material monsters are paid as a cost the moment the Fusion Spell is activated - before it even resolves. They already count as 'used as Fusion Material' from that point on, regardless of whether the spell later gets negated.",
    },
    definitionTrottel: {
      de: 'Die Zutaten-Monster werden schon beim Ansagen verbrannt, nicht erst wenn der Zauber sich auflöst - selbst wenn der Zauber danach negiert wird, bleiben sie verbrannt.',
      en: "The ingredient monsters get burned the moment you announce the spell, not when it resolves - even if the spell gets negated afterward, they stay burned.",
    },
    relatedTerms: ['ygo-fusion-summon', 'ygo-fusion-material', 'ygo-cost-vs-condition'],
    steps: [
      { de: 'Der Fusionszauber wird aktiviert.', en: 'The Fusion Spell is activated.' },
      { de: 'Die Materialmonster werden sofort als Kosten auf den Friedhof gelegt.', en: 'The material monsters are immediately sent to the Graveyard as a cost.' },
      { de: 'Der Zauber steht nun auf der Chain, bereit zur Auflösung.', en: 'The spell now sits on the Chain, ready to resolve.' },
      { de: 'Wird der Zauber negiert, bleiben die Materialmonster trotzdem im Friedhof - die Kosten sind schon bezahlt.', en: "If the spell gets negated, the material monsters stay in the Graveyard anyway - the cost was already paid." },
    ],
  },
  {
    id: 'ygo-xyz-detach-timing',
    category: 'situations',
    term: { de: 'Xyz-Material ablösen - wann und wie?', en: 'Detaching Xyz Material - When and How?' },
    definitionNormal: {
      de: 'Ablösen von Xyz-Material ist meist eine Kosten (sofort bezahlt, nicht negierbar). Abgelöstes Material wandert auf den Friedhof und gilt zu diesem Zeitpunkt als "verlassen das Feld" - gleichzeitig mit jedem anderen in diesem Moment abgelösten Material.',
      en: "Detaching Xyz Material is usually a cost (paid immediately, can't be negated). Detached material goes to the Graveyard and counts as 'leaving the field' at that moment - simultaneously with any other material detached at the same time.",
    },
    definitionTrottel: {
      de: 'Ablösen ist Kosten zahlen, nicht verhandelbar - das Material ist sofort weg, egal was danach mit dem restlichen Effekt passiert.',
      en: "Detaching is paying a cost, not up for debate – the material is gone immediately, no matter what happens with the rest of the effect afterward.",
    },
    relatedTerms: ['ygo-xyz-material', 'ygo-cost-vs-condition'],
    steps: [
      { de: 'Ein Effekt verlangt "löse ein Xyz-Material ab" als Kosten.', en: "An effect requires 'detach an Xyz Material' as its cost." },
      { de: 'Das Xyz-Material wird sofort auf den Friedhof gelegt.', en: 'The Xyz Material is immediately sent to the Graveyard.' },
      { de: 'Der Effekt wird aktiviert und auf die Chain gelegt.', en: 'The effect is activated and placed on the Chain.' },
      { de: 'Selbst falls der Effekt später negiert wird, bleibt das Material im Friedhof - die Kosten sind bereits bezahlt.', en: 'Even if the effect is later negated, the material stays in the Graveyard - the cost was already paid.' },
    ],
  },
  {
    id: 'ygo-link-summon-requirements',
    category: 'situations',
    term: { de: 'Link-Beschwörung - Material UND Zone müssen passen', en: 'Link Summon - Both Material AND Zone Must Fit' },
    definitionNormal: {
      de: 'Für eine Link-Beschwörung reicht es nicht, nur genug Materialmonster zu haben - das Link-Monster muss auch in eine Zone gelegt werden, auf die ein bereits auf dem Feld befindliches Link-Monster mit einem seiner Pfeile zeigt (oder in eine reguläre Monsterzone, falls keine Zonenbeschränkung greift).',
      en: "A Link Summon isn't just about having enough material - the Link Monster must also be placed into a zone that an already-placed Link Monster points at with one of its arrows (or into a regular Monster Zone when no such restriction applies).",
    },
    definitionTrottel: {
      de: 'Genug Material zu haben reicht nicht - du brauchst auch den richtigen Platz dafür, auf den ein Pfeil zeigt.',
      en: "Having enough material isn't enough - you also need the right spot for it, one an arrow is actually pointing at.",
    },
    relatedTerms: ['ygo-link-summon', 'ygo-link-marker', 'ygo-monster-zones'],
    steps: [
      { de: 'Du willst ein Link-Monster beschwören.', en: 'You want to Link Summon a monster.' },
      { de: 'Prüfe: hast du genug Materialmonster laut Materialbedingung?', en: 'Check: do you have enough material monsters per the material condition?' },
      { de: 'Prüfe: gibt es eine gültige Zone, in die es gelegt werden kann (ggf. durch einen Link-Pfeil freigeschaltet)?', en: 'Check: is there a valid zone to place it in (possibly unlocked by a Link Arrow)?' },
      { de: 'Nur wenn beides zutrifft, kann die Link-Beschwörung durchgeführt werden.', en: 'Only if both are true can the Link Summon actually happen.' },
    ],
  },
  {
    id: 'ygo-may-vs-must-effect',
    category: 'situations',
    term: { de: '"Kann"- vs. Pflicht-Effekte', en: '"May" vs. Mandatory Effects' },
    definitionNormal: {
      de: 'Ein Pflicht-Effekt ("...zerstöre...") muss, sofern aktivierbar/auslösbar, ausgeführt bzw. aktiviert werden. Ein "Kann"-Effekt ("...kannst du...") lässt der kontrollierenden Spielerin die Wahl, in dem Moment, in dem er greifen würde.',
      en: "A mandatory effect ('...destroy...') must be activated/applied whenever it's possible to. A 'may' effect ('...you can...') leaves the choice to its controller, right at the moment it would apply.",
    },
    definitionTrottel: {
      de: 'Pflicht heißt: muss sein, wenn\'s geht. "Kannst du" heißt: du entscheidest in dem Moment, ob überhaupt.',
      en: "Mandatory means it has to happen if it can. 'You can' means you decide right then whether it happens at all.",
    },
    steps: [
      { de: 'Ein Effekt wird auslösbar/aktivierbar.', en: 'An effect becomes triggerable/activatable.' },
      {
        de: 'Ist der Effekt Pflicht oder ein "Kann"?',
        en: 'Is the effect mandatory, or a "may"?',
        branches: [
          { de: 'Pflicht: muss aktiviert/ausgeführt werden, sofern möglich.', en: 'Mandatory: must be activated/applied whenever possible.' },
          { de: '"Kann": die Spielerin entscheidet jetzt, ob überhaupt.', en: '"May": the player decides right now whether it happens at all.' },
        ],
      },
    ],
  },
  {
    id: 'ygo-replay-scenario',
    category: 'situations',
    term: { de: 'Ein Replay in der Praxis', en: 'A Replay in Practice' },
    definitionNormal: {
      de: 'Greift ein Monster an und wird der Blocker vor der Schadensberechnung noch zerstört (z. B. durch eine Falle), darf die angreifende Spielerin neu entscheiden, ob und wen sie angreift - der Angriff selbst zählt aber weiterhin als bereits erklärter Angriff dieses Monsters in diesem Zug.',
      en: "If a monster attacks and the blocker gets destroyed before damage calculation (e.g. by a Trap), the attacking player gets to re-decide whether and whom to attack - but the attack still counts as that monster's attack for the turn.",
    },
    definitionTrottel: {
      de: 'Stirbt der Verteidiger vorzeitig, darfst du dir nochmal überlegen, ob und wen du angreifst - zählt aber trotzdem als der eine Angriff für diese Runde.',
      en: "If the defender dies early, you get to reconsider whether and whom to attack - but it still counts as that one attack for the turn.",
    },
    relatedTerms: ['ygo-replay'],
    steps: [
      { de: 'Ein Monster erklärt einen Angriff, ein Blocker wird festgelegt.', en: 'A monster declares an attack, a blocker is determined.' },
      { de: 'Vor der Schadensberechnung wird der Blocker (oder der Angreifer) zerstört/entfernt.', en: "Before damage calculation, the blocker (or the attacker) is destroyed/removed." },
      { de: 'Die Zahl der Angreifer/Verteidiger hat sich geändert - ein Replay wird ausgelöst.', en: 'The number of attackers/defenders has changed - a Replay is triggered.' },
      { de: 'Die angreifende Spielerin darf neu entscheiden, ob und wen sie angreift.', en: 'The attacking player may re-decide whether and whom to attack.' },
    ],
  },
  {
    id: 'ygo-tribute-summon-cost-timing',
    category: 'situations',
    term: { de: 'Tribut-Beschwörung Schritt für Schritt', en: 'Tribute Summon, Step by Step' },
    definitionNormal: {
      de: 'Bei einer Tribut-Beschwörung werden zuerst die Tributmonster gewählt und sofort auf den Friedhof gelegt (Kosten), erst danach erscheint das neue Monster - das Tribut lässt sich also nicht mehr zurücknehmen, selbst wenn die Beschwörung danach noch verhindert wird.',
      en: 'In a Tribute Summon, the tribute monsters are chosen and immediately sent to the Graveyard first (the cost); only afterward does the new monster appear - so the tribute can\'t be undone, even if the Summon itself gets stopped afterward.',
    },
    definitionTrottel: {
      de: 'Erst werden die Opfer verbrannt, dann erst kommt das neue Monster - die Opfer kriegst du nicht zurück, selbst wenn danach noch was schiefgeht.',
      en: "The sacrifices get burned first, the new monster shows up after - you don't get them back even if something goes wrong afterward.",
    },
    relatedTerms: ['ygo-tribute-summon', 'ygo-cost-vs-condition'],
    steps: [
      { de: 'Du wählst ein Monster der Stufe 5+ zur Normalbeschwörung.', en: 'You choose a Level 5+ monster for your Normal Summon.' },
      { de: 'Du wählst die nötige Anzahl Tributmonster (1 für Stufe 5-6, 2 für Stufe 7+).', en: 'You choose the required number of tribute monsters (1 for Level 5-6, 2 for Level 7+).' },
      { de: 'Die Tributmonster werden sofort auf den Friedhof gelegt.', en: 'The tribute monsters are immediately sent to the Graveyard.' },
      { de: 'Erst jetzt wird das neue Monster auf das Feld gelegt.', en: 'Only now is the new monster placed onto the field.' },
    ],
  },
];
