import { HelpTermInput } from './types';

// "Typische Situationen" - concrete, confusing in-game moments, each with a
// step-by-step walkthrough. Content verified against current official
// rules text (see CLAUDE.md for the damage-assignment Foundations note).
export const HELP_TERMS_SITUATIONS: HelpTermInput[] = [
  {
    id: 'stack-resolution',
    category: 'situations',
    term: { de: 'Stack-Resolution bei mehreren Triggern', en: 'Resolving Multiple Triggers' },
    definitionNormal: {
      de: 'Lösen mehrere Fähigkeiten gleichzeitig aus, legt der aktive Spieler zuerst seine eigenen Trigger in beliebiger Reihenfolge auf den Stapel, danach die Gegner ihre. Aufgelöst wird von oben nach unten – also zuletzt gelegt, zuerst aufgelöst.',
      en: 'When multiple abilities trigger at once, the active player puts their own triggers on the stack first, in any order, then the other players add theirs. It resolves top to bottom – last on, first off.',
    },
    definitionTrottel: {
      de: 'Zuerst packt der, der am Zug ist, seinen Kram oben drauf, dann die anderen. Abgearbeitet wird von oben – wie beim Teller-Stapel von eben.',
      en: "Whoever's turn it is stacks their stuff on top first, then everyone else. It gets worked off from the top – just like that plate stack from before.",
    },
    relatedTerms: ['stack'],
    steps: [
      { de: 'Mehrere Fähigkeiten lösen gleichzeitig aus.', en: 'Multiple abilities trigger at the same time.' },
      {
        de: 'Der aktive Spieler legt zuerst seine eigenen Trigger in beliebiger Reihenfolge auf den Stapel.',
        en: 'The active player puts their own triggers on the stack first, in any order.',
      },
      { de: 'Danach legen die übrigen Spieler reihum ihre Trigger drauf.', en: 'Then the other players add theirs, in turn order.' },
      {
        de: 'Der Stapel löst sich von oben nach unten auf – zuletzt gelegt, zuerst aufgelöst.',
        en: 'The stack resolves top to bottom – last on, first off.',
      },
    ],
  },
  {
    id: 'combat-trick',
    category: 'situations',
    term: { de: 'Combat-Trick-Szenario', en: 'A Combat Trick Scenario' },
    definitionNormal: {
      de: 'Ein Combat Trick ist ein Spontanzauber, der während des Kampfes gewirkt wird, um dessen Ausgang zu ändern (z. B. Kampfwerte erhöhen, bevor Schaden zugewiesen wird). Nach dem Blocken bekommen beide Spieler nochmal Priorität, bevor Schaden berechnet wird.',
      en: 'A combat trick is an instant cast during combat to change its outcome (e.g. boosting power/toughness before damage is assigned). After blockers are declared, both players get priority again before damage is calculated.',
    },
    definitionTrottel: {
      de: 'Combat Trick = der fiese Joker, den du erst ausspielst, wenn der Gegner schon geblockt hat und denkt, er hätte gewonnen.',
      en: "A combat trick is the nasty joker card you play only after your opponent has already blocked and thinks they've won.",
    },
    relatedTerms: ['phasen', 'flash'],
    steps: [
      { de: 'Angreifer werden deklariert.', en: 'Attackers are declared.' },
      { de: 'Der Verteidiger deklariert Blocker.', en: 'The defender declares blockers.' },
      { de: 'Beide Spieler bekommen Priorität, bevor Schaden zugewiesen wird.', en: 'Both players get priority before damage is assigned.' },
      { de: 'Jetzt wirkt jemand den Combat Trick (z. B. +2/+2).', en: 'Now someone casts the combat trick (e.g. +2/+2).' },
      { de: 'Erst danach wird der Kampfschaden berechnet.', en: 'Only then is combat damage calculated.' },
    ],
  },
  {
    id: 'response-fenster',
    category: 'situations',
    term: { de: 'Response-Fenster beim Blocken', en: 'The Response Window When Blocking' },
    definitionNormal: {
      de: 'Nach jeder Spielhandlung (z. B. der Blocken-Deklaration) bekommen beide Spieler nacheinander Priorität, bevor das Spiel fortschreitet – das ist das Fenster, in dem man noch reagieren kann.',
      en: 'After every game action (e.g. declaring blockers), both players get priority in turn before the game moves on – that\'s the window where you can still react.',
    },
    definitionTrottel: {
      de: 'Nach jeder Aktion gibt\'s kurz Stille, in der jeder noch was dazwischenfunken darf, bevor\'s weitergeht. Verpasst du den Moment, ist er weg.',
      en: "After every action there's a brief pause where anyone can still butt in before things move on. Miss that moment and it's gone.",
    },
    relatedTerms: ['priority'],
    steps: [
      { de: 'Ein Spieler führt eine Spielhandlung aus (z. B. Blocken-Deklaration).', en: 'A player takes a game action (e.g. declaring blockers).' },
      { de: 'Der aktive Spieler bekommt zuerst Priorität.', en: 'The active player gets priority first.' },
      { de: 'Reagiert er nicht, bekommt der nächste Spieler Priorität.', en: 'If they do nothing, the next player gets priority.' },
      { de: 'Erst wenn alle nacheinander passen, geht es zum nächsten Schritt.', en: 'Only once everyone passes in turn does the game move on.' },
    ],
  },
  {
    id: 'wann-spontanzauber',
    category: 'situations',
    term: { de: 'Wann darf ich einen Spontanzauber wirken?', en: 'When Can I Cast an Instant?' },
    definitionNormal: {
      de: 'Spontanzauber (Instants) dürfen jederzeit gewirkt werden, wenn man Priorität hat – auch im gegnerischen Zug oder mitten im Kampf, anders als normale Hexenmeisterzauber (Sorceries).',
      en: 'Instants can be cast any time you have priority – including during your opponent\'s turn or mid-combat, unlike sorceries.',
    },
    definitionTrottel: {
      de: 'Spontanzauber sind die Allzeit-bereit-Karten: Sobald du dran bist zu reagieren, darfst du sie zünden – egal ob dein Zug oder nicht.',
      en: "Instants are the always-ready cards: the moment it's your turn to react, you can fire them off – your turn or not.",
    },
    relatedTerms: ['flash', 'casting-a-spell'],
    steps: [
      { de: 'Du hast Priorität – egal in wessen Zug oder welcher Phase.', en: 'You have priority – no matter whose turn or which phase it is.' },
      { de: 'Ein Spontanzauber darf jetzt gewirkt werden.', en: 'An instant can be cast right now.' },
      { de: 'Der Zauber geht auf den Stapel, beide Spieler bekommen erneut Priorität.', en: 'The spell goes on the stack, both players get priority again.' },
      { de: 'Passen beide, löst sich der Zauber auf.', en: 'Once both players pass, the spell resolves.' },
    ],
  },
  {
    id: 'damage-assignment',
    category: 'situations',
    term: { de: 'Schadensverteilung bei mehreren Blockern', en: 'Dividing Damage Among Multiple Blockers' },
    definitionNormal: {
      de: 'Wird ein Angreifer von mehreren Kreaturen geblockt (oder blockt eine Kreatur mehrere Angreifer), verteilt die kontrollierende Spielerin den Kampfschaden frei auf sie – eine feste Reihenfolge mit "erst tödlicher Schaden, dann der Rest" gibt es seit dem Foundations-Regel-Update nicht mehr. Nur bei Trample muss weiterhin jedem Blocker zuerst tödlicher Schaden zugewiesen werden, bevor der Rest durchtrampelt.',
      en: "When an attacker is blocked by multiple creatures (or a creature blocks multiple attackers), its controller freely divides its combat damage among them - the old \"assign lethal to the first blocker before moving on\" ordering rule was removed in the Foundations rules update. Only trample still requires lethal damage to every blocker first before the rest tramples through.",
    },
    definitionTrottel: {
      de: 'Dein Monster darf den Schaden einfach aufteilen, wie es will – kein Pflicht-Ranking mehr, wer zuerst dran glauben muss. Nur bei Trample muss erst jeder Blocker sein Fett wegbekommen, bevor der Rest durchbricht.',
      en: 'Your creature just splits its damage however it wants now – no more mandatory "who dies first" ranking. Only trample still makes every blocker eat its fair share before the rest breaks through.',
    },
    relatedTerms: ['trample', 'sba-mid-combat'],
    steps: [
      { de: 'Ein Angreifer wird von zwei oder mehr Kreaturen geblockt.', en: 'An attacker is blocked by two or more creatures.' },
      { de: 'Der Kampfschadenschritt beginnt – eine extra Reihenfolge-Phase gibt es nicht mehr.', en: "The combat damage step begins - there's no separate ordering step anymore." },
      { de: 'Die angreifende Spielerin verteilt den Schaden frei auf die Blocker.', en: 'The attacking player freely divides the damage among the blockers.' },
      { de: 'Nur bei Trample: Erst muss jeder Blocker tödlichen Schaden bekommen, bevor der Rest durchtrampelt.', en: 'Trample only: lethal must go to each blocker first before the rest tramples through.' },
      { de: 'Der Schaden wird gleichzeitig zugewiesen, danach werden zustandsbasierte Aktionen geprüft.', en: 'Damage is dealt simultaneously, then state-based actions are checked.' },
    ],
    exampleCards: ['Serra Angel', 'Grizzly Bears'],
  },
  {
    id: 'legend-rule',
    category: 'situations',
    term: { de: 'Legenden-Regel', en: 'The Legend Rule' },
    definitionNormal: {
      de: 'Kontrolliert eine Spielerin zwei oder mehr legendäre Permanents mit demselben Namen, greift die Legenden-Regel: Sie muss sofort alle bis auf eines davon auf den Friedhof legen.',
      en: 'If a player controls two or more legendary permanents with the same name, the legend rule applies: they must immediately put all but one of them into the graveyard.',
    },
    definitionTrottel: {
      de: 'Zwei identische Promis auf einmal? Geht nicht. Du musst dich sofort für einen entscheiden, der Rest fliegt auf den Friedhof.',
      en: 'Two identical celebrities at once? Not allowed. You immediately pick one to keep, the rest go straight to the graveyard.',
    },
    relatedTerms: ['sba', 'command-zone'],
    steps: [
      { de: 'Du kontrollierst bereits ein legendäres Permanent.', en: 'You already control a legendary permanent.' },
      { de: 'Ein zweites Permanent mit exakt demselben Namen kommt unter deine Kontrolle.', en: 'A second permanent with the exact same name comes under your control.' },
      { de: 'Zustandsbasierte Aktionen erkennen den Verstoß gegen die Legenden-Regel.', en: 'State-based actions catch the legend-rule violation.' },
      { de: 'Du wählst, welches der beiden du behältst.', en: 'You choose which of the two to keep.' },
      { de: 'Die übrigen gehen sofort auf den Friedhof.', en: 'The rest go to the graveyard immediately.' },
    ],
    exampleCards: ['Kiki-Jiki, Mirror Breaker'],
  },
  {
    id: 'first-strike-deathtouch',
    category: 'situations',
    term: { de: 'Erstschlag vs. Todesberührung', en: 'First Strike vs. Deathtouch' },
    definitionNormal: {
      de: 'Hat der Angreifer Erstschlag, teilt er seinen Schaden in einem eigenen, früheren Schadensschritt aus. Reicht das, um den Blocker mit Todesberührung zu töten, werden zustandsbasierte Aktionen sofort geprüft – die Kreatur stirbt, bevor der reguläre Schadensschritt überhaupt beginnt, und schlägt also nie zurück.',
      en: "If the attacker has first strike, it deals its damage in its own, earlier damage step. If that's enough to kill the deathtouch blocker, state-based actions are checked immediately - it dies before the regular damage step even begins, so it never deals damage back.",
    },
    definitionTrottel: {
      de: 'Erstschlag heißt: Du darfst zuerst zuschlagen. Reicht\'s, um den Gegner umzuhauen, kommt der gar nicht mehr dazu, sein eigenes Gift zu verspritzen.',
      en: "First strike means you hit first. If that's enough to knock them out, they never even get the chance to spray their poison back.",
    },
    relatedTerms: ['deathtouch', 'sba-mid-combat'],
    steps: [
      { de: 'Der Erstschlag-Schadensschritt beginnt.', en: 'The first-strike damage step begins.' },
      { de: 'Nur Kreaturen mit Erstschlag (oder Doppelschlag) teilen jetzt Schaden aus.', en: 'Only creatures with first strike (or double strike) deal damage now.' },
      { de: 'Zustandsbasierte Aktionen werden sofort geprüft.', en: 'State-based actions are checked immediately.' },
      { de: 'Ist genug Schaden markiert, stirbt die Kreatur mit Todesberührung sofort.', en: 'If enough damage is marked, the deathtouch creature dies right away.' },
      { de: 'Der reguläre Schadensschritt findet für die tote Kreatur nicht mehr statt.', en: 'The regular damage step never happens for the now-dead creature.' },
    ],
    exampleCards: ['Eager Cadet', 'Typhoid Rats'],
  },
  {
    id: 'sba-mid-combat',
    category: 'situations',
    term: { de: 'Zustandsbasierte Aktionen mitten im Kampf', en: 'State-Based Actions Mid-Combat' },
    definitionNormal: {
      de: 'Eine Kreatur stirbt nicht "beim Schaden", sondern erst, wenn als Nächstes zustandsbasierte Aktionen geprüft werden – das passiert automatisch, sobald jemand Priorität bekommen würde, noch bevor irgendwer reagieren kann.',
      en: 'A creature doesn\'t die "when damage happens" - it dies the next time state-based actions are checked, which happens automatically right before anyone would get priority, before anyone can react.',
    },
    definitionTrottel: {
      de: 'Das Spiel räumt im Hintergrund sofort auf: Tot ist tot, noch bevor du überhaupt drüber nachdenken kannst, was zu tun ist.',
      en: "The game cleans up instantly in the background: dead is dead before you've even had a chance to think about what to do.",
    },
    relatedTerms: ['sba', 'stack', 'first-strike-deathtouch'],
    steps: [
      { de: 'Eine Kreatur bekommt tödlichen Schaden oder ihre Zähigkeit fällt auf 0.', en: 'A creature takes lethal damage or its toughness drops to 0.' },
      { de: 'Bevor irgendwer Priorität bekommt, werden zustandsbasierte Aktionen geprüft.', en: 'Before anyone gets priority, state-based actions are checked.' },
      { de: 'Die Kreatur wird sofort zerstört bzw. auf den Friedhof gelegt.', en: 'The creature is destroyed/put into the graveyard immediately.' },
      { de: 'Ausgelöste Fähigkeiten durch den Tod kommen jetzt auf den Stapel.', en: 'Any death-triggered abilities go on the stack next.' },
      { de: 'Erst danach bekommen Spieler wieder Priorität.', en: 'Only after that do players get priority again.' },
    ],
    exampleCards: ['Lightning Bolt', 'Grizzly Bears'],
  },
  {
    id: 'counterspell-war',
    category: 'situations',
    term: { de: 'Gegenzauber-Krieg', en: 'Counterspell War' },
    definitionNormal: {
      de: 'Wird ein Gegenzauber selbst gegengezaubert, löst sich dieser Gegenzauber einfach nicht auf. Der ursprüngliche Zauber bleibt dadurch unberührt auf dem Stapel und löst sich danach ganz normal auf – "den Gegenzauber kontern" rettet also den ersten Zauber.',
      en: "If a counterspell itself gets countered, that counterspell simply doesn't resolve. The original spell is left untouched on the stack and resolves normally afterward - countering the counter saves the original spell.",
    },
    definitionTrottel: {
      de: 'Dein Gegner will deinen Zauber stoppen – du stoppst den Stopper. Weil der Stapel rückwärts abgearbeitet wird, kommt dein ursprünglicher Zauber am Ende trotzdem durch.',
      en: 'Your opponent tries to stop your spell – you stop the stopper. Since the stack resolves backwards, your original spell still gets through in the end.',
    },
    relatedTerms: ['stack', 'stack-resolution'],
    steps: [
      { de: 'Zauber A wird gewirkt.', en: 'Spell A is cast.' },
      { de: 'Der Gegner wirkt Gegenzauber B auf Zauber A.', en: 'The opponent casts counterspell B targeting spell A.' },
      { de: 'Du wirkst Gegenzauber C auf Gegenzauber B.', en: 'You cast counterspell C targeting counterspell B.' },
      { de: 'Der Stapel löst sich von oben nach unten auf: C kontert zuerst B.', en: 'The stack resolves top to bottom: C resolves first, countering B.' },
      { de: 'B ist weg, also wird A nie gekontert – A löst sich ganz normal auf.', en: 'B is gone, so A is never countered - A resolves normally.' },
    ],
    exampleCards: ['Counterspell'],
  },
  {
    id: 'london-mulligan',
    category: 'situations',
    term: { de: 'London-Mulligan', en: 'London Mulligan' },
    definitionNormal: {
      de: 'Beim Mulligan mischt man die Hand zurück in die Bibliothek und zieht wieder 7 Karten. Das darf beliebig oft wiederholt werden. Hat man sich für eine Hand entschieden, legt man so viele Karten verdeckt unten auf die Bibliothek, wie man Mulligans genommen hat.',
      en: 'On a mulligan, you shuffle your hand back into your library and draw a fresh 7. This can be repeated as many times as you like. Once you keep a hand, you put a number of cards on the bottom of your library equal to how many mulligans you took.',
    },
    definitionTrottel: {
      de: 'Hand gefällt dir nicht? Rein damit, neu mischen, 7 frische Karten ziehen. So oft du willst. Am Ende musst du nur so viele Karten wieder unten abgeben, wie du Versuche gebraucht hast.',
      en: "Don't like your hand? Shuffle it back, draw a fresh 7. As many times as you want. At the end you just pay back as many cards to the bottom as the number of tries it took you.",
    },
    steps: [
      { de: 'Du ziehst deine Starthand mit 7 Karten.', en: 'You draw your opening hand of 7 cards.' },
      { de: 'Gefällt sie dir nicht: Mische sie zurück und ziehe erneut 7 Karten.', en: "Don't like it: shuffle it back and draw a fresh 7." },
      { de: 'Das darfst du beliebig oft wiederholen.', en: 'Repeat this as many times as you like.' },
      { de: 'Du entscheidest dich für eine Hand und behältst sie.', en: 'You decide to keep a hand.' },
      { de: 'Du legst so viele Karten verdeckt unten auf die Bibliothek, wie du Mulligans genommen hast.', en: 'You put as many cards on the bottom of your library as mulligans you took.' },
    ],
  },
  {
    id: 'casting-a-spell',
    category: 'situations',
    term: { de: 'Einen Zauber wirken – Schritt für Schritt', en: 'Casting a Spell, Step by Step' },
    definitionNormal: {
      de: 'Einen Zauber zu wirken ist ein fester Ablauf: Erst werden Modi, Ziele und Zusatzkosten wie Kicker festgelegt, dann die Gesamtkosten berechnet und bezahlt. Erst wenn das alles abgeschlossen ist, gilt der Zauber als "gewirkt" – vorher kann niemand darauf reagieren.',
      en: 'Casting a spell follows a fixed procedure: modes, targets and additional costs like kicker are chosen first, then the total cost is calculated and paid. Only once all of that is done does the spell count as "cast" - nobody can respond before that point.',
    },
    definitionTrottel: {
      de: 'Erst sagst du genau, was du vorhast und wen du anvisierst, dann zahlst du. Erst wenn du fertig bezahlt hast, darf überhaupt jemand reagieren.',
      en: 'First you say exactly what you\'re doing and who you\'re targeting, then you pay. Only once you\'re done paying can anyone even react.',
    },
    relatedTerms: ['stack', 'wann-spontanzauber'],
    steps: [
      { de: 'Der Zauber wandert auf den Stapel, du kündigst ihn an.', en: 'The spell moves to the stack, you announce it.' },
      { de: 'Du legst Modi, Ziele und Zusatzkosten (z. B. Kicker) fest.', en: 'You choose modes, targets and additional costs (e.g. kicker).' },
      { de: 'Die Gesamtkosten werden berechnet.', en: 'The total cost is determined.' },
      { de: 'Du aktivierst Manafähigkeiten und bezahlst.', en: 'You activate mana abilities and pay.' },
      { de: 'Erst jetzt gilt der Zauber als gewirkt – erst jetzt können andere reagieren.', en: 'Only now does the spell count as cast - only now can others respond.' },
    ],
    exampleCards: ['Rite of Replication', 'Faithless Looting'],
  },
  {
    id: 'may-vs-mandatory-trigger',
    category: 'situations',
    term: { de: '"Darf"- vs. Pflicht-Trigger', en: '"May" vs. Mandatory Triggers' },
    definitionNormal: {
      de: 'Pflicht-Trigger kommen immer automatisch auf den Stapel. Bei "Darf"-Triggern entscheidet die kontrollierende Spielerin in dem Moment, in dem der Trigger auslöst, ob sie ihn überhaupt stapelt. Wird ein Trigger erst später bemerkt, nachdem schon weitergespielt wurde, gilt er meist als verpasst und passiert einfach nicht.',
      en: 'Mandatory triggers always go on the stack automatically. With "may" triggers, the controller decides right at the moment it triggers whether to put it on the stack at all. A trigger noticed only later, after play has moved on, usually counts as missed and simply doesn\'t happen.',
    },
    definitionTrottel: {
      de: 'Pflicht heißt: passiert einfach. "Darf" heißt: du musst in dem Moment Ja oder Nein sagen – pennst du den Moment, war\'s das, der Trigger ist futsch.',
      en: 'Mandatory means it just happens. "May" means you have to say yes or no right then – miss that moment and the trigger\'s gone, no do-overs.',
    },
    relatedTerms: ['stack', 'priority'],
    steps: [
      { de: 'Das auslösende Ereignis tritt ein.', en: 'The triggering event occurs.' },
      {
        de: 'Ist die Fähigkeit eine Pflicht-Fähigkeit oder ein "Darf"?',
        en: 'Is the ability mandatory, or a "may"?',
        branches: [
          { de: 'Pflicht: kommt automatisch auf den Stapel.', en: 'Mandatory: goes on the stack automatically.' },
          { de: 'Darf: die Spielerin entscheidet jetzt Ja oder Nein.', en: 'May: the player decides yes or no right now.' },
        ],
      },
      { de: 'Bei "Darf" + Ja (oder bei Pflicht): die Fähigkeit kommt beim nächsten Prioritäts-Fenster auf den Stapel.', en: 'With "may" + yes (or mandatory): the ability goes on the stack at the next priority window.' },
      { de: 'Wird der Trigger erst bemerkt, nachdem schon weitergespielt wurde, gilt er meist als verpasst.', en: 'If the trigger is only noticed after play has moved on, it usually counts as missed.' },
    ],
    exampleCards: ['Mulldrifter', 'Solemn Simulacrum'],
  },
  {
    id: 'replacement-vs-trigger',
    category: 'situations',
    term: { de: 'Replacement-Effekt vs. ausgelöste Fähigkeit', en: 'Replacement Effect vs. Triggered Ability' },
    definitionNormal: {
      de: 'Ein Replacement-Effekt (Formulierungen wie "stattdessen" oder "wenn X geschehen würde") verändert ein Ereignis, bevor es überhaupt passiert – er geht nie auf den Stapel, also kann auch niemand darauf reagieren. Eine ausgelöste Fähigkeit dagegen wartet das Ereignis ab und geht danach auf den Stapel, wo beide Spieler noch reagieren können.',
      en: 'A replacement effect (wording like "instead" or "if X would happen") modifies an event before it even happens - it never goes on the stack, so nobody can respond to it. A triggered ability, by contrast, waits for the event to happen and then goes on the stack afterward, where both players can still respond.',
    },
    definitionTrottel: {
      de: '"Stattdessen"-Effekte schummeln sich schon vorher rein und ändern, was überhaupt passiert – da kannst du nichts mehr gegen tun. Ein "wenn X passiert"-Trigger wartet dagegen brav, bis X wirklich passiert ist, und erst dann darfst du reagieren.',
      en: '"Instead" effects sneak in beforehand and change what even happens – there\'s nothing left to react to. A "whenever X happens" trigger, on the other hand, politely waits until X actually happens, and only then can you react.',
    },
    relatedTerms: ['stack'],
    steps: [
      { de: 'Ein Ereignis steht kurz bevor (z. B. ein Permanent kommt ins Spiel, Schaden würde zugefügt).', en: 'An event is about to happen (e.g. a permanent enters, damage would be dealt).' },
      { de: 'Ein Replacement-Effekt ("stattdessen"/"als") wird zuerst geprüft.', en: 'A replacement effect ("instead"/"as") is checked first.' },
      { de: 'Das Ereignis wird direkt verändert – kein Stapel, kein Reaktionsfenster.', en: 'The event itself is modified directly - no stack, no response window.' },
      { de: 'Zum Vergleich: Eine ausgelöste Fähigkeit wartet das Ereignis ab und geht erst danach auf den Stapel.', en: 'By comparison: a triggered ability waits for the event, then goes on the stack afterward.' },
      { de: 'Nur bei der Trigger-Variante können Spieler überhaupt reagieren.', en: 'Only the triggered-ability version gives players anything to respond to.' },
    ],
    exampleCards: ['Rest in Peace', 'Blood Artist'],
  },
];
