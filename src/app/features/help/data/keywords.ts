import { HelpTerm } from './types';

// Card-text keyword abilities/actions. Expanded 2026-10-22 to cover
// essentially every keyword/ability word ever printed - evergreen, recurring
// ("deciduous"), ability words (flavor headers with no fixed rules text of
// their own), expert-level/historical mechanics, and retired ones. Content
// written from verified MTG rules knowledge; a handful of newer or very
// obscure mechanics carry an inline // NOTE comment where the exact current
// wording should be spot-checked against Scryfall/the Comprehensive Rules
// before being treated as authoritative. German term glosses in parentheses
// are informal, for comprehension - not asserted as Wizards' official
// localized card text.
export const HELP_TERMS_KEYWORDS: HelpTerm[] = [
  {
    id: 'flash',
    category: 'keywords',
    term: { de: 'Flash', en: 'Flash' },
    definitionNormal: {
      de: 'Flash erlaubt, eine Karte jederzeit zu wirken, zu dem Zeitpunkt, zu dem man einen Spontanzauber wirken dürfte – auch im gegnerischen Zug.',
      en: "Flash lets you cast a card any time you could cast an instant – including during your opponent's turn.",
    },
    definitionTrottel: {
      de: 'Flash heißt: Überraschung! Die Karte poppt auf, wann du willst, nicht nur in deinem eigenen Zug.',
      en: "Flash means: surprise! The card shows up whenever you want, not just on your own turn.",
    },
    relatedTerms: ['wann-spontanzauber'],
  },
  {
    id: 'trample',
    category: 'keywords',
    term: { de: 'Trample (Trampelschaden)', en: 'Trample' },
    definitionNormal: {
      de: 'Trample erlaubt, überschüssigen Kampfschaden, der die Zähigkeit des Blockers übersteigt, an den verteidigenden Spieler oder Planeswalker weiterzugeben.',
      en: "Trample lets excess combat damage that exceeds the blocker's toughness carry over to the defending player or planeswalker.",
    },
    definitionTrottel: {
      de: 'Trample = dein Monster ist so fett, dass der Rest über die Blocker drüber latscht.',
      en: 'Trample means your creature is so huge that the leftover damage just tramples right over the blocker.',
    },
    relatedTerms: ['damage-assignment'],
  },
  {
    id: 'deathtouch',
    category: 'keywords',
    term: { de: 'Deathtouch (Todesberührung)', en: 'Deathtouch' },
    definitionNormal: {
      de: 'Jede Menge Schaden von einer Kreatur mit Todesberührung reicht aus, um die betroffene Kreatur zu zerstören – egal wie viel Zähigkeit sie hat.',
      en: 'Any amount of damage from a creature with deathtouch is enough to destroy the damaged creature – no matter how much toughness it has.',
    },
    definitionTrottel: {
      de: 'Ein Kratzer von dieser Kreatur reicht wie eine vergiftete Nadel – selbst 1 Schaden killt den dicksten Brocken.',
      en: 'One scratch from this creature is enough – like a poisoned needle. Even 1 damage kills the biggest monster on the board.',
    },
    relatedTerms: ['first-strike-deathtouch'],
  },
  {
    id: 'protection',
    category: 'keywords',
    term: { de: 'Protection (Schutz)', en: 'Protection' },
    definitionNormal: {
      de: 'Schutz vor einer Eigenschaft (Farbe, Typ etc.) verhindert, dass die geschützte Kreatur davon beschädigt, verzaubert/verrüstet, geblockt oder als Ziel gewählt wird (Merkhilfe: DEBT).',
      en: "Protection from a quality (color, type, etc.) prevents the protected creature from being Damaged, Enchanted/Equipped, Blocked, or Targeted by it (mnemonic: DEBT).",
    },
    definitionTrottel: {
      de: 'Schutz ist wie ein Unsichtbarkeits-Schild gegen eine bestimmte Sache – "Schutz vor Rot" heißt: rote Zauber ignorieren dich komplett.',
      en: 'Protection is like an invisibility shield against one specific thing – "protection from red" means red spells ignore you completely.',
    },
  },
  {
    id: 'ward',
    category: 'keywords',
    term: { de: 'Ward (Fürsorge)', en: 'Ward' },
    definitionNormal: {
      de: 'Ward löst beim gegnerischen Anvisieren eine Zusatzkosten oder einen Gegeneffekt aus (z. B. "2 zahlen, sonst Gegenzauber"), um die Kreatur vor Zielwahl zu schützen.',
      en: "Ward triggers an extra cost or a counter-effect (e.g. \"pay 2 or counter it\") whenever an opponent targets the creature, protecting it from being targeted.",
    },
    definitionTrottel: {
      de: 'Ward ist der Türsteher deiner Kreatur: Will der Gegner sie anfassen, muss er erst Eintritt zahlen – oder er kommt gar nicht rein.',
      en: "Ward is your creature's bouncer: if the opponent wants to touch it, they have to pay the cover charge first – or they're not getting in.",
    },
  },
  {
    id: 'hexproof',
    category: 'keywords',
    term: { de: 'Hexproof', en: 'Hexproof' },
    definitionNormal: {
      de: 'Hexproof verhindert, dass die Kreatur von gegnerischen Zaubersprüchen oder Fähigkeiten als Ziel gewählt wird.',
      en: "Hexproof prevents the creature from being targeted by your opponents' spells or abilities.",
    },
    definitionTrottel: {
      de: 'Hexproof heißt: Der Gegner kann gar nicht erst auf dich zeigen. Unsichtbar für alles, was er dir Böses will.',
      en: "Hexproof means the opponent can't even point at you in the first place. Invisible to anything they want to do to you.",
    },
  },
  {
    id: 'flying',
    category: 'keywords',
    term: { de: 'Flying (Fliegend)', en: 'Flying' },
    definitionNormal: {
      de: 'Eine fliegende Kreatur kann nur von anderen fliegenden oder reichweiten-fähigen (Reach) Kreaturen geblockt werden.',
      en: 'A flying creature can only be blocked by other creatures with flying or reach.',
    },
    definitionTrottel: {
      de: 'Flieger können nur von anderen Fliegern oder Scharfschützen abgefangen werden – alles andere steht nur dumm am Boden.',
      en: 'Flyers can only be caught by other flyers or snipers (reach) – everything else just stands there uselessly on the ground.',
    },
  },
  {
    id: 'first-strike',
    category: 'keywords',
    term: { de: 'First Strike (Erstschlag)', en: 'First Strike' },
    definitionNormal: {
      de: 'Kreaturen mit Erstschlag teilen ihren Kampfschaden in einem eigenen, früheren Schadensschritt aus – vor allen Kreaturen ohne Erstschlag.',
      en: 'Creatures with first strike deal their combat damage in their own earlier damage step, before creatures without it.',
    },
    definitionTrottel: {
      de: 'Erstschlag heißt: Du darfst zuerst zuschlagen, bevor der Gegner überhaupt dran ist.',
      en: 'First strike means you get to hit first, before the opponent even gets a turn.',
    },
    relatedTerms: ['first-strike-deathtouch'],
    exampleCards: ['White Knight'],
  },
  {
    id: 'double-strike',
    category: 'keywords',
    term: { de: 'Double Strike (Doppelschlag)', en: 'Double Strike' },
    definitionNormal: {
      de: 'Doppelschlag kombiniert Erstschlag und regulären Schaden – die Kreatur teilt sowohl im Erstschlag- als auch im regulären Schadensschritt Schaden aus, trifft also effektiv zweimal.',
      en: 'Double strike combines first strike and regular damage – the creature deals damage in both the first-strike and the regular damage step, hitting effectively twice.',
    },
    definitionTrottel: {
      de: 'Doppelschlag heißt: einmal zuschlagen, zweimal treffen.',
      en: 'Double strike means: swing once, hit twice.',
    },
    relatedTerms: ['first-strike'],
    exampleCards: ['Fencing Ace'],
  },
  {
    id: 'defender',
    category: 'keywords',
    term: { de: 'Defender (Verteidiger)', en: 'Defender' },
    definitionNormal: {
      de: 'Kreaturen mit Defender können nicht angreifen, dürfen aber ganz normal blocken.',
      en: "Creatures with defender can't attack, but can block normally.",
    },
    definitionTrottel: {
      de: 'Defender ist das Mauerblümchen-Keyword – super zum Blocken, aber zum Angreifen viel zu bequem.',
      en: 'Defender is the wallflower keyword – great at blocking, way too comfortable to ever attack.',
    },
    exampleCards: ['Wall of Omens'],
  },
  {
    id: 'haste',
    category: 'keywords',
    term: { de: 'Haste (Hast)', en: 'Haste' },
    definitionNormal: {
      de: 'Haste erlaubt einer Kreatur, schon in dem Zug anzugreifen oder ihre Tap-Fähigkeiten zu nutzen, in dem sie ins Spiel kommt – die sogenannte Beschwörungskrankheit wird ignoriert.',
      en: 'Haste lets a creature attack or use its tap abilities the very turn it enters the battlefield, ignoring summoning sickness.',
    },
    definitionTrottel: {
      de: 'Haste heißt: kein Einspielen nötig, sofort volle Pulle loslegen.',
      en: 'Haste means no warm-up lap needed – straight to full speed the moment it shows up.',
    },
    exampleCards: ['Hellrider'],
  },
  {
    id: 'indestructible',
    category: 'keywords',
    term: { de: 'Indestructible (Unzerstörbar)', en: 'Indestructible' },
    definitionNormal: {
      de: 'Unzerstörbare Permanents werden von "zerstören"-Effekten und von tödlichem Schaden nicht zerstört.',
      en: 'Indestructible permanents aren\'t destroyed by "destroy" effects or by lethal damage.',
    },
    definitionTrottel: {
      de: 'Unzerstörbar heißt: Zerstören-Befehle und tödlicher Schaden prallen einfach ab.',
      en: 'Indestructible means "destroy" effects and lethal damage just bounce right off.',
    },
    exampleCards: ['Darksteel Colossus'],
  },
  {
    id: 'lifelink',
    category: 'keywords',
    term: { de: 'Lifelink (Lebensverknüpfung)', en: 'Lifelink' },
    definitionNormal: {
      de: 'Schaden, den eine Kreatur mit Lifelink zufügt, lässt ihre kontrollierende Spielerin um denselben Betrag Leben gewinnen.',
      en: 'Damage dealt by a creature with lifelink also causes its controller to gain that much life.',
    },
    definitionTrottel: {
      de: 'Lifelink heißt: jeder ausgeteilte Schaden füllt gleichzeitig deine eigene Lebensanzeige auf.',
      en: 'Lifelink means every point of damage you deal also tops up your own life total.',
    },
    exampleCards: ['Serra Ascendant'],
  },
  {
    id: 'menace',
    category: 'keywords',
    term: { de: 'Menace (Bedrohlich)', en: 'Menace' },
    definitionNormal: {
      de: 'Kreaturen mit Menace können nur von zwei oder mehr Kreaturen gemeinsam geblockt werden.',
      en: 'Creatures with menace can only be blocked by two or more creatures.',
    },
    definitionTrottel: {
      de: 'Menace heißt: ein einzelner Blocker reicht gar nicht erst – es braucht mindestens eine ganze Gang.',
      en: "Menace means one blocker alone doesn't cut it – it takes a whole gang.",
    },
    exampleCards: ['Rankle, Master of Pranks'],
  },
  {
    id: 'reach',
    category: 'keywords',
    term: { de: 'Reach (Reichweite)', en: 'Reach' },
    definitionNormal: {
      de: 'Kreaturen mit Reach können fliegende Kreaturen blocken, auch wenn sie selbst nicht fliegen.',
      en: "Creatures with reach can block creatures with flying, even though they can't fly themselves.",
    },
    definitionTrottel: {
      de: 'Reach heißt: nicht fliegen können, aber trotzdem weit genug greifen, um Flieger vom Himmel zu holen.',
      en: "Reach means you can't fly, but you can still reach high enough to knock flyers out of the sky.",
    },
    relatedTerms: ['flying'],
    exampleCards: ['Giant Spider'],
  },
  {
    id: 'vigilance',
    category: 'keywords',
    term: { de: 'Vigilance (Wachsamkeit)', en: 'Vigilance' },
    definitionNormal: {
      de: 'Kreaturen mit Vigilance tappen beim Angreifen nicht und stehen danach weiterhin zum Blocken zur Verfügung.',
      en: "Creatures with vigilance don't tap when attacking, so they're still available to block afterward.",
    },
    definitionTrottel: {
      de: 'Vigilance heißt: angreifen und trotzdem wachsam genug bleiben, um gleich wieder zu verteidigen.',
      en: 'Vigilance means you can attack and still stay alert enough to defend right back.',
    },
    exampleCards: ['Serra Angel'],
  },
  {
    id: 'enchant',
    category: 'keywords',
    term: { de: 'Enchant (Verzaubern)', en: 'Enchant' },
    definitionNormal: {
      de: 'Enchant steht auf Auren und legt fest, woran sie sich legal anheften dürfen (z. B. "Enchant Creature").',
      en: 'Enchant appears on Auras and states what they\'re legally allowed to attach to (e.g. "Enchant creature").',
    },
    definitionTrottel: {
      de: 'Enchant ist die Gebrauchsanweisung der Aura: "klebt nur hier, sonst nirgends".',
      en: 'Enchant is the Aura\'s instruction label: "only sticks here, nowhere else".',
    },
    exampleCards: ['Pacifism'],
  },
  {
    id: 'equip',
    category: 'keywords',
    term: { de: 'Equip (Ausrüsten)', en: 'Equip' },
    definitionNormal: {
      de: 'Equip ist eine aktivierte Fähigkeit auf Ausrüstungen, die nur zu Hexenmeister-Zeitpunkt genutzt werden kann, um die Ausrüstung gegen Mana an eine eigene Kreatur anzulegen.',
      en: 'Equip is an activated ability on Equipment, usable only at sorcery speed, that attaches the Equipment to a creature you control for a mana cost.',
    },
    definitionTrottel: {
      de: 'Equip heißt: Ausrüstung von einer Kreatur zur nächsten umhängen, aber nur, wenn du gerade sowieso am Zug bist.',
      en: "Equip means moving gear from one creature to another, but only on your own turn while nothing else is going on.",
    },
    exampleCards: ["Umezawa's Jitte"],
  },
  {
    id: 'prowess',
    category: 'keywords',
    term: { de: 'Prowess (Geschick)', en: 'Prowess' },
    definitionNormal: {
      de: 'Prowess gibt der Kreatur +1/+1 bis zum Ende des Zuges, sobald man einen nicht-Kreaturen-Zauber wirkt.',
      en: 'Prowess gives the creature +1/+1 until end of turn whenever its controller casts a noncreature spell.',
    },
    definitionTrottel: {
      de: 'Prowess heißt: jeder Zauberspruch macht dein Monster für den Rest des Zuges kurz ein bisschen gefährlicher.',
      en: 'Prowess means every spell you cast makes your creature just a little scarier for the rest of the turn.',
    },
    exampleCards: ['Monastery Swiftspear'],
  },
  {
    id: 'goad',
    category: 'keywords',
    term: { de: 'Goad (Anstacheln)', en: 'Goad' },
    definitionNormal: {
      de: 'Eine angestachelte Kreatur muss angreifen, wenn möglich, darf dabei aber weder die anstachelnde Spielerin noch deren Planeswalker angreifen – bis zum nächsten eigenen Zug der Spielerin, die die Kreatur kontrolliert.',
      en: "A goaded creature must attack if able, but can't attack the goading player or their planeswalkers, until that creature's controller's next turn.",
    },
    definitionTrottel: {
      de: 'Goad heißt: dem Gegner einreden, er solle unbedingt jemand ANDEREN angreifen – und er kann gar nicht anders.',
      en: "Goad means convincing an opponent to attack someone else entirely – and they literally can't help themselves.",
    },
  },
  {
    id: 'scry',
    category: 'keywords',
    term: { de: 'Scry (Weissagung)', en: 'Scry' },
    definitionNormal: {
      de: 'Bei Scry N schaut man sich die obersten N Karten der Bibliothek an und legt beliebig viele davon unten an, den Rest in beliebiger Reihenfolge wieder oben auf.',
      en: 'Scry N means looking at the top N cards of your library, then putting any number of them on the bottom and the rest back on top in any order.',
    },
    definitionTrottel: {
      de: 'Scry heißt: kurz in die Zukunft schauen und den Müll ganz nach unten schieben.',
      en: 'Scry means peeking into the future and shoving the junk straight to the bottom.',
    },
  },
  {
    id: 'fight',
    category: 'keywords',
    term: { de: 'Fight (Kampf-Effekt)', en: 'Fight' },
    definitionNormal: {
      de: 'Beim Fight-Effekt fügen sich zwei Kreaturen gegenseitig Schaden in Höhe ihrer Stärke zu – ganz ohne Angriff oder Blocken.',
      en: 'A fight effect has two creatures each deal damage equal to their power to the other, with no attacking or blocking involved.',
    },
    definitionTrottel: {
      de: 'Fight heißt: zwei Kreaturen in den Ring schubsen und zuschauen, wer stehen bleibt.',
      en: "Fight means shoving two creatures into the ring and watching who's still standing.",
    },
  },
  {
    id: 'mill',
    category: 'keywords',
    term: { de: 'Mill (Abwerfen der Bibliothek)', en: 'Mill' },
    definitionNormal: {
      de: 'Mill N legt die obersten N Karten einer Bibliothek direkt und ungesehen in deren Friedhof.',
      en: "Mill N puts the top N cards of a library directly into its owner's graveyard, unseen.",
    },
    definitionTrottel: {
      de: 'Mill heißt: dem Gegner einfach einen Stapel Karten unten aus dem Deck ziehen und in den Friedhof kippen.',
      en: "Mill means yanking a chunk of someone's deck straight into their graveyard without them ever seeing it.",
    },
  },
  {
    id: 'proliferate',
    category: 'keywords',
    term: { de: 'Proliferate (Vermehren)', en: 'Proliferate' },
    definitionNormal: {
      de: 'Bei Proliferate wählt man beliebig viele Permanents und/oder Spieler, die bereits mindestens einen Marker (oder mehr als eine Markerart) haben, und fügt von jeder vorhandenen Markerart genau einen weiteren hinzu.',
      en: 'Proliferate lets you choose any number of permanents and/or players that already have a counter (or more than one kind), then add one more of each kind already there.',
    },
    definitionTrottel: {
      de: 'Proliferate heißt: alles, was schon Marker hat, bekommt automatisch noch einen obendrauf.',
      en: 'Proliferate means anything that already has counters just gets one more of each, automatically.',
    },
  },
  {
    id: 'flashback',
    category: 'keywords',
    term: { de: 'Flashback (Rückblende)', en: 'Flashback' },
    definitionNormal: {
      de: 'Flashback [Kosten] erlaubt, die Karte einmalig aus dem Friedhof zu den Flashback-Kosten zu wirken; danach wird sie exiliert.',
      en: "Flashback [cost] lets you cast this card once from your graveyard for its flashback cost; it's exiled afterward.",
    },
    definitionTrottel: {
      de: 'Flashback heißt: dein Zauber hat ein zweites Leben im Friedhof – einmal recyceln, dann ist wirklich Schluss.',
      en: "Flashback means your spell gets one encore from the graveyard – one more cast, then it's gone for good.",
    },
  },
  {
    id: 'kicker',
    category: 'keywords',
    term: { de: 'Kicker (Aufpreis)', en: 'Kicker' },
    definitionNormal: {
      de: 'Kicker [Kosten] ist eine optionale Zusatzkosten, die man beim Wirken bezahlen kann, um einen Bonuseffekt zu bekommen.',
      en: 'Kicker [cost] is an optional additional cost you may pay when casting the spell for a bonus effect.',
    },
    definitionTrottel: {
      de: 'Kicker ist das Upgrade an der Kasse: zahl ein bisschen mehr, kriegst du den Zauber mit Extras.',
      en: 'Kicker is the checkout upsell: pay a bit more, get the deluxe version of the spell.',
    },
  },
  {
    id: 'multikicker',
    category: 'keywords',
    term: { de: 'Multikicker (Mehrfach-Aufpreis)', en: 'Multikicker' },
    definitionNormal: {
      de: 'Multikicker [Kosten] funktioniert wie Kicker, darf aber beliebig oft bezahlt werden – jede Zahlung addiert den Bonuseffekt erneut.',
      en: 'Multikicker [cost] works like kicker, but you may pay it any number of times, each time stacking the bonus effect again.',
    },
    definitionTrottel: {
      de: 'Multikicker ist Kicker ohne Mengenbegrenzung – so oft bezahlen, wie das Portemonnaie hergibt.',
      en: 'Multikicker is kicker with no spending limit – pay it as many times as your wallet allows.',
    },
    exampleCards: ['Hydra Broodmaster'],
  },
  {
    id: 'convoke',
    category: 'keywords',
    term: { de: 'Convoke (Aufgebot)', en: 'Convoke' },
    definitionNormal: {
      de: 'Convoke erlaubt, ungetappte eigene Kreaturen zu tappen, um die Kosten dieses Zaubers mitzubezahlen – jede Kreatur zahlt ein Mana ihrer Farbe oder ein generisches.',
      en: "Convoke lets you tap untapped creatures you control to help pay this spell's cost – each one pays for one mana of its color, or one generic.",
    },
    definitionTrottel: {
      de: 'Convoke heißt: deine Kreaturen legen zusammen und bezahlen den Zauber mit – dafür müssen sie halt kurz stillhalten (tappen).',
      en: 'Convoke means your creatures chip in to pay for the spell – they just have to tap out to do it.',
    },
    exampleCards: ['Chord of Calling'],
  },
  {
    id: 'cascade',
    category: 'keywords',
    term: { de: 'Cascade (Lawine)', en: 'Cascade' },
    definitionNormal: {
      de: 'Cascade deckt beim Wirken Karten vom Bibliotheksende auf, bis eine nichtländische Karte mit geringerem Manawert auftaucht – die darf kostenlos gewirkt werden, der Rest kommt gemischt nach unten.',
      en: 'Cascade reveals cards off the top of your library when you cast this spell until a nonland card with lower mana value shows up – you may cast that one for free, then the rest go to the bottom in a random order.',
    },
    definitionTrottel: {
      de: 'Cascade ist eine Überraschungstüte: du blätterst durch dein Deck, bis ein günstigerer Zauber rausfällt – und den gibt\'s gratis obendrauf.',
      en: 'Cascade is a surprise grab bag: you flip through your deck until a cheaper spell pops out – and you get to cast that one for free.',
    },
    exampleCards: ['Bloodbraid Elf'],
  },
  {
    id: 'cycling',
    category: 'keywords',
    term: { de: 'Cycling (Kreislauf)', en: 'Cycling' },
    definitionNormal: {
      de: 'Cycling [Kosten] erlaubt, die Karte gegen Bezahlung der Kosten aus der Hand abzuwerfen und dafür eine neue Karte zu ziehen.',
      en: 'Cycling [cost] lets you pay the cost and discard this card from hand to draw a new card.',
    },
    definitionTrottel: {
      de: 'Cycling ist die Umtauschfunktion: Karte nicht zu gebrauchen? Abwerfen, neue ziehen.',
      en: "Cycling is the return policy: don't need this card? Toss it, draw a fresh one.",
    },
    exampleCards: ['Krosan Tusker'],
  },
  {
    id: 'delve',
    category: 'keywords',
    term: { de: 'Delve (Grabraub)', en: 'Delve' },
    definitionNormal: {
      de: 'Delve erlaubt, Karten aus dem eigenen Friedhof zu exilieren, um damit generisches Mana der Zauberkosten zu bezahlen – jede exilierte Karte deckt 1 generisches Mana.',
      en: "Delve lets you exile cards from your graveyard to help pay this spell's generic mana cost – each exiled card covers 1 generic mana.",
    },
    definitionTrottel: {
      de: 'Delve heißt: dein Friedhof ist eine Ersatzgeldbörse – alte Karten raus, Zauber billiger.',
      en: 'Delve means your graveyard doubles as spare change – toss old cards out, make the spell cheaper.',
    },
    exampleCards: ['Treasure Cruise'],
  },
  {
    id: 'surveil',
    category: 'keywords',
    term: { de: 'Surveil (Ausspähen)', en: 'Surveil' },
    definitionNormal: {
      de: 'Surveil N erlaubt, die obersten N Karten der Bibliothek anzusehen und beliebig viele davon in den Friedhof zu legen – der Rest bleibt in beliebiger Reihenfolge oben.',
      en: 'Surveil N lets you look at the top N cards of your library, put any number of them into the graveyard, and keep the rest on top in any order.',
    },
    definitionTrottel: {
      de: 'Surveil heißt: kurz in die Zukunft spicken und Müll direkt in den Friedhof sortieren.',
      en: 'Surveil means you get a sneak peek at what\'s coming and sort the trash straight into the graveyard.',
    },
    exampleCards: ['Memory Deluge'],
  },
  {
    id: 'adventure',
    category: 'keywords',
    term: { de: 'Adventure (Abenteuer)', en: 'Adventure' },
    definitionNormal: {
      de: 'Eine Adventure-Kreatur hat eine angehängte Zauberspruch-Hälfte (Spontan- oder Hexenmeisterzauber), die zuerst aus der Hand gewirkt werden darf; danach wird die Karte exiliert und kann später aus dem Exil als Kreatur gewirkt werden.',
      en: 'An Adventure creature has an attached spell half (instant or sorcery) you may cast first from hand; afterward the card is exiled and can later be cast as the creature from exile.',
    },
    definitionTrottel: {
      de: 'Adventure ist zwei Karten für den Preis von einer: erst den Zauber-Trip machen, danach die Kreatur aus dem Urlaub zurückholen.',
      en: 'Adventure is two cards for the price of one: take the spell on its little trip first, then bring the creature back from vacation.',
    },
    exampleCards: ['Brazen Borrower'],
  },
  {
    id: 'foretell',
    category: 'keywords',
    term: { de: 'Foretell (Vorahnung)', en: 'Foretell' },
    definitionNormal: {
      de: 'Foretell erlaubt, die Karte für {2} verdeckt aus der Hand zu exilieren und später zu den (meist günstigeren) Foretell-Kosten zu wirken.',
      en: 'Foretell lets you pay {2} to exile this card from hand face down, then later cast it for its (usually cheaper) foretell cost.',
    },
    definitionTrottel: {
      de: 'Foretell ist Zauber-Layaway: jetzt anzahlen und verstecken, später günstiger abholen.',
      en: 'Foretell is spell layaway: put it on hold now, pick it up cheaper later.',
    },
    exampleCards: ["Alrund's Epiphany"],
  },
  {
    id: 'boast',
    category: 'keywords',
    term: { de: 'Boast (Angeberei)', en: 'Boast' },
    definitionNormal: {
      de: 'Boast [Kosten] darf nur aktiviert werden, wenn diese Kreatur in diesem Zug angegriffen hat, gegen Bezahlung der angegebenen Kosten.',
      en: 'Boast [cost] can only be activated if this creature attacked this turn, by paying the stated cost.',
    },
    definitionTrottel: {
      de: 'Boast ist die Angeber-Fähigkeit: erst angreifen, dann darf die Kreatur auch noch prahlen.',
      en: 'Boast is the bragging-rights ability: attack first, then the creature gets to show off too.',
    },
    exampleCards: ['Tuskeri Firewalker'],
  },
  {
    id: 'mentor',
    category: 'keywords',
    term: { de: 'Mentor', en: 'Mentor' },
    definitionNormal: {
      de: 'Mentor löst aus, wenn diese Kreatur angreift: Eine angreifende Kreatur mit geringerer Stärke bekommt einen +1/+1-Marker.',
      en: 'Mentor triggers whenever this creature attacks: put a +1/+1 counter on target attacking creature with lesser power.',
    },
    definitionTrottel: {
      de: 'Mentor ist der Senior, der dem Azubi einen Tipp (und +1/+1) mit auf den Weg gibt.',
      en: 'Mentor is the senior creature giving the rookie a pep talk – and a +1/+1 counter.',
    },
  },
  {
    id: 'explore',
    category: 'keywords',
    term: { de: 'Explore (Erkundung)', en: 'Explore' },
    definitionNormal: {
      de: 'Explore deckt die oberste Bibliothekskarte auf: Ist sie ein Land, wandert sie in die Hand; sonst bekommt die Kreatur einen +1/+1-Marker, und die Karte bleibt oben liegen oder wandert in den Friedhof.',
      en: "Explore reveals your library's top card: a land goes to hand; otherwise the creature gets a +1/+1 counter and you choose to leave the card on top or put it in the graveyard.",
    },
    definitionTrottel: {
      de: 'Explore heißt: erst mal gucken, was oben liegt – Land gibt\'s geschenkt, alles andere gibt Muckis.',
      en: "Explore means peeking at what's on top – a land is a freebie, anything else buffs the creature instead.",
    },
    exampleCards: ['Merfolk Branchwalker'],
  },
  {
    id: 'disturb',
    category: 'keywords',
    term: { de: 'Disturb (Heimsuchung)', en: 'Disturb' },
    definitionNormal: {
      de: 'Disturb [Kosten] erlaubt, die Karte aus dem Friedhof als ihre transformierte Rückseite zu den Disturb-Kosten zu wirken.',
      en: 'Disturb [cost] lets you cast this card from your graveyard as its transformed back face, for its disturb cost.',
    },
    definitionTrottel: {
      de: 'Disturb heißt: die Karte kommt aus dem Friedhof zurück – allerdings als gruseligere Version ihrer selbst.',
      en: 'Disturb means the card comes back from the graveyard – just as a spookier version of itself.',
    },
  },
  {
    id: 'embalm',
    category: 'keywords',
    term: { de: 'Embalm (Einbalsamierung)', en: 'Embalm' },
    definitionNormal: {
      de: 'Embalm [Kosten] erlaubt, die Karte gegen die Kosten aus dem Friedhof zu exilieren und einen Kreaturen-Jeton zu erschaffen, der eine Kopie davon ist (zusätzlich Weiß und vom Kreaturentyp Zombie).',
      en: "Embalm [cost] lets you exile this card from your graveyard for the cost to create a creature token that's a copy of it (also white and a Zombie in addition to its other colors/types).",
    },
    definitionTrottel: {
      de: 'Embalm macht aus deiner toten Kreatur einen Zombie-Zwilling – kostenlos nachbestellbar, solange sie im Friedhof liegt.',
      en: 'Embalm turns your dead creature into a zombie twin – a free reorder as long as it\'s sitting in the graveyard.',
    },
    exampleCards: ['Angel of Invention'],
  },
  {
    id: 'eternalize',
    category: 'keywords',
    term: { de: 'Eternalize (Verewigung)', en: 'Eternalize' },
    definitionNormal: {
      de: 'Eternalize [Kosten] funktioniert wie Embalm, erschafft aber einen 4/4 schwarzen Zombie-Jeton (zusätzlich zu den ursprünglichen Typen), unabhängig von den Originalwerten.',
      en: "Eternalize [cost] works like embalm, but creates a 4/4 black Zombie token (in addition to the original's other types), regardless of the card's original stats.",
    },
    definitionTrottel: {
      de: 'Eternalize ist Embalms großer Bruder: der Zombie-Klon kommt gleich als 4/4-Muskelpaket, egal wie schwach das Original war.',
      en: "Eternalize is embalm's big brother: the zombie clone shows up as a 4/4 powerhouse, no matter how weak the original was.",
    },
    exampleCards: ['Lord of the Accursed'],
  },
  {
    id: 'afterlife',
    category: 'keywords',
    term: { de: 'Afterlife (Nachleben)', en: 'Afterlife' },
    definitionNormal: {
      de: 'Afterlife N erschafft beim Tod dieser Kreatur N fliegende 1/1-Geist-Jetons in Weiß und Schwarz.',
      en: 'Afterlife N creates N 1/1 white-and-black Spirit creature tokens with flying when this creature dies.',
    },
    definitionTrottel: {
      de: 'Afterlife heißt: stirbt die Kreatur, spuken hinterher ein paar Geister als Trostpreis rum.',
      en: 'Afterlife means when the creature dies, a few ghosts show up as a consolation prize.',
    },
    exampleCards: ['Doomed Dissenter'],
  },
  {
    id: 'jump-start',
    category: 'keywords',
    term: { de: 'Jump-Start (Neustart)', en: 'Jump-Start' },
    definitionNormal: {
      de: 'Jump-Start erlaubt, die Karte aus dem Friedhof zu wirken, indem man zusätzlich zu den Manakosten eine weitere Karte abwirft; danach wird sie exiliert.',
      en: "Jump-start lets you cast this card from your graveyard by discarding another card as an additional cost; it's exiled afterward.",
    },
    definitionTrottel: {
      de: 'Jump-Start heißt: Dein Zauber darf aus dem Friedhof zurückkommen – kostet dich halt eine andere Karte aus der Hand als Eintrittspreis.',
      en: "Jump-Start means your spell gets a second life from the graveyard – it just costs you another card from your hand as the cover charge.",
    },
  },
  {
    id: 'escape',
    category: 'keywords',
    term: { de: 'Escape (Entkommen)', en: 'Escape' },
    definitionNormal: {
      de: 'Escape [Kosten, N Karten aus dem Friedhof exilieren] erlaubt, die Karte aus dem Friedhof zu wirken, indem man die Escape-Kosten bezahlt und zusätzlich die angegebene Anzahl anderer Karten aus dem Friedhof exiliert.',
      en: 'Escape [cost, exile N cards] lets you cast this card from your graveyard by paying its escape cost and exiling the stated number of other cards from your graveyard.',
    },
    definitionTrottel: {
      de: 'Escape heißt: der Zauber bricht aus dem Friedhof aus – kostet nur ein bisschen Eintritt und ein paar Mitinsassen als Opfer.',
      en: 'Escape means the spell breaks out of the graveyard – it just costs a bit of admission and a few fellow inmates as sacrifice.',
    },
    exampleCards: ["Uro, Titan of Nature's Wrath"],
  },
  {
    id: 'affinity',
    category: 'keywords',
    term: { de: 'Affinity (Affinität)', en: 'Affinity' },
    definitionNormal: {
      de: 'Affinity für [Eigenschaft] (z. B. Affinity für Artefakte) senkt die Zauberkosten dieses Zaubers um {1} für jedes passende Permanent, das man kontrolliert.',
      en: "Affinity for [quality] (e.g. affinity for artifacts) reduces this spell's cost by {1} for each permanent you control matching that quality.",
    },
    definitionTrottel: {
      de: 'Affinity heißt: je mehr du vom Richtigen rumstehen hast, desto billiger wird der Zauber.',
      en: 'Affinity means the more of the right stuff you\'ve got lying around, the cheaper the spell gets.',
    },
    exampleCards: ['Frogmite'],
  },
  {
    id: 'morph',
    category: 'keywords',
    term: { de: 'Morph', en: 'Morph' },
    definitionNormal: {
      de: 'Eine Karte mit Morph darf verdeckt als farbloser 2/2 ohne Fähigkeiten gewirkt werden. Jederzeit darf ihre Morph-Kosten bezahlt werden, um sie offen umzudrehen und ihre wahre Identität zu enthüllen.',
      en: 'A card with morph can be cast face down as a vanilla 2/2 colorless creature. Its morph cost can be paid at any time to turn it face up, revealing its real identity.',
    },
    definitionTrottel: {
      de: 'Morph ist Verkleidung spielen: Erst ein nichtssagendes 2/2, dann zahlst du und die Maske fällt.',
      en: "Morph is playing dress-up: it's a nothing 2/2 at first, then you pay up and the mask comes off.",
    },
  },
  {
    id: 'megamorph',
    category: 'keywords',
    term: { de: 'Megamorph', en: 'Megamorph' },
    definitionNormal: {
      de: 'Funktioniert wie Morph, aber beim offenen Umdrehen kommt zusätzlich ein +1/+1-Marker auf die Kreatur.',
      en: 'Works like morph, but turning the creature face up also puts a +1/+1 counter on it.',
    },
    definitionTrottel: {
      de: 'Megamorph ist Morph mit Bonus – die Maske fällt, und gleich gibt\'s noch Muskeln dazu.',
      en: "Megamorph is morph with a bonus – the mask comes off and you get extra muscle too.",
    },
    relatedTerms: ['morph'],
  },
  {
    id: 'manifest',
    category: 'keywords',
    term: { de: 'Manifest', en: 'Manifest' },
    definitionNormal: {
      de: 'Die oberste Karte der Bibliothek kommt verdeckt als farbloser 2/2 ins Spiel. Ist es eine Kreaturenkarte, darf sie später kostenlos offen umgedreht werden.',
      en: "The top card of a library is put onto the battlefield face down as a vanilla 2/2. If it's a creature card, it can later be turned face up for free.",
    },
    definitionTrottel: {
      de: 'Manifest ist eine Überraschungstüte vom Bibliotheksstapel – ein 2/2 im Blindflug, das sich manchmal als echte Kreatur entpuppt.',
      en: 'Manifest is a mystery grab from the top of your library – a blind 2/2 that sometimes turns out to be a real creature underneath.',
    },
  },
  {
    id: 'unearth',
    category: 'keywords',
    term: { de: 'Unearth', en: 'Unearth' },
    definitionNormal: {
      de: 'Die Unearth-Kosten dürfen bezahlt werden, um die Karte aus dem Friedhof ins Spiel zurückzuholen. Verlässt sie danach das Spielfeld, wird sie stattdessen exiliert; hat sie angegriffen, wird sie am Zugende geopfert.',
      en: "Paying the unearth cost returns the card from the graveyard to the battlefield. If it would later leave the battlefield, it's exiled instead; if it attacked, it's sacrificed at end of turn.",
    },
    definitionTrottel: {
      de: 'Unearth ist ein Kurzurlaub aus dem Friedhof – kommt zurück, haut noch mal zu, und verschwindet dann für immer.',
      en: 'Unearth is a brief furlough from the graveyard – it comes back, gets one more hit in, then disappears for good.',
    },
  },
  {
    id: 'dash',
    category: 'keywords',
    term: { de: 'Dash', en: 'Dash' },
    definitionNormal: {
      de: 'Eine Kreatur mit Dash darf für ihre Dash-Kosten gewirkt werden. Sie bekommt Hast und kehrt am Ende des Zuges in die Hand ihrer Besitzerin zurück.',
      en: "A creature with dash may be cast for its dash cost instead. It gains haste and returns to its owner's hand at the end of the turn.",
    },
    definitionTrottel: {
      de: 'Dash ist ein Hit-and-Run: reinstürmen, zuschlagen, und noch vor Zugende wieder in der Hand verschwinden.',
      en: "Dash is hit-and-run: charge in, swing once, and vanish back into your hand before the turn even ends.",
    },
  },
  {
    id: 'riot',
    category: 'keywords',
    term: { de: 'Riot', en: 'Riot' },
    definitionNormal: {
      de: 'Eine Kreatur mit Riot kommt wahlweise mit einem +1/+1-Marker oder mit Hast ins Spiel – die kontrollierende Spielerin entscheidet beim Einsatz.',
      en: 'A creature with riot enters with either a +1/+1 counter or haste, your choice as it enters.',
    },
    definitionTrottel: {
      de: 'Riot heißt: größer oder schneller – so oder so kommt sofort Ärger auf den Tisch.',
      en: 'Riot means bigger or faster – either way, trouble lands on the table right away.',
    },
  },
  {
    id: 'exert',
    category: 'keywords',
    term: { de: 'Exert', en: 'Exert' },
    definitionNormal: {
      de: 'Beim Angreifen darf eine Kreatur mit Exert erschöpft werden, um einen Zusatzeffekt auszulösen. Tut sie das, enttappt sie in ihrem nächsten Enttapp-Schritt nicht.',
      en: "As it attacks, a creature with exert may be exerted for a bonus effect. If you do, it doesn't untap during your next untap step.",
    },
    definitionTrottel: {
      de: 'Exert heißt: alles geben, dafür am nächsten Tag ausgepowert liegen bleiben.',
      en: 'Exert means give it everything – and lie there exhausted the next turn as the price.',
    },
  },
  {
    id: 'amass',
    category: 'keywords',
    term: { de: 'Amass', en: 'Amass' },
    definitionNormal: {
      de: 'Amass N legt N +1/+1-Marker auf eine kontrollierte Armee-Kreatur – besitzt man noch keine, wird zuerst ein 0/0 schwarzer Armee-Token des angegebenen Typs erschaffen.',
      en: "Amass N puts N +1/+1 counters on an Army creature you control, creating a 0/0 black Army token of the stated type first if you don't already have one.",
    },
    definitionTrottel: {
      de: 'Amass baut dir eine eigene kleine Zombie-Armee auf, die mit jedem Mal nur noch dicker wird.',
      en: 'Amass grows you your own little zombie army, getting beefier every time you use it.',
    },
  },
  {
    id: 'mutate',
    category: 'keywords',
    term: { de: 'Mutate', en: 'Mutate' },
    definitionNormal: {
      de: 'Für ihre Mutate-Kosten darf eine Kreatur auf einer anderen, nicht-menschlichen Kreatur, die man besitzt und kontrolliert, gewirkt werden. Beide verschmelzen zu einer Kreatur mit den Grundwerten der untersten Karte, aber allen Fähigkeiten beider.',
      en: 'For its mutate cost, a creature can be cast on top of another non-Human creature you own and control. The two merge into one creature using the base characteristics of the bottom card, but keeping every ability from both.',
    },
    definitionTrottel: {
      de: 'Mutate ist Huckepack für Monster – eine Kreatur springt auf eine andere drauf, und raus kommt ein Frankenstein-Kombo aus beiden.',
      en: 'Mutate is piggyback for monsters – one creature hops onto another, and out comes a Frankenstein combo of both.',
    },
  },
  {
    id: 'companion',
    category: 'keywords',
    term: { de: 'Companion (Gefährte)', en: 'Companion' },
    definitionNormal: {
      de: 'Ein Gefährte ist eine Deckbau-Einschränkung auf einer Karte im Sideboard: Erfüllt das gesamte Deck ihre genannte Bedingung, darf sie einmal pro Spiel gegen Bezahlung ihrer Kosten in die eigene Hand geholt werden.',
      en: "Companion is a deckbuilding restriction on a card in your sideboard: if your entire deck meets its stated condition, you may pay its cost once per game to put it into your hand.",
    },
    definitionTrottel: {
      de: 'Ein Companion ist dein Deck-Streber: Hält sich dein ganzes Deck an die Regeln, darfst du ihn einmal pro Spiel aus dem Nichts in die Hand ziehen.',
      en: "A companion is your deck's teacher's pet: keep your whole deck in line with its rule, and once per game you get to pull it into your hand out of nowhere.",
    },
  },
  {
    id: 'reconfigure',
    category: 'keywords',
    term: { de: 'Reconfigure', en: 'Reconfigure' },
    definitionNormal: {
      de: 'Für ihre Reconfigure-Kosten darf diese Ausrüstungs-Kreatur an eine andere kontrollierte Kreatur angelegt werden – solange sie angelegt ist, ist sie selbst keine Kreatur mehr, sondern nur eine Ausrüstung. Verlässt die Trägerkreatur das Spiel, löst sie sich wieder.',
      en: "For its reconfigure cost, this Equipment creature can attach to another creature you control - while attached, it's not a creature itself, just an Equipment. If the creature it's attached to leaves, it detaches.",
    },
    definitionTrottel: {
      de: 'Reconfigure-Kreaturen sind wandelnde Rüstungen – laufen erst als eigenes Monster rum, schnallen sich dann aber lieber auf ein anderes drauf.',
      en: "Reconfigure creatures are walking armor – they stomp around as their own monster at first, but would rather strap themselves onto another one.",
    },
  },
  {
    id: 'training',
    category: 'keywords',
    term: { de: 'Training', en: 'Training' },
    definitionNormal: {
      de: 'Greift eine Kreatur mit Training zusammen mit einer stärkeren Kreatur an, bekommt sie einen +1/+1-Marker.',
      en: 'Whenever a creature with training attacks alongside a creature with greater power, it gets a +1/+1 counter.',
    },
    definitionTrottel: {
      de: 'Training heißt: lauf mit den Großen mit, und du wirst selbst ein bisschen größer.',
      en: 'Training means tag along with the big ones, and you grow a little yourself.',
    },
  },
  {
    id: 'blitz',
    category: 'keywords',
    term: { de: 'Blitz', en: 'Blitz' },
    definitionNormal: {
      de: 'Für ihre Blitz-Kosten gewirkt, bekommt die Kreatur Hast und "immer wenn diese Kreatur Kampfschaden zufügt, ziehe eine Karte" – am Ende des Zuges wird sie geopfert.',
      en: 'Cast for its blitz cost, the creature gains haste and "whenever this creature deals combat damage, draw a card" - then it\'s sacrificed at end of turn.',
    },
    definitionTrottel: {
      de: 'Blitz ist ein einziger Overdrive-Zug: reinrennen, zuschlagen, Karte ziehen, dann geht die Kreatur drauf.',
      en: "Blitz is one single overdrive turn: run in, hit, draw a card, then the creature's toast.",
    },
  },
  {
    id: 'casualty',
    category: 'keywords',
    term: { de: 'Casualty', en: 'Casualty' },
    definitionNormal: {
      de: 'Casualty N erlaubt als Zusatzkosten, eine Kreatur mit Stärke N oder mehr zu opfern, um diesen Zauber zu kopieren.',
      en: 'Casualty N lets you, as an additional cost, sacrifice a creature with power N or greater to copy this spell.',
    },
    definitionTrottel: {
      de: 'Casualty heißt: ein Monster drauflegen, dafür gibt\'s den Zauber gratis ein zweites Mal.',
      en: 'Casualty means throw a creature on the pile, and the spell happens twice for free.',
    },
  },
  {
    id: 'connive',
    category: 'keywords',
    term: { de: 'Connive', en: 'Connive' },
    definitionNormal: {
      de: 'Connive heißt: eine Karte ziehen, dann eine Karte abwerfen. War die abgeworfene Karte kein Land, bekommt die Kreatur einen +1/+1-Marker.',
      en: "Connive means draw a card, then discard a card. If the discarded card wasn't a land, the creature gets a +1/+1 counter.",
    },
    definitionTrottel: {
      de: 'Connive ist Aussortieren mit Belohnung: ziehen, Müll abwerfen, und wenn\'s kein Land war, wird die Kreatur dicker.',
      en: "Connive is sorting with a reward: draw, toss the junk, and if it wasn't a land, the creature bulks up.",
    },
  },
  {
    id: 'bargain',
    category: 'keywords',
    term: { de: 'Bargain', en: 'Bargain' },
    definitionNormal: {
      de: 'Als Zusatzkosten darf wahlweise ein Artefakt, eine Verzauberung oder ein Token geopfert werden, um diesen Zauber mit einem Bonuseffekt zu wirken.',
      en: 'As an additional cost, you may sacrifice an artifact, enchantment, or token to cast this spell with a bonus effect.',
    },
    definitionTrottel: {
      de: 'Bargain ist Handeln auf dem Flohmarkt: wirf was vom Tisch, und der Zauber wird besser.',
      en: 'Bargain is haggling at the flea market: throw something off the table, and the spell gets better.',
    },
  },
  {
    id: 'saddle',
    category: 'keywords',
    term: { de: 'Saddle', en: 'Saddle' },
    definitionNormal: {
      de: 'Saddle N erlaubt, als hexereigeschwindigkeits-gebundene Aktion beliebig viele ungetappte, kontrollierte Kreaturen mit zusammen mindestens Stärke N zu tappen, um die Saddle-Fähigkeit dieser Reittier-Kreatur zu aktivieren.',
      en: "Saddle N is a sorcery-speed action: tap any number of untapped creatures you control with total power N or greater to activate this Mount creature's saddle ability.",
    },
    definitionTrottel: {
      de: 'Saddle heißt: schnall genug Mitstreiter zusammen, dann darfst du auf das Reittier aufsteigen.',
      en: 'Saddle means rally enough buddies together, and you get to climb onto the mount.',
    },
  },
  {
    id: 'craft',
    category: 'keywords',
    term: { de: 'Craft', en: 'Craft' },
    definitionNormal: {
      de: 'Für ihre Craft-Kosten darf diese Karte (meist aus dem Exil, oft durch Exilieren bestimmter anderer Karten gebaut) in ihre mächtigere Rückseite verwandelt werden.',
      en: 'For its craft cost, this card (usually from exile, often built by exiling specific other cards) can be transformed into its more powerful back face.',
    },
    definitionTrottel: {
      de: 'Craft ist Basteln am Werktisch: wirf die richtigen Zutaten rein, und aus der Karte wird was Stärkeres.',
      en: 'Craft is tinkering at the workbench: throw in the right ingredients, and the card levels up into something stronger.',
    },
  },
  // NOTE: Plot's exact current Oracle wording/timing restrictions were not independently re-verified this session
  // (introduced in Duskmourn: House of Horror, 2024) - double-check against Scryfall before publishing if precision matters.
  {
    id: 'plot',
    category: 'keywords',
    term: { de: 'Plot', en: 'Plot' },
    definitionNormal: {
      de: 'Gegen die Plot-Kosten darf diese Karte aus der Hand exiliert werden. An einem späteren eigenen Zug darf sie von dort als Hexerei gewirkt werden, ohne ihre Manakosten zu bezahlen.',
      en: 'For its plot cost, this card may be exiled from hand. On a later turn of yours, it may be cast from exile as a sorcery without paying its mana cost.',
    },
    definitionTrottel: {
      de: 'Plot heißt: heute schon vorbestellen, später kostenlos abholen.',
      en: 'Plot means pre-order today, pick it up for free later.',
    },
  },
  {
    id: 'discover',
    category: 'keywords',
    term: { de: 'Discover', en: 'Discover' },
    definitionNormal: {
      de: 'Discover N exiliert Karten vom Bibliotheksende, bis eine nicht-Land-Karte mit Manawert N oder weniger exiliert wird. Diese darf kostenlos gewirkt oder auf die Hand genommen werden; der Rest kommt in zufälliger Reihenfolge nach unten.',
      en: 'Discover N exiles cards from the top of your library until a nonland card with mana value N or less is exiled. That card may be cast for free or put into your hand; the rest go to the bottom in a random order.',
    },
    definitionTrottel: {
      de: 'Discover ist Blindziehen mit Lotterie: Karten umdrehen, bis ein günstiger Fund dabei ist, den du dann umsonst zünden darfst.',
      en: 'Discover is a blind-draw lottery: flip cards until you hit something cheap enough, then fire it off for free.',
    },
  },
  {
    id: 'backup',
    category: 'keywords',
    term: { de: 'Backup N', en: 'Backup N' },
    definitionNormal: {
      de: 'Backup N legt N +1/+1-Marker auf diese Kreatur. Zielt die Fähigkeit auf eine andere Kreatur, erhält diese zusätzlich bis zum Ende des Zuges alle aufgelisteten Fähigkeiten dieser Kreatur.',
      en: "Backup N puts N +1/+1 counters on this creature. If it targeted another creature, that creature also gains this creature's listed abilities until end of turn.",
    },
    definitionTrottel: {
      de: 'Backup heißt: Entweder du pumpst dich selbst auf, oder du leihst einem Kumpel kurz deine Superkräfte.',
      en: "Backup means: either you buff yourself, or you lend a buddy your superpowers for a turn.",
    },
  },
  // NOTE: newer mechanic (2024) - double-check details before publishing.
  {
    id: 'impending',
    category: 'keywords',
    term: { de: 'Impending N', en: 'Impending N' },
    definitionNormal: {
      de: 'Impending N erlaubt, die Karte zunächst nur als Verzauberung mit N Zeitmarkern zu wirken; jeden eigenen Zug wird einer entfernt, und ist der letzte weg, wird sie zur Kreatur.',
      en: 'Impending N lets you cast the card as an enchantment-only permanent with N time counters first; one is removed each of your turns, and once the last is gone, it becomes a creature.',
    },
    definitionTrottel: {
      de: 'Impending heißt: Dein Monster schlüpft erst in ein paar Zügen aus dem Ei – bis dahin ist es nur Deko.',
      en: "Impending means your monster hatches a few turns later – until then it's just decoration.",
    },
  },
  {
    id: 'gift',
    category: 'keywords',
    term: { de: 'Gift', en: 'Gift' },
    definitionNormal: {
      de: 'Gift (ein [Geschenk]) erlaubt, beim Auflösen des Zaubers einem Gegner das angegebene Geschenk (z. B. eine Karte, einen Token) zu geben – im Austausch für einen Bonuseffekt bei dir.',
      en: "Gift (a [gift]) lets you, as the spell resolves, optionally give an opponent the stated gift (e.g. a card, a token) in exchange for a bonus effect on your side.",
    },
    definitionTrottel: {
      de: 'Gift heißt: Du bestichst den Gegner mit einem kleinen Geschenk, damit du selbst den dicken Bonus bekommst.',
      en: "Gift means you bribe your opponent with a small present so you get the big bonus.",
    },
  },
  {
    id: 'offspring',
    category: 'keywords',
    term: { de: 'Offspring', en: 'Offspring' },
    definitionNormal: {
      de: 'Offspring [Kosten] ist eine optionale Zusatzkosten beim Wirken einer Kreaturenkarte: Zahlst du sie, entsteht zusätzlich ein 1/1-Marken-Abbild der Kreatur.',
      en: "Offspring [cost] is an optional additional cost when casting a creature spell: pay it, and you also create a 1/1 token copy of the creature.",
    },
    definitionTrottel: {
      de: 'Offspring heißt: Für ein bisschen mehr Mana gibt\'s eine Mini-Kopie gratis dazu.',
      en: "Offspring means: pay a little extra mana and get a mini-copy thrown in for free.",
    },
  },
  {
    id: 'forage',
    category: 'keywords',
    term: { de: 'Forage', en: 'Forage' },
    definitionNormal: {
      de: 'Forage erlaubt, als Kosten oder Effekt eine Karte aus einem Friedhof zu exilieren oder einen Food-Marker zu opfern, um einen Bonuseffekt auszulösen.',
      en: "Forage lets you, as a cost or effect, exile a card from a graveyard or sacrifice a Food token to trigger a bonus effect.",
    },
    definitionTrottel: {
      de: 'Forage heißt: Wühl im Müll oder opfer einen Snack, dann gibt\'s eine Belohnung.',
      en: "Forage means: dig through the trash or sacrifice a snack, and you get a reward.",
    },
  },
  {
    id: 'valiant',
    category: 'keywords',
    term: { de: 'Valiant', en: 'Valiant' },
    definitionNormal: {
      de: 'Valiant löst aus, sobald diese Kreatur in diesem Zug zum ersten Mal von einem eigenen Zauber oder einer eigenen Fähigkeit als Ziel gewählt wird.',
      en: "Valiant triggers the first time this creature becomes the target of a spell or ability you control each turn.",
    },
    definitionTrottel: {
      de: 'Valiant heißt: Zielst du zum ersten Mal in diesem Zug auf dein eigenes Monster, feiert es das mit einem Bonus.',
      en: "Valiant means: the first time this turn you target your own creature, it celebrates with a bonus.",
    },
  },
  {
    id: 'room',
    category: 'keywords',
    term: { de: 'Room', en: 'Room' },
    definitionNormal: {
      de: 'Room ist ein Verzauberungs-Subtyp mit zwei Hälften ("Zimmern"): Man beginnt mit der ersten, die zweite wird später zu Hexenmeister-Geschwindigkeit für eigene Kosten freigeschaltet.',
      en: 'Room is an enchantment subtype with two halves ("rooms"): you start with the first, and unlock the second later at sorcery speed for its own cost.',
    },
    definitionTrottel: {
      de: 'Room heißt: Dein Haus hat zwei Zimmer – das zweite schließt du erst später auf, wenn du dafür bezahlst.',
      en: "Room means your house has two rooms – you only unlock the second one later, once you pay for it.",
    },
  },
  {
    id: 'eerie',
    category: 'keywords',
    term: { de: 'Eerie', en: 'Eerie' },
    definitionNormal: {
      de: 'Eerie löst aus, sobald eine eigene Verzauberung ins Spiel kommt oder ein eigenes Room-Zimmer freigeschaltet wird.',
      en: "Eerie triggers whenever an enchantment you control enters, or a Room you control is unlocked.",
    },
    definitionTrottel: {
      de: 'Eerie heißt: Jedes Mal, wenn du eine neue Verzauberung aufstellst oder ein Zimmer aufschließt, passiert was Gruseliges – zu deinem Vorteil.',
      en: "Eerie means: every time you set up a new enchantment or unlock a room, something spooky happens – in your favor.",
    },
    relatedTerms: ['room'],
  },
  {
    id: 'addendum',
    category: 'keywords',
    term: { de: 'Addendum', en: 'Addendum' },
    definitionNormal: {
      de: 'Addendum ist ein Ability Word ohne eigene feste Regeltext-Bedeutung – es markiert einen Bonuseffekt, der nur eintritt, wenn der Zauber während der eigenen Hauptphase gewirkt wurde.',
      en: "Addendum is an ability word with no fixed rules text of its own - it flags a bonus effect that only applies if the spell was cast during your own main phase.",
    },
    definitionTrottel: {
      de: 'Addendum heißt: Wirkst du\'s genau in deiner Hauptphase, gibt\'s ein Extra obendrauf.',
      en: "Addendum means: cast it during your own main phase specifically, and you get a little extra.",
    },
  },
  {
    id: 'battalion',
    category: 'keywords',
    term: { de: 'Battalion', en: 'Battalion' },
    definitionNormal: {
      de: 'Battalion ist ein Ability Word für Effekte, die eintreten, wenn diese Kreatur zusammen mit mindestens zwei weiteren eigenen Kreaturen angreift.',
      en: "Battalion is an ability word for effects that trigger when this creature attacks along with at least two other creatures you control.",
    },
    definitionTrottel: {
      de: 'Battalion heißt: Drei oder mehr Kreaturen greifen gemeinsam an, dann gibt\'s Extra-Power.',
      en: "Battalion means: three or more creatures attack together, and you get bonus power.",
    },
  },
  {
    id: 'bloodrush',
    category: 'keywords',
    term: { de: 'Bloodrush', en: 'Bloodrush' },
    definitionNormal: {
      de: 'Bloodrush ist ein Ability Word, das eine Karte beschreibt, die man wie einen Zauber abwerfen kann, um einer angreifenden Kreatur Kampfwerte zu verleihen, statt sie normal zu wirken.',
      en: "Bloodrush is an ability word describing a card you can discard, as an alternative to casting it, to pump an attacking creature's stats.",
    },
    definitionTrottel: {
      de: 'Bloodrush heißt: Statt die Karte zu wirken, wirfst du sie weg und pumpst dafür deinen Angreifer auf.',
      en: "Bloodrush means: instead of casting the card, you discard it to pump up your attacker.",
    },
  },
  {
    id: 'channel',
    category: 'keywords',
    term: { de: 'Channel', en: 'Channel' },
    definitionNormal: {
      de: 'Channel ist ein Ability Word für eine alternative Fähigkeit, die eine Karte aus der Hand abwirft, um einen einmaligen Effekt auszulösen, statt sie normal zu wirken.',
      en: "Channel is an ability word for an alternative ability that discards a card from hand to trigger a one-time effect, instead of casting it normally.",
    },
    definitionTrottel: {
      de: 'Channel heißt: Statt zu wirken, wirfst du die Karte weg und bekommst dafür einen Sondereffekt.',
      en: "Channel means: instead of casting it, you discard the card for a special one-off effect.",
    },
  },
  {
    id: 'chroma',
    category: 'keywords',
    term: { de: 'Chroma', en: 'Chroma' },
    definitionNormal: {
      de: 'Chroma ist ein Ability Word für Effekte, die die Anzahl bestimmter Manasymbole in den Manakosten relevanter Karten (z. B. im eigenen Friedhof oder auf dem Spielfeld) zählen.',
      en: "Chroma is an ability word for effects that count how many of a specific mana symbol appear in the mana costs of relevant cards (e.g. in your graveyard or on the battlefield).",
    },
    definitionTrottel: {
      de: 'Chroma heißt: Je mehr von einer bestimmten Farbe du im Spiel hast, desto besser der Bonus.',
      en: "Chroma means: the more of one specific color you have around, the bigger the bonus.",
    },
  },
  {
    id: 'domain',
    category: 'keywords',
    term: { de: 'Domain', en: 'Domain' },
    definitionNormal: {
      de: 'Domain ist ein Ability Word für Effekte, deren Stärke von der Anzahl unterschiedlicher Standard-Ländertypen abhängt, die man unter Kontrolle hat.',
      en: "Domain is an ability word for effects whose strength depends on the number of different basic land types you control.",
    },
    definitionTrottel: {
      de: 'Domain heißt: Je bunter deine Länder gemischt sind, desto stärker der Effekt.',
      en: "Domain means: the more varied your lands, the stronger the effect.",
    },
  },
  {
    id: 'enrage',
    category: 'keywords',
    term: { de: 'Enrage', en: 'Enrage' },
    definitionNormal: {
      de: 'Enrage ist ein Ability Word für Effekte, die auslösen, sobald diese Kreatur Schaden erleidet.',
      en: "Enrage is an ability word for effects that trigger whenever this creature is dealt damage.",
    },
    definitionTrottel: {
      de: 'Enrage heißt: Hau drauf, und sie wird nur noch wütender (und stärker).',
      en: "Enrage means: hit it, and it just gets angrier (and stronger).",
    },
  },
  {
    id: 'fateful-hour',
    category: 'keywords',
    term: { de: 'Fateful Hour', en: 'Fateful Hour' },
    definitionNormal: {
      de: 'Fateful Hour ist ein Ability Word für Effekte, die nur greifen, solange man 5 oder weniger Lebenspunkte hat.',
      en: "Fateful Hour is an ability word for effects that only apply while you're at 5 life or less.",
    },
    definitionTrottel: {
      de: 'Fateful Hour heißt: Erst wenn\'s richtig eng wird (5 Leben oder weniger), zündet der Bonus.',
      en: "Fateful Hour means: only once things get really dicey (5 life or less) does the bonus kick in.",
    },
  },
  {
    id: 'ferocious',
    category: 'keywords',
    term: { de: 'Ferocious', en: 'Ferocious' },
    definitionNormal: {
      de: 'Ferocious ist ein Ability Word für Effekte, die greifen, solange man eine Kreatur mit Stärke 4 oder mehr kontrolliert.',
      en: "Ferocious is an ability word for effects that apply while you control a creature with power 4 or greater.",
    },
    definitionTrottel: {
      de: 'Ferocious heißt: Hast du einen dicken Brocken (Stärke 4+) im Spiel, gibt\'s den Bonus.',
      en: "Ferocious means: if you've got a big beefy creature (power 4+) around, you get the bonus.",
    },
  },
  {
    id: 'grandeur',
    category: 'keywords',
    term: { de: 'Grandeur', en: 'Grandeur' },
    definitionNormal: {
      de: 'Grandeur ist ein Ability Word für eine Fähigkeit, bei der man eine zweite Kopie derselben legendären Karte aus der Hand abwirft, um einen einmaligen Effekt auszulösen.',
      en: "Grandeur is an ability word for an ability where you discard a second copy of the same legendary card from hand to trigger a one-time effect.",
    },
    definitionTrottel: {
      de: 'Grandeur heißt: Du hast eine zweite Kopie deines Legendären auf der Hand? Wirf sie weg für einen fetten Bonus.',
      en: "Grandeur means: got a second copy of your legendary in hand? Discard it for a juicy bonus.",
    },
    relatedTerms: ['legend-rule'],
  },
  {
    id: 'hellbent',
    category: 'keywords',
    term: { de: 'Hellbent', en: 'Hellbent' },
    definitionNormal: {
      de: 'Hellbent ist ein Ability Word für Effekte, die greifen, solange man keine Karten auf der Hand hat.',
      en: "Hellbent is an ability word for effects that apply while you have no cards in hand.",
    },
    definitionTrottel: {
      de: 'Hellbent heißt: Hand leer? Dann wird\'s erst richtig gut.',
      en: "Hellbent means: empty hand? That's when things get good.",
    },
  },
  {
    id: 'heroic',
    category: 'keywords',
    term: { de: 'Heroic', en: 'Heroic' },
    definitionNormal: {
      de: 'Heroic ist ein Ability Word für Effekte, die auslösen, sobald man diese Kreatur mit einem eigenen Zauber als Ziel wählt.',
      en: "Heroic is an ability word for effects that trigger whenever you target this creature with a spell you control.",
    },
    definitionTrottel: {
      de: 'Heroic heißt: Zielst du mit einem eigenen Zauber auf diese Kreatur, wird sie zum Helden und bekommt einen Bonus.',
      en: "Heroic means: target this creature with your own spell, and it turns heroic and gets a bonus.",
    },
  },
  {
    id: 'imprint',
    category: 'keywords',
    term: { de: 'Imprint', en: 'Imprint' },
    definitionNormal: {
      de: 'Imprint ist ein Ability Word für eine Fähigkeit, bei der eine Karte beim Spielen eine andere Karte exiliert, deren Eigenschaften dann einen laufenden Effekt beeinflussen.',
      en: "Imprint is an ability word for an ability where a card exiles another card as it enters, and that exiled card's characteristics then affect an ongoing effect.",
    },
    definitionTrottel: {
      de: 'Imprint heißt: Du fütterst die Karte mit einer anderen, und die beeinflusst dauerhaft, was sie kann.',
      en: "Imprint means: you feed the card another card, and that one permanently shapes what it can do.",
    },
  },
  {
    id: 'join-forces',
    category: 'keywords',
    term: { de: 'Join Forces', en: 'Join Forces' },
    definitionNormal: {
      de: 'Join Forces ist ein Ability Word für eine Fähigkeit, bei der alle Spielerinnen reihum optional Mana beisteuern dürfen, um einen gemeinsam skalierenden Effekt zu verstärken.',
      en: "Join Forces is an ability word for an ability where all players take turns optionally contributing mana to scale up a shared effect.",
    },
    definitionTrottel: {
      de: 'Join Forces heißt: Alle am Tisch dürfen mitzahlen, damit der Effekt richtig fett wird.',
      en: "Join Forces means: everyone at the table can chip in mana to make the effect really big.",
    },
  },
  {
    id: 'kinship',
    category: 'keywords',
    term: { de: 'Kinship', en: 'Kinship' },
    definitionNormal: {
      de: 'Kinship ist ein Ability Word für eine Fähigkeit, bei der man zu Beginn des eigenen Zuges die oberste Bibliothekskarte ansieht und bei gleichem Kartentyp einen Bonuseffekt bekommt.',
      en: "Kinship is an ability word for an ability where, at the beginning of your turn, you look at the top card of your library and get a bonus effect if it shares a card type.",
    },
    definitionTrottel: {
      de: 'Kinship heißt: Guck dir die oberste Karte an – ist sie "verwandt", gibt\'s was Gutes.',
      en: 'Kinship means: peek at the top card – if it\'s a "relative", you get something nice.',
    },
  },
  {
    id: 'landfall',
    category: 'keywords',
    term: { de: 'Landfall', en: 'Landfall' },
    definitionNormal: {
      de: 'Landfall ist ein Ability Word für Effekte, die auslösen, sobald ein Land unter die eigene Kontrolle kommt.',
      en: "Landfall is an ability word for effects that trigger whenever a land enters the battlefield under your control.",
    },
    definitionTrottel: {
      de: 'Landfall heißt: Jedes Mal, wenn ein Land bei dir landet, gibt\'s einen kleinen Bonus obendrauf.',
      en: "Landfall means: every time a land lands on your side, you get a little bonus.",
    },
    relatedTerms: ['card-type-land'],
  },
  {
    id: 'metalcraft',
    category: 'keywords',
    term: { de: 'Metalcraft', en: 'Metalcraft' },
    definitionNormal: {
      de: 'Metalcraft ist ein Ability Word für Effekte, die greifen, solange man drei oder mehr Artefakte kontrolliert.',
      en: "Metalcraft is an ability word for effects that apply while you control three or more artifacts.",
    },
    definitionTrottel: {
      de: 'Metalcraft heißt: Drei oder mehr Artefakte im Spiel, dann läuft der Bonus.',
      en: "Metalcraft means: three or more artifacts out, and the bonus is live.",
    },
    relatedTerms: ['card-type-artifact'],
  },
  {
    id: 'morbid',
    category: 'keywords',
    term: { de: 'Morbid', en: 'Morbid' },
    definitionNormal: {
      de: 'Morbid ist ein Ability Word für Effekte, die greifen, wenn in diesem Zug bereits eine Kreatur gestorben ist.',
      en: "Morbid is an ability word for effects that apply if a creature died this turn already.",
    },
    definitionTrottel: {
      de: 'Morbid heißt: Ist in diesem Zug schon was gestorben, gibt\'s den Bonus.',
      en: "Morbid means: if something already died this turn, you get the bonus.",
    },
    relatedTerms: ['sba-mid-combat'],
  },
  {
    id: 'radiance',
    category: 'keywords',
    term: { de: 'Radiance', en: 'Radiance' },
    definitionNormal: {
      de: 'Radiance ist ein Ability Word für eine Fähigkeit, bei der ein Effekt, der normalerweise ein einzelnes Ziel hat, zusätzlich auf alles ausgedehnt wird, das mit dem Ziel eine Eigenschaft (z. B. Farbe) teilt.',
      en: "Radiance is an ability word for an ability where an otherwise single-target effect also extends to everything sharing a quality (e.g. color) with that target.",
    },
    definitionTrottel: {
      de: 'Radiance heißt: Du zielst auf eins, aber alles mit der gleichen Farbe kriegt automatisch mit ab.',
      en: "Radiance means: you target one thing, but everything sharing its color gets hit too.",
    },
  },
  {
    id: 'raid',
    category: 'keywords',
    term: { de: 'Raid', en: 'Raid' },
    definitionNormal: {
      de: 'Raid ist ein Ability Word für Effekte, die greifen, wenn man in diesem Zug bereits mit einer Kreatur angegriffen hat.',
      en: "Raid is an ability word for effects that apply if you attacked with a creature this turn already.",
    },
    definitionTrottel: {
      de: 'Raid heißt: Hast du in diesem Zug schon angegriffen, gibt\'s den Bonus gratis dazu.',
      en: "Raid means: already attacked this turn? The bonus comes free.",
    },
  },
  {
    id: 'rally',
    category: 'keywords',
    term: { de: 'Rally', en: 'Rally' },
    definitionNormal: {
      de: 'Rally ist ein Ability Word für Effekte, die auslösen, sobald ein Verbündeter (Ally) unter die eigene Kontrolle kommt.',
      en: "Rally is an ability word for effects that trigger whenever an Ally enters the battlefield under your control.",
    },
    definitionTrottel: {
      de: 'Rally heißt: Jedes Mal, wenn ein Verbündeter auftaucht, gibt\'s einen Schub für die ganze Truppe.',
      en: "Rally means: every time an Ally shows up, the whole squad gets a boost.",
    },
  },
  {
    id: 'sweep',
    category: 'keywords',
    term: { de: 'Sweep', en: 'Sweep' },
    definitionNormal: {
      de: 'Sweep ist ein Ability Word für eine Fähigkeit, bei der man Länder eines bestimmten Typs zurück auf die Hand legt, um die Stärke eines Effekts danach zu bestimmen.',
      en: "Sweep is an ability word for an ability where you return lands of a specific type to hand to determine an effect's strength based on how many you returned.",
    },
    definitionTrottel: {
      de: 'Sweep heißt: Leg ein paar passende Länder zurück auf die Hand, und der Effekt wird entsprechend fetter.',
      en: "Sweep means: bounce some matching lands back to hand, and the effect scales up accordingly.",
    },
    relatedTerms: ['card-type-land'],
  },
  {
    id: 'threshold',
    category: 'keywords',
    term: { de: 'Threshold', en: 'Threshold' },
    definitionNormal: {
      de: 'Threshold ist ein Ability Word für Effekte, die greifen, solange man 7 oder mehr Karten im eigenen Friedhof hat.',
      en: "Threshold is an ability word for effects that apply while you have 7 or more cards in your graveyard.",
    },
    definitionTrottel: {
      de: 'Threshold heißt: Ist dein Friedhof erstmal voll genug (7+ Karten), schaltet sich der Bonus frei.',
      en: "Threshold means: once your graveyard is stuffed enough (7+ cards), the bonus kicks in.",
    },
  },
  {
    id: 'undergrowth',
    category: 'keywords',
    term: { de: 'Undergrowth', en: 'Undergrowth' },
    definitionNormal: {
      de: 'Undergrowth ist ein Ability Word für Effekte, deren Stärke von der Anzahl der Kreaturenkarten im eigenen Friedhof abhängt.',
      en: "Undergrowth is an ability word for effects whose strength depends on how many creature cards are in your graveyard.",
    },
    definitionTrottel: {
      de: 'Undergrowth heißt: Je mehr tote Kreaturen in deinem Friedhof liegen, desto größer der Bonus.',
      en: "Undergrowth means: the more dead creatures piled up in your graveyard, the bigger the bonus.",
    },
  },
  {
    id: 'absorb',
    category: 'keywords',
    term: { de: 'Absorb', en: 'Absorb' },
    definitionNormal: {
      de: 'Eine Kreatur mit Absorb hat Schild-Marker. Würde ihr Schaden zugefügt werden, wird stattdessen ein Schild-Marker entfernt und der Schaden verhindert.',
      en: 'A creature with absorb has shield counters. If it would be dealt damage, a shield counter is removed instead and the damage is prevented.',
    },
    definitionTrottel: {
      de: 'Absorb ist wie ein Extraleben: Statt Schaden zu kassieren, platzt einfach ein Schild-Marker.',
      en: 'Absorb is like an extra life – instead of taking the hit, a shield counter just pops instead.',
    },
  },
  {
    id: 'adapt',
    category: 'keywords',
    term: { de: 'Adapt', en: 'Adapt' },
    definitionNormal: {
      de: 'Adapt N ist eine aktivierbare Fähigkeit: Hat die Kreatur noch keine +1/+1-Marker, bekommt sie N davon.',
      en: 'Adapt N is an activated ability: if the creature has no +1/+1 counters yet, it gets N of them.',
    },
    definitionTrottel: {
      de: 'Adapt heißt: einmal aufpumpen erlaubt – aber nur, wenn noch keine Pumpe dran war.',
      en: "Adapt means a one-time power-up – but only if it hasn't already had one.",
    },
    exampleCards: ['Siegehorn Ceratops'],
  },
  {
    id: 'afflict',
    category: 'keywords',
    term: { de: 'Afflict', en: 'Afflict' },
    definitionNormal: {
      de: 'Afflict N: Wird die Kreatur geblockt, verliert die verteidigende Spielerin N Lebenspunkte.',
      en: 'Afflict N: whenever the creature becomes blocked, the defending player loses N life.',
    },
    definitionTrottel: {
      de: 'Afflict heißt: Blocken tut trotzdem weh – der Verteidiger zahlt Lebenspunkte als Eintrittsgebühr.',
      en: 'Afflict means blocking still hurts – the defender pays life as a cover charge.',
    },
  },
  {
    id: 'amplify',
    category: 'keywords',
    term: { de: 'Amplify', en: 'Amplify' },
    definitionNormal: {
      de: 'Amplify N: Beim Ins-Spiel-Kommen darf man beliebig viele Karten mit demselben Kreaturentyp aus der Hand zeigen und bekommt pro gezeigter Karte N +1/+1-Marker.',
      en: 'Amplify N: as it enters the battlefield, reveal any number of cards sharing a creature type from your hand and get N +1/+1 counters per card revealed.',
    },
    definitionTrottel: {
      de: 'Amplify heißt: Zeig deine Kumpels aus der Hand, und die Kreatur wird für jeden Freund etwas fetter.',
      en: 'Amplify means: show off your hand buddies, and the creature bulks up for each one.',
    },
  },
  {
    id: 'annihilator',
    category: 'keywords',
    term: { de: 'Annihilator', en: 'Annihilator' },
    definitionNormal: {
      de: 'Annihilator N: Greift die Kreatur an, opfert die verteidigende Spielerin N Permanents.',
      en: 'Annihilator N: whenever the creature attacks, the defending player sacrifices N permanents.',
    },
    definitionTrottel: {
      de: 'Annihilator heißt: Schon der Angriff allein kostet dem Gegner mehrere Permanents – bevor überhaupt Schaden fließt.',
      en: "Annihilator means the attack alone costs the opponent several permanents – before any damage even happens.",
    },
    exampleCards: ['Kozilek, Butcher of Truth'],
  },
  {
    id: 'ascend',
    category: 'keywords',
    term: { de: 'Ascend', en: 'Ascend' },
    definitionNormal: {
      de: 'Kontrolliert man zehn oder mehr Permanents, erhält man "den Segen der Stadt" für den Rest des Spiels – ein dauerhafter Bonusstatus.',
      en: "If you control ten or more permanents, you get the city's blessing for the rest of the game - a permanent bonus status.",
    },
    definitionTrottel: {
      de: 'Ascend heißt: genug Kram auf dem Tisch, und du bekommst einen VIP-Status fürs restliche Spiel.',
      en: "Ascend means: enough stuff on the table, and you get VIP status for the rest of the game.",
    },
    exampleCards: ['Vona, Butcher of Magan'],
  },
  {
    id: 'assist',
    category: 'keywords',
    term: { de: 'Assist', en: 'Assist' },
    definitionNormal: {
      de: 'Assist: Eine andere Spielerin darf beim Wirken dieses Zaubers einen Teil der Kosten mitbezahlen.',
      en: "Assist: another player may help pay part of this spell's cost as you cast it.",
    },
    definitionTrottel: {
      de: 'Assist heißt: Ein Kumpel darf mit anpacken und einen Teil der Rechnung übernehmen.',
      en: "Assist means a buddy can chip in and cover part of the bill.",
    },
  },
  // NOTE: activation timing restriction (sorcery-speed only) should be verified before publishing.
  {
    id: 'aura-swap',
    category: 'keywords',
    term: { de: 'Aura Swap', en: 'Aura Swap' },
    definitionNormal: {
      de: 'Aura Swap [Kosten]: Gegen Bezahlung der Kosten tauscht man diese Aura mit einer Aura-Karte auf der Hand.',
      en: "Aura swap [cost]: pay the cost to exchange this Aura with an Aura card in your hand.",
    },
    definitionTrottel: {
      de: 'Aura Swap heißt: Gefällt dir die Verzauberung nicht mehr, tauschst du sie einfach gegen eine aus der Hand.',
      en: "Aura swap means: don't like this enchantment anymore? Just trade it for one in your hand.",
    },
  },
  // NOTE: "Bands with Other [quality]" is a rare variant of the old Banding mechanic with fairly intricate
  // rules text; definition below is conceptual only, verify exact wording before publishing.
  {
    id: 'bands-with-other',
    category: 'keywords',
    term: { de: 'Bands with Other', en: 'Bands with Other' },
    definitionNormal: {
      de: 'Eine seltene Variante von Banding: Die Kreatur darf nur mit Kreaturen einer bestimmten Eigenschaft (z. B. einem Kreaturentyp) eine Bande bilden, statt mit beliebigen Kreaturen.',
      en: "A rare variant of banding: the creature may only form a band with creatures sharing a specific quality (e.g. a creature type), instead of with any creature.",
    },
    definitionTrottel: {
      de: 'Bands with Other ist Banding mit Türsteher – nur bestimmte Kreaturen dürfen in die Bande rein.',
      en: 'Bands with Other is banding with a bouncer – only certain creatures get into the group.',
    },
    relatedTerms: ['banding'],
  },
  {
    id: 'battle-cry',
    category: 'keywords',
    term: { de: 'Battle Cry', en: 'Battle Cry' },
    definitionNormal: {
      de: 'Battle Cry: Greift die Kreatur an, bekommt jede andere angreifende Kreatur +1/+0 bis zum Ende des Zugs.',
      en: 'Battle cry: whenever the creature attacks, each other attacking creature gets +1/+0 until end of turn.',
    },
    definitionTrottel: {
      de: 'Battle Cry ist der Anfeuerungsruf – alle anderen Angreifer werden dadurch ein bisschen kräftiger.',
      en: 'Battle cry is the pep talk – every other attacker gets a little stronger because of it.',
    },
  },
  {
    id: 'bestow',
    category: 'keywords',
    term: { de: 'Bestow', en: 'Bestow' },
    definitionNormal: {
      de: 'Bestow [Kosten]: Man darf die Karte zu diesen Kosten als Verzauberungszauber wirken, der eine Kreatur verzaubert und ihr die aufgedruckten Werte/Fähigkeiten verleiht. Verliert sie die Verzauberte, wird sie selbst zur Kreatur.',
      en: 'Bestow [cost]: you may cast the card for this cost as an Aura spell that enchants a creature, granting it the printed stats/abilities. If it becomes unattached, it turns into a creature itself.',
    },
    definitionTrottel: {
      de: 'Bestow heißt: Die Karte kann entweder selbst eine Kreatur sein oder einer anderen ihre Kräfte leihen.',
      en: 'Bestow means the card can either be its own creature or lend its powers to another one.',
    },
    exampleCards: ['Hopeful Eidolon'],
  },
  {
    id: 'bolster',
    category: 'keywords',
    term: { de: 'Bolster', en: 'Bolster' },
    definitionNormal: {
      de: 'Bolster N: Man wählt die eigene Kreatur mit der geringsten Widerstandskraft (oder eine von mehreren gleich niedrigen) und legt N +1/+1-Marker darauf.',
      en: 'Bolster N: choose the creature you control with the least toughness (or tied for least) and put N +1/+1 counters on it.',
    },
    definitionTrottel: {
      de: 'Bolster heißt: Der Schwächste im Team bekommt die meiste Aufmerksamkeit und wird aufgepäppelt.',
      en: 'Bolster means the weakest link on the team gets the most attention and a boost.',
    },
  },
  {
    id: 'bloodthirst',
    category: 'keywords',
    term: { de: 'Bloodthirst', en: 'Bloodthirst' },
    definitionNormal: {
      de: 'Bloodthirst N: Wurde der gegnerischen Spielerin in diesem Zug bereits Schaden zugefügt, kommt die Kreatur mit N +1/+1-Marker ins Spiel.',
      en: "Bloodthirst N: if an opponent was dealt damage this turn, the creature enters the battlefield with N +1/+1 counters.",
    },
    definitionTrottel: {
      de: 'Bloodthirst heißt: Hat der Gegner schon geblutet, kommt diese Kreatur gleich fetter aufs Feld.',
      en: "Bloodthirst means if the opponent already bled this turn, this creature shows up extra beefy.",
    },
    exampleCards: ['Rakdos Shred-Freak'],
  },
  {
    id: 'bushido',
    category: 'keywords',
    term: { de: 'Bushido', en: 'Bushido' },
    definitionNormal: {
      de: 'Bushido N: Blockt die Kreatur oder wird sie geblockt, bekommt sie +N/+N bis zum Ende des Zugs.',
      en: 'Bushido N: whenever the creature blocks or becomes blocked, it gets +N/+N until end of turn.',
    },
    definitionTrottel: {
      de: 'Bushido heißt: Im Kampf zeigt die Kreatur plötzlich ihre wahre Stärke.',
      en: 'Bushido means the creature suddenly flexes its true strength the moment combat starts.',
    },
  },
  {
    id: 'buyback',
    category: 'keywords',
    term: { de: 'Buyback', en: 'Buyback' },
    definitionNormal: {
      de: 'Buyback [Kosten]: Bezahlt man diese Zusatzkosten beim Wirken, wandert der Zauber nach dem Auflösen zurück auf die Hand statt auf den Friedhof.',
      en: 'Buyback [cost]: if you pay this additional cost as you cast the spell, it returns to your hand instead of the graveyard after it resolves.',
    },
    definitionTrottel: {
      de: 'Buyback heißt: Extra bezahlen, dann bekommst du die Karte nach dem Wirken direkt zurück auf die Hand.',
      en: "Buyback means: pay a bit extra, and the card comes right back to your hand after it resolves.",
    },
  },
  {
    id: 'champion',
    category: 'keywords',
    term: { de: 'Champion', en: 'Champion' },
    definitionNormal: {
      de: 'Champion eines [Typs]: Kommt die Kreatur ins Spiel, muss man sie opfern, außer man exiliert eine andere eigene Kreatur dieses Typs. Verlässt sie das Spielfeld, kommt die exilierte Karte zurück.',
      en: "Champion a [type]: when the creature enters, sacrifice it unless you exile another creature you control of that type. When it leaves the battlefield, the exiled card returns.",
    },
    definitionTrottel: {
      de: 'Champion heißt: Ohne einen passenden Kumpel als Pfand bleibt die Kreatur nicht lange im Spiel.',
      en: "Champion means: without a matching buddy as collateral, this creature isn't sticking around.",
    },
  },
  {
    id: 'changeling',
    category: 'keywords',
    term: { de: 'Changeling', en: 'Changeling' },
    definitionNormal: {
      de: 'Changeling: Die Karte ist von jedem Kreaturentyp gleichzeitig, überall wo das relevant ist.',
      en: 'Changeling: the card is every creature type at once, everywhere that matters.',
    },
    definitionTrottel: {
      de: 'Changeling heißt: Die Kreatur ist quasi jede Kreatur gleichzeitig – perfekt getarnt für jeden Stammesbonus.',
      en: "Changeling means the creature is basically every creature at once – perfectly disguised for any tribal bonus.",
    },
    exampleCards: ['Mirror-Sigil Sergeant'],
  },
  {
    id: 'cipher',
    category: 'keywords',
    term: { de: 'Cipher', en: 'Cipher' },
    definitionNormal: {
      de: 'Cipher: Nach dem Auflösen darf man den Zauber verdeckt an einer eigenen Kreatur "verschlüsseln". Fügt diese Kreatur einer Spielerin Kampfschaden zu, darf man eine Kopie des verschlüsselten Zaubers kostenlos wirken.',
      en: 'Cipher: after it resolves, you may exile the spell, encoded on a creature you control. Whenever that creature deals combat damage to a player, you may cast a copy of it for free.',
    },
    definitionTrottel: {
      de: 'Cipher heißt: Der Zauber versteckt sich in deiner Kreatur und feuert sich bei jedem Treffer gratis nochmal ab.',
      en: 'Cipher means the spell hides inside your creature and fires off another free copy every time it connects.',
    },
  },
  {
    id: 'clash',
    category: 'keywords',
    term: { de: 'Clash', en: 'Clash' },
    definitionNormal: {
      de: 'Clash: Beide Spielerinnen decken die oberste Karte ihrer Bibliothek auf und legen sie zurück oder in den Friedhof. Wer den höheren Manawert hatte, gewinnt den Clash.',
      en: 'Clash: each player reveals the top card of their library, then puts it back or into the graveyard. Whoever had the higher mana value wins the clash.',
    },
    definitionTrottel: {
      de: 'Clash ist ein kleines Kräftemessen der obersten Bibliothekskarten – wer die höhere Zahl zeigt, gewinnt.',
      en: "Clash is a mini showdown of your top library cards – whoever shows the bigger number wins.",
    },
  },
  {
    id: 'conspire',
    category: 'keywords',
    term: { de: 'Conspire', en: 'Conspire' },
    definitionNormal: {
      de: 'Conspire: Als Zusatzkosten darf man zwei ungetappte eigene Kreaturen tappen, die eine Farbe mit dem Zauber teilen. Tut man das, wird der Zauber kopiert.',
      en: 'Conspire: as an additional cost, you may tap two untapped creatures you control that share a color with the spell. If you do, copy it.',
    },
    definitionTrottel: {
      de: 'Conspire heißt: Zwei Kreaturen tappen für eine Gratiskopie des Zaubers – Verschwörung zahlt sich aus.',
      en: 'Conspire means: tap two creatures, get a free copy of the spell – the conspiracy pays off.',
    },
    exampleCards: ['Rally the Peasants'],
  },
  {
    id: 'crew',
    category: 'keywords',
    term: { de: 'Crew', en: 'Crew' },
    definitionNormal: {
      de: 'Crew N: Man darf beliebig viele ungetappte eigene Kreaturen mit insgesamt N Stärke tappen, um das Fahrzeug bis zum Ende des Zugs zur Artefakt-Kreatur zu machen.',
      en: 'Crew N: tap any number of untapped creatures you control with total power N or more to turn the Vehicle into an artifact creature until end of turn.',
    },
    definitionTrottel: {
      de: 'Crew heißt: Genug Mannschaft zusammentrommeln, dann wird aus dem Fahrzeug eine echte Kreatur.',
      en: "Crew means: round up enough crew, and the vehicle becomes a real creature.",
    },
    exampleCards: ["Smuggler's Copter"],
  },
  {
    id: 'cumulative-upkeep',
    category: 'keywords',
    term: { de: 'Cumulative Upkeep', en: 'Cumulative Upkeep' },
    definitionNormal: {
      de: 'Cumulative Upkeep [Kosten]: Zu Beginn des Patt-Schritts legt man einen Alters-Marker auf das Permanent und bezahlt die Kosten einmal pro Marker, sonst wird es geopfert.',
      en: "Cumulative upkeep [cost]: at the beginning of upkeep, put an age counter on the permanent, then pay the cost once per counter, or sacrifice it.",
    },
    definitionTrottel: {
      de: 'Cumulative Upkeep heißt: Jede Runde wird die Rechnung teurer, bis du irgendwann nicht mehr zahlen willst.',
      en: "Cumulative upkeep means the bill gets pricier every turn, until eventually you can't keep paying it.",
    },
  },
  {
    id: 'detain',
    category: 'keywords',
    term: { de: 'Detain', en: 'Detain' },
    definitionNormal: {
      de: 'Detain: Bis zum nächsten eigenen Zug kann das Ziel-Permanent weder angreifen noch blocken, und seine aktivierbaren Fähigkeiten können nicht genutzt werden.',
      en: "Detain: until your next turn, the target permanent can't attack or block, and its activated abilities can't be activated.",
    },
    definitionTrottel: {
      de: 'Detain heißt: Das Permanent landet kurz im Arrest und darf bis morgen gar nichts tun.',
      en: 'Detain means the permanent gets locked up and can\'t do a thing until your next turn.',
    },
    exampleCards: ['Azorius Arrester'],
  },
  {
    id: 'devour',
    category: 'keywords',
    term: { de: 'Devour', en: 'Devour' },
    definitionNormal: {
      de: 'Devour N: Beim Ins-Spiel-Kommen darf man beliebig viele eigene Kreaturen opfern. Die Kreatur kommt dann mit N +1/+1-Marker pro geopferter Kreatur ins Spiel.',
      en: 'Devour N: as it enters the battlefield, you may sacrifice any number of creatures you control. It enters with N +1/+1 counters per creature sacrificed.',
    },
    definitionTrottel: {
      de: 'Devour heißt: Die Kreatur frühstückt ein paar eigene Mitstreiter und wird dafür ordentlich fetter.',
      en: "Devour means the creature snacks on a few of your own teammates and gets noticeably bulkier for it.",
    },
    exampleCards: ['Mycoloth'],
  },
  {
    id: 'dredge',
    category: 'keywords',
    term: { de: 'Dredge', en: 'Dredge' },
    definitionNormal: {
      de: 'Dredge N: Statt zu ziehen, darf man diese Karte aus dem Friedhof auf die Hand zurückholen, muss dafür aber N Karten von der Bibliothek auf den Friedhof legen (mahlen).',
      en: 'Dredge N: instead of drawing a card, you may return this card from your graveyard to your hand, but you must mill N cards from your library to do so.',
    },
    definitionTrottel: {
      de: 'Dredge heißt: Statt zu ziehen, fischt du die Karte aus dem Friedhof – kostet dich halt ein paar Karten aus der Bibliothek.',
      en: "Dredge means: instead of drawing, you fish the card out of the graveyard – it just costs you a few cards off your library.",
    },
    exampleCards: ['Stinkweed Imp'],
  },
  {
    id: 'echo',
    category: 'keywords',
    term: { de: 'Echo', en: 'Echo' },
    definitionNormal: {
      de: 'Echo [Kosten]: Zu Beginn der nächsten eigenen Patt-Phase nach dem Ins-Spiel-Kommen muss man die Echo-Kosten bezahlen, sonst wird das Permanent geopfert. Danach ist es nicht mehr nötig.',
      en: "Echo [cost]: at the beginning of your next upkeep after it enters, pay the echo cost or sacrifice it. After that, it's free and clear.",
    },
    definitionTrottel: {
      de: 'Echo heißt: Einmal nachzahlen, sonst ist die Karte wieder weg – danach lässt sie dich in Ruhe.',
      en: 'Echo means: pay one more time or lose the card – after that, it leaves you alone for good.',
    },
  },
  {
    id: 'emerge',
    category: 'keywords',
    term: { de: 'Emerge', en: 'Emerge' },
    definitionNormal: {
      de: 'Emerge [Kosten]: Man darf den Zauber wirken, indem man eine eigene Kreatur opfert und die Emerge-Kosten um deren Manawert reduziert bezahlt.',
      en: "Emerge [cost]: you may cast the spell by sacrificing a creature and paying the emerge cost reduced by that creature's mana value.",
    },
    definitionTrottel: {
      de: 'Emerge heißt: Eine Kreatur wird geopfert, damit etwas noch Größeres günstiger aus dem Nichts auftaucht.',
      en: 'Emerge means: sacrifice one creature so something even bigger shows up out of nowhere, cheaper.',
    },
    exampleCards: ['Elder Deep-Fiend'],
  },
  {
    id: 'entwine',
    category: 'keywords',
    term: { de: 'Entwine', en: 'Entwine' },
    definitionNormal: {
      de: 'Entwine [Kosten]: Bei einem Zauber mit mehreren Modi darf man gegen Bezahlung der Entwine-Kosten beide Modi statt nur einen wählen.',
      en: "Entwine [cost]: for a spell with multiple modes, pay the entwine cost to choose all of its modes instead of just one.",
    },
    definitionTrottel: {
      de: 'Entwine heißt: Warum nur eine Option wählen, wenn du für etwas mehr Mana einfach beide haben kannst?',
      en: "Entwine means: why pick just one option when a little extra mana gets you both?",
    },
  },
  {
    id: 'epic',
    category: 'keywords',
    term: { de: 'Epic', en: 'Epic' },
    definitionNormal: {
      de: 'Epic bedeutet: Für den Rest der Partie dürfen keine weiteren Zaubersprüche gewirkt werden. Stattdessen wird dieser Zauber (ohne die Epic-Fähigkeit) zu Beginn jedes eigenen Oberhauses kostenlos kopiert.',
      en: "Epic means you can't cast any more spells for the rest of the game. Instead, this spell (minus its epic ability) is copied for free at the beginning of each of your upkeeps.",
    },
    definitionTrottel: {
      de: 'Epic ist dein letzter Zauber für den Rest der Partie – dafür wiederholt er sich jede Runde von selbst.',
      en: "Epic is the last spell you'll ever cast this game – but it repeats itself for you, every single turn.",
    },
  },
  {
    id: 'evolve',
    category: 'keywords',
    term: { de: 'Evolve', en: 'Evolve' },
    definitionNormal: {
      de: 'Immer wenn eine Kreatur unter deine Kontrolle kommt, die eine höhere Stärke oder Widerstandskraft hat als diese Kreatur, bekommt diese Kreatur einen +1/+1-Marker.',
      en: 'Whenever a creature enters under your control that has greater power or toughness than this creature, put a +1/+1 counter on this creature.',
    },
    definitionTrottel: {
      de: 'Evolve heißt: Dein Monster wird neidisch auf größere Freunde und wächst ein bisschen mit.',
      en: "Evolve means your creature gets jealous of bigger friends joining the team and grows a little to keep up.",
    },
    exampleCards: ['Experiment One'],
  },
  {
    id: 'evoke',
    category: 'keywords',
    term: { de: 'Evoke', en: 'Evoke' },
    definitionNormal: {
      de: 'Du darfst diesen Kreaturenzauber stattdessen für seine Evoke-Kosten wirken. Tust du das, musst du die Kreatur opfern, sobald sie ins Spiel kommt.',
      en: 'You may cast this creature spell for its evoke cost instead of its mana cost. If you do, sacrifice it when it enters.',
    },
    definitionTrottel: {
      de: 'Evoke ist der Rabatt-Deal: billiger wirken, dafür darf die Kreatur nur ihren Einstiegseffekt auslösen und muss danach sofort wieder gehen.',
      en: "Evoke is the discount deal: cast it cheaper, but it only sticks around long enough to trigger its enter effect before it has to leave.",
    },
    relatedTerms: ['may-vs-mandatory-trigger'],
    exampleCards: ['Mulldrifter'],
  },
  {
    id: 'exalted',
    category: 'keywords',
    term: { de: 'Exalted', en: 'Exalted' },
    definitionNormal: {
      de: 'Immer wenn eine Kreatur, die du kontrollierst, allein angreift, bekommt diese Kreatur bis zum Ende des Zuges +1/+1.',
      en: 'Whenever a creature you control attacks alone, that creature gets +1/+1 until end of turn.',
    },
    definitionTrottel: {
      de: 'Exalted heißt: Greift nur einer an, kriegt er von allen anderen im Team einen Motivationsschub.',
      en: "Exalted means: if only one of yours attacks, the rest of the team hypes it up with a power boost.",
    },
    exampleCards: ['Rafiq of the Many'],
  },
  {
    id: 'exploit',
    category: 'keywords',
    term: { de: 'Exploit', en: 'Exploit' },
    definitionNormal: {
      de: 'Wenn diese Kreatur ins Spiel kommt, darfst du eine Kreatur opfern (exploiten), um einen weiteren Effekt auszulösen.',
      en: 'When this creature enters, you may sacrifice a creature (exploit it) to trigger a further effect.',
    },
    definitionTrottel: {
      de: 'Exploit heißt: Du darfst ein eigenes Monster opfern, damit das neue noch fieser reinkommt.',
      en: "Exploit means you may feed one of your own creatures to the new one so it enters even nastier.",
    },
  },
  {
    id: 'extort',
    category: 'keywords',
    term: { de: 'Extort', en: 'Extort' },
    definitionNormal: {
      de: 'Immer wenn du einen Zauberspruch wirkst, darfst du {W/B} bezahlen. Tust du das, verliert jede Gegnerin 1 Lebenspunkt und du gewinnst entsprechend viele dazu.',
      en: 'Whenever you cast a spell, you may pay {W/B}. If you do, each opponent loses 1 life and you gain that much life.',
    },
    definitionTrottel: {
      de: 'Extort ist die Spendenbox neben jedem Zauber: ein bisschen extra zahlen, und alle Gegner bluten ein wenig für dich.',
      en: "Extort is the tip jar next to every spell: pay a little extra, and every opponent bleeds a little for your benefit.",
    },
    exampleCards: ['Debt to the Deathless'],
  },
  {
    id: 'fabricate',
    category: 'keywords',
    term: { de: 'Fabricate', en: 'Fabricate' },
    definitionNormal: {
      de: 'Wenn diese Kreatur ins Spiel kommt, lege N +1/+1-Marker auf sie oder erschaffe N 1/1 farblose Servo-Artefaktkreatur-Spielsteine.',
      en: 'When this creature enters, put N +1/+1 counters on it or create N 1/1 colorless Servo artifact creature tokens.',
    },
    definitionTrottel: {
      de: 'Fabricate heißt: Entweder dein Monster wird größer, oder es bringt sich kleine Roboter-Kumpels mit.',
      en: "Fabricate means: either your creature bulks up, or it brings along some little robot buddies instead.",
    },
  },
  {
    id: 'fading',
    category: 'keywords',
    term: { de: 'Fading', en: 'Fading' },
    definitionNormal: {
      de: 'Dieses Permanent kommt mit N Verblassen-Markern ins Spiel. Zu Beginn deines Oberhauses entfernst du einen davon; sind keine mehr übrig, opferst du es.',
      en: 'This permanent enters with N fade counters on it. At the beginning of your upkeep, remove a fade counter from it. If none remain, sacrifice it.',
    },
    definitionTrottel: {
      de: 'Fading ist der Countdown deines Permanents – jede Runde tickt einer runter, und wenn nichts mehr übrig ist, ist Feierabend.',
      en: "Fading is your permanent's countdown timer – one tick off per turn, and when it hits zero, it's lights out.",
    },
  },
  {
    id: 'fateseal',
    category: 'keywords',
    term: { de: 'Fateseal', en: 'Fateseal' },
    definitionNormal: {
      de: 'Sieh dir die obersten N Karten der Bibliothek einer Gegnerin an. Du darfst beliebig viele davon unten auf die Bibliothek legen.',
      en: "Look at the top N cards of target opponent's library. You may put any number of them on the bottom in any order.",
    },
    definitionTrottel: {
      de: 'Fateseal heißt: Du spickst in die Zukunft des Gegners und schiebst ihm das, was dir nicht passt, ganz nach unten.',
      en: "Fateseal means you peek into the opponent's future and bury whatever you don't like at the bottom.",
    },
    exampleCards: ['Jace Beleren'],
  },
  {
    id: 'flanking',
    category: 'keywords',
    term: { de: 'Flanking', en: 'Flanking' },
    definitionNormal: {
      de: 'Immer wenn eine Kreatur ohne Flanking diese Kreatur blockt, bekommt die blockende Kreatur bis zum Ende des Zuges -1/-1.',
      en: 'Whenever a creature without flanking blocks this creature, the blocking creature gets -1/-1 until end of turn.',
    },
    definitionTrottel: {
      de: 'Flanking heißt: Blockt dich was ohne eigene Kavallerie-Ausbildung, wird es dabei automatisch ein bisschen kleiner.',
      en: "Flanking means: whatever blocks you without its own cavalry training automatically shrinks a little in the process.",
    },
  },
  {
    id: 'forecast',
    category: 'keywords',
    term: { de: 'Forecast', en: 'Forecast' },
    definitionNormal: {
      de: 'Zeige diese Karte aus deiner Hand während deines Oberhauses und bezahle die Kosten, um den genannten Effekt auszulösen – einmal pro Zug.',
      en: 'Reveal this card from your hand during your upkeep and pay a cost to get the stated effect - once each turn.',
    },
    definitionTrottel: {
      de: 'Forecast heißt: Karte aus der Hand zeigen, zahlen, Bonus-Effekt kassieren – ganz ohne sie überhaupt zu wirken.',
      en: "Forecast means: show a card from your hand, pay up, get a bonus effect – without even casting it.",
    },
  },
  {
    id: 'fortify',
    category: 'keywords',
    term: { de: 'Fortify', en: 'Fortify' },
    definitionNormal: {
      de: 'Fortify ist die Hexerei-Geschwindigkeits-Fähigkeit, mit der eine Befestigung an ein Land angelegt wird.',
      en: "Fortify is the sorcery-speed activated ability that attaches a Fortification to a land.",
    },
    definitionTrottel: {
      de: 'Fortify ist Equip für Länder – dein Boden bekommt eine Rüstung verpasst.',
      en: "Fortify is Equip, but for lands – your turf gets a suit of armor.",
    },
  },
  {
    id: 'frenzy',
    category: 'keywords',
    term: { de: 'Frenzy', en: 'Frenzy' },
    definitionNormal: {
      de: 'Immer wenn diese Kreatur angreift und ungeblockt bleibt, bekommt sie bis zum Ende des Zuges +N/+0.',
      en: "Whenever this creature attacks and isn't blocked, it gets +N/+0 until end of turn.",
    },
    definitionTrottel: {
      de: 'Frenzy heißt: Lässt dich der Gegner einfach durch, rastet dein Monster erst richtig aus.',
      en: "Frenzy means: if the opponent just lets you through, your creature only really loses it then.",
    },
  },
  {
    id: 'graft',
    category: 'keywords',
    term: { de: 'Graft', en: 'Graft' },
    definitionNormal: {
      de: 'Diese Kreatur kommt mit N +1/+1-Markern ins Spiel. Immer wenn eine andere Kreatur ins Spiel kommt, darfst du einen +1/+1-Marker von dieser Kreatur auf sie übertragen.',
      en: 'This creature enters with N +1/+1 counters on it. Whenever another creature enters, you may move a +1/+1 counter from this creature onto it.',
    },
    definitionTrottel: {
      de: 'Graft heißt: Dein Monster teilt freiwillig seine Muckis mit dem nächsten Neuzugang.',
      en: "Graft means your creature happily shares its gains with whoever joins the team next.",
    },
  },
  {
    id: 'gravestorm',
    category: 'keywords',
    term: { de: 'Gravestorm', en: 'Gravestorm' },
    definitionNormal: {
      de: 'Wenn du diesen Zauberspruch wirkst, kopiere ihn einmal für jedes Permanent, das in diesem Zug in einen Friedhof gelegt wurde.',
      en: 'When you cast this spell, copy it for each permanent that was put into a graveyard this turn.',
    },
    definitionTrottel: {
      de: 'Gravestorm heißt: Je mehr heute schon gestorben ist, desto öfter passiert dieser Zauber gleich nochmal.',
      en: "Gravestorm means: the more that already died this turn, the more times this spell is about to happen again.",
    },
  },
  {
    id: 'haunt',
    category: 'keywords',
    term: { de: 'Haunt', en: 'Haunt' },
    definitionNormal: {
      de: 'Wenn diese Karte stirbt oder sich auflöst, exiliere sie und lege sie spukend auf eine Zielkreatur. Stirbt diese Kreatur später, löst sich der Haunt-Effekt aus.',
      en: 'When this card dies or resolves, exile it haunting target creature. When that creature dies, the haunt effect triggers.',
    },
    definitionTrottel: {
      de: 'Haunt heißt: Die Karte stirbt nicht wirklich, sie spukt einfach in der nächsten Kreatur weiter – bis die auch drankommt.',
      en: "Haunt means the card doesn't really die, it just haunts the next creature instead – until that one goes too.",
    },
  },
  {
    id: 'hideaway',
    category: 'keywords',
    term: { de: 'Hideaway', en: 'Hideaway' },
    definitionNormal: {
      de: 'Wenn dieses Permanent ins Spiel kommt, sieh dir die obersten Karten deiner Bibliothek an, exiliere eine davon verdeckt und lege den Rest unten ab. Später darfst du die exilierte Karte unter einer Bedingung spielen.',
      en: 'When this permanent enters, look at the top cards of your library, exile one face down, and put the rest on the bottom. Later, you may play that exiled card under a certain condition.',
    },
    definitionTrottel: {
      de: 'Hideaway heißt: Dein Permanent versteckt heimlich eine Karte für später – du musst sie dir nur noch verdienen.',
      en: "Hideaway means your permanent secretly stashes a card for later – you just have to earn the right to play it.",
    },
    exampleCards: ['Mosswort Bridge'],
  },
  {
    id: 'horsemanship',
    category: 'keywords',
    term: { de: 'Horsemanship', en: 'Horsemanship' },
    definitionNormal: {
      de: 'Kann nur von anderen Kreaturen mit Horsemanship geblockt werden. Erschien ausschließlich im nie regulär vertriebenen Set Portal Three Kingdoms und wurde nie wieder gedruckt.',
      en: 'Can only be blocked by other creatures with horsemanship. Appeared only in the never-widely-distributed Portal Three Kingdoms set and has never been reprinted since.',
    },
    definitionTrottel: {
      de: 'Horsemanship ist Flying für Reiter – so selten, dass die meisten Spieler es nie zu Gesicht bekommen.',
      en: "Horsemanship is basically Flying, but for horseback riders – and so rare most players never see it in their life.",
    },
  },
  {
    id: 'infect',
    category: 'keywords',
    term: { de: 'Infect', en: 'Infect' },
    definitionNormal: {
      de: 'Diese Kreatur fügt Schaden an Kreaturen als -1/-1-Marker und an Spielerinnen als Giftmarker zu, statt als regulären Schaden bzw. Lebenspunktverlust.',
      en: 'This creature deals damage to creatures as -1/-1 counters and to players as poison counters, instead of normal damage or life loss.',
    },
    definitionTrottel: {
      de: 'Infect heißt: Statt Lebenspunkten verteilst du Gift – 10 Giftmarker, und die Partie ist sofort vorbei.',
      en: "Infect means you hand out poison instead of damage – get someone to 10 poison counters and the game ends instantly.",
    },
  },
  {
    id: 'level-up',
    category: 'keywords',
    term: { de: 'Level Up', en: 'Level Up' },
    definitionNormal: {
      de: 'Lege gegen Bezahlung der Kosten einen Levelmarker auf dieses Permanent. Level Up darf nur zu Hexerei-Geschwindigkeit eingesetzt werden; je nach Anzahl der Marker schaltet die Kreatur stärkere Werte und Fähigkeiten frei.',
      en: 'Pay the cost to put a level counter on this permanent. Level up may only be activated at sorcery speed; depending on how many counters it has, the creature unlocks better stats and abilities.',
    },
    definitionTrottel: {
      de: 'Level Up heißt: Du zahlst XP für dein Monster, und ab einer gewissen Stufe wird es richtig gefährlich.',
      en: "Level Up means you pay XP for your creature, and past a certain level it turns genuinely dangerous.",
    },
  },
  {
    id: 'living-weapon',
    category: 'keywords',
    term: { de: 'Living Weapon', en: 'Living Weapon' },
    definitionNormal: {
      de: 'Wenn diese Ausrüstung ins Spiel kommt, erschaffe einen 0/0 schwarzen Keim-Kreaturenspielstein und befestige diese Ausrüstung sofort daran.',
      en: 'When this Equipment enters, create a 0/0 black Germ creature token, then attach this Equipment to it.',
    },
    definitionTrottel: {
      de: 'Living Weapon heißt: Die Waffe bringt sich ihren eigenen Träger gleich mit.',
      en: "Living Weapon means the weapon brings its own wielder along for the ride.",
    },
    exampleCards: ['Batterskull'],
  },
  {
    id: 'madness',
    category: 'keywords',
    term: { de: 'Madness', en: 'Madness' },
    definitionNormal: {
      de: 'Wirfst du diese Karte ab, darfst du sie stattdessen für ihre Madness-Kosten wirken, statt sie in den Friedhof zu legen.',
      en: 'If you discard this card, you may cast it for its madness cost instead of putting it into your graveyard.',
    },
    definitionTrottel: {
      de: 'Madness heißt: Abgeworfen ist nicht verloren – die Karte darf sofort zu einem Spontanpreis gewirkt werden.',
      en: "Madness means discarded isn't gone – the card can be cast on the spot at a bargain price instead.",
    },
    exampleCards: ['Arrogant Wurm'],
  },
  {
    id: 'meld',
    category: 'keywords',
    term: { de: 'Meld', en: 'Meld' },
    definitionNormal: {
      de: 'Zwei bestimmte Karten verschmelzen zu einem einzigen, größeren Meld-Permanent, sobald beide derselben Spielerin gehören und unter ihrer Kontrolle auf dem Spielfeld sind und die Meld-Bedingung erfüllt ist.',
      en: "Two specific cards combine into one bigger meld permanent once both are owned and controlled by the same player on the battlefield and the meld condition is met.",
    },
    definitionTrottel: {
      de: 'Meld heißt: Zwei Karten werden zu einem noch größeren Monster verschmolzen – wie eine Fusion im Animestil.',
      en: "Meld means two cards fuse into one even bigger monster – like an anime-style fusion.",
    },
    exampleCards: ['Brisela, Voice of Nightmares'],
  },
  {
    id: 'miracle',
    category: 'keywords',
    term: { de: 'Miracle', en: 'Miracle' },
    definitionNormal: {
      de: 'Ziehst du diese Karte als erste Karte in diesem Zug, darfst du sie aufdecken und für ihre Miracle-Kosten wirken.',
      en: "If you draw this card as the first card you drew this turn, you may reveal it and cast it for its miracle cost.",
    },
    definitionTrottel: {
      de: 'Miracle heißt: Pures Glück beim Ziehen gibt dir einen fetten Rabatt – aber nur, wenn du es sofort zeigst.',
      en: "Miracle means pure luck on the draw gets you a huge discount – but only if you show it off immediately.",
    },
    exampleCards: ['Terminus'],
  },
  {
    id: 'modular',
    category: 'keywords',
    term: { de: 'Modular', en: 'Modular' },
    definitionNormal: {
      de: 'Diese Kreatur kommt mit N +1/+1-Markern ins Spiel. Stirbt sie, darfst du ihre +1/+1-Marker auf eine Zielkreatur legen.',
      en: 'This creature enters with N +1/+1 counters on it. When it dies, you may put its +1/+1 counters on target creature.',
    },
    definitionTrottel: {
      de: 'Modular heißt: Stirbt dein Roboter, vererbt er seine Upgrades an den nächsten Roboter.',
      en: "Modular means when your robot dies, it passes its upgrades down to the next robot.",
    },
    exampleCards: ['Arcbound Ravager'],
  },
  {
    id: 'monstrosity',
    category: 'keywords',
    term: { de: 'Monstrosity', en: 'Monstrosity' },
    definitionNormal: {
      de: 'Lege N +1/+1-Marker auf diese Kreatur und mache sie monströs (dies funktioniert nur einmal pro Kreatur).',
      en: 'Put N +1/+1 counters on this creature and it becomes monstrous (this only works once per creature).',
    },
    definitionTrottel: {
      de: 'Monstrosity heißt: Einmal im Leben darf dein Monster so richtig aufdrehen und für immer größer bleiben.',
      en: "Monstrosity means once in its life, your creature gets to really let loose and stays bigger forever.",
    },
    exampleCards: ['Polukranos, World Eater'],
  },
  {
    id: 'ninjutsu',
    category: 'keywords',
    term: { de: 'Ninjutsu', en: 'Ninjutsu' },
    definitionNormal: {
      de: 'Zahle die Kosten und schicke eine ungeblockte angreifende Kreatur, die du kontrollierst, zurück auf die Hand: Lege diese Karte dafür getappt und angreifend aus der Hand ins Spiel.',
      en: 'Pay the cost and return an unblocked attacking creature you control to its owner\'s hand: put this card onto the battlefield from your hand tapped and attacking.',
    },
    definitionTrottel: {
      de: 'Ninjutsu heißt: Dein unscheinbarer Angreifer verschwindet im Rauch, und ein Ninja springt stattdessen mitten im Angriff ein.',
      en: "Ninjutsu means your unassuming attacker vanishes in a puff of smoke, and a ninja swaps in mid-attack instead.",
    },
    exampleCards: ['Ninja of the Deep Hours'],
  },
  {
    id: 'offering',
    category: 'keywords',
    term: { de: 'Offering', en: 'Offering' },
    definitionNormal: {
      de: 'Offering erlaubt, die Karte zu wirken, als hätte sie Flash, und man darf eine Kreatur des genannten Typs opfern, um die Kosten um deren Manakosten zu senken.',
      en: "Offering lets you cast the card as though it had flash, and you may sacrifice a creature of the stated type to reduce its cost by that creature's mana cost.",
    },
    definitionTrottel: {
      de: 'Offering heißt: Wirf eine passende Kreatur ins Feuer, und die neue kommt billiger und überraschend.',
      en: 'Offering means: toss a matching creature into the fire, and the new one shows up cheaper and out of nowhere.',
    },
  },
  {
    id: 'overload',
    category: 'keywords',
    term: { de: 'Overload', en: 'Overload' },
    definitionNormal: {
      de: 'Für die Overload-Kosten gewirkt, ersetzt der Zauber jedes "Ziel" durch "jede(r)/jedes" Passende – er betrifft dann alles Zutreffende statt nur ein Ziel.',
      en: 'Cast for its overload cost, the spell replaces every instance of "target" with "each" - it then affects everything that fits instead of just one target.',
    },
    definitionTrottel: {
      de: 'Overload heißt: zahl mehr, triff alle statt nur einen.',
      en: 'Overload means: pay more, hit everyone instead of just one.',
    },
  },
  {
    id: 'persist',
    category: 'keywords',
    term: { de: 'Persist', en: 'Persist' },
    definitionNormal: {
      de: 'Stirbt eine Kreatur mit Persist und hatte keine -1/-1-Marker, kommt sie mit einem -1/-1-Marker zurück auf das Spielfeld.',
      en: 'When a creature with persist dies and had no -1/-1 counters on it, it returns to the battlefield with a -1/-1 counter on it.',
    },
    definitionTrottel: {
      de: 'Persist heißt: einmal sterben zählt nicht, du kommst angeschlagen zurück.',
      en: "Persist means: dying once doesn't count, you come back a little worse for wear.",
    },
    relatedTerms: ['undying'],
  },
  {
    id: 'poisonous',
    category: 'keywords',
    term: { de: 'Poisonous (Giftig)', en: 'Poisonous' },
    definitionNormal: {
      de: 'Fügt eine Kreatur mit Poisonous einem Spieler Kampfschaden zu, bekommt dieser zusätzlich so viele Gift-Marker.',
      en: 'Whenever a creature with poisonous deals combat damage to a player, that player also gets that many poison counters.',
    },
    definitionTrottel: {
      de: 'Poisonous heißt: jeder Kratzer im Kampf hinterlässt zusätzlich ein bisschen Gift.',
      en: 'Poisonous means: every hit in combat leaves a little extra poison behind.',
    },
  },
  {
    id: 'populate',
    category: 'keywords',
    term: { de: 'Populate', en: 'Populate' },
    definitionNormal: {
      de: 'Populate erstellt einen Spielstein, der eine Kopie eines Spielsteins ist, den man bereits kontrolliert.',
      en: "Populate creates a token that's a copy of a token you already control.",
    },
    definitionTrottel: {
      de: 'Populate heißt: dein bester Spielstein darf sich klonen.',
      en: 'Populate means: your best token gets to clone itself.',
    },
  },
  {
    id: 'provoke',
    category: 'keywords',
    term: { de: 'Provoke (Provokation)', en: 'Provoke' },
    definitionNormal: {
      de: 'Greift eine Kreatur mit Provoke an, darf man eine gegnerische Kreatur enttappen und zum Blocken zwingen.',
      en: 'Whenever a creature with provoke attacks, you may untap a target creature the defending player controls and force it to block.',
    },
    definitionTrottel: {
      de: 'Provoke heißt: du suchst dir aus, wer dich blocken muss.',
      en: "Provoke means: you get to pick who's forced to block you.",
    },
  },
  {
    id: 'prowl',
    category: 'keywords',
    term: { de: 'Prowl', en: 'Prowl' },
    definitionNormal: {
      de: 'Prowl erlaubt, die Karte günstiger zu wirken, wenn man diesen Zug bereits mit einer Kreatur des genannten Typs Kampfschaden zugefügt hat.',
      en: "Prowl lets you cast the card for less if you've already dealt combat damage this turn with a creature of the stated type.",
    },
    definitionTrottel: {
      de: 'Prowl heißt: hast du diese Runde schon zugeschlagen, gibt\'s Rabatt.',
      en: 'Prowl means: already landed a hit this turn? You get a discount.',
    },
  },
  {
    id: 'radiation',
    category: 'keywords',
    term: { de: 'Radiation (Strahlung)', en: 'Radiation' },
    definitionNormal: {
      de: 'Strahlungs-Marker (aus dem Fallout-Crossover) schaden einem Spieler am Anfang seines Zugs und zwingen ihn, Karten abzuwerfen, solange er welche hat.',
      en: 'Radiation counters (from the Fallout crossover) hurt a player at the start of their turn and make them discard cards for as long as they have any.',
    },
    definitionTrottel: {
      de: 'Radiation heißt: ab jetzt tickt eine Uhr, die immer fieser wird, je länger du sie ignorierst.',
      en: 'Radiation means: a clock starts ticking, and it only gets nastier the longer you ignore it.',
    },
  },
  {
    id: 'rampage',
    category: 'keywords',
    term: { de: 'Rampage', en: 'Rampage' },
    definitionNormal: {
      de: 'Wird eine Kreatur mit Rampage von mehr als einer Kreatur geblockt, bekommt sie für jeden Blocker ab dem zweiten +N/+N.',
      en: 'Whenever a creature with rampage becomes blocked by more than one creature, it gets +N/+N for each blocker beyond the first.',
    },
    definitionTrottel: {
      de: 'Rampage heißt: je mehr dich blocken, desto wütender und größer wirst du.',
      en: 'Rampage means: the more creatures block you, the bigger and angrier you get.',
    },
  },
  {
    id: 'rebound',
    category: 'keywords',
    term: { de: 'Rebound', en: 'Rebound' },
    definitionNormal: {
      de: 'Wird eine Karte mit Rebound aus der Hand gewirkt, wird sie beim Auflösen exiliert statt auf den Friedhof zu gehen, und darf in der nächsten eigenen Aufrechterhaltungsphase erneut kostenlos aus dem Exil gewirkt werden.',
      en: "If a card with rebound is cast from hand, it's exiled as it resolves instead of going to the graveyard, and may be cast again for free from exile at the beginning of your next upkeep.",
    },
    definitionTrottel: {
      de: 'Rebound heißt: der Zauber wirkt zweimal, aber du musst eine Runde auf die Zugabe warten.',
      en: 'Rebound means: the spell happens twice, you just have to wait a turn for the encore.',
    },
  },
  {
    id: 'recover',
    category: 'keywords',
    term: { de: 'Recover', en: 'Recover' },
    definitionNormal: {
      de: 'Wird eine Kreatur vom Spielfeld auf den Friedhof gelegt, darf man die Recover-Kosten bezahlen, um diese Karte aus dem Friedhof zurück auf die Hand zu nehmen.',
      en: 'Whenever a creature is put into your graveyard from the battlefield, you may pay the recover cost to return this card from your graveyard to your hand.',
    },
    definitionTrottel: {
      de: 'Recover heißt: stirbt eine Kreatur, darf diese Karte aus dem Friedhof zurück auf die Hand schlüpfen.',
      en: 'Recover means: when a creature dies, this card can sneak back from the graveyard into your hand.',
    },
  },
  {
    id: 'reinforce',
    category: 'keywords',
    term: { de: 'Reinforce (Verstärkung)', en: 'Reinforce' },
    definitionNormal: {
      de: 'Reinforce ist eine Fähigkeit von der Hand aus: Man wirft diese Karte ab und zahlt die Kosten, um +1/+1-Marker auf eine Zielkreatur zu legen.',
      en: 'Reinforce is an ability from your hand: discard this card and pay the cost to put +1/+1 counters on target creature.',
    },
    definitionTrottel: {
      de: 'Reinforce heißt: statt zu wirken, wirfst du die Karte einfach als Kraftfutter für eine andere Kreatur weg.',
      en: 'Reinforce means: instead of casting it, you just toss the card as protein shake for another creature.',
    },
  },
  {
    id: 'renown',
    category: 'keywords',
    term: { de: 'Renown (Ruhm)', en: 'Renown' },
    definitionNormal: {
      de: 'Fügt eine noch nicht berühmte Kreatur mit Renown einem Spieler Kampfschaden zu, bekommt sie so viele +1/+1-Marker und wird berühmt.',
      en: "Whenever a creature with renown that isn't already renowned deals combat damage to a player, it gets that many +1/+1 counters and becomes renowned.",
    },
    definitionTrottel: {
      de: 'Renown heißt: triff einmal einen Spieler, und deine Kreatur wird für immer größer und berühmter.',
      en: 'Renown means: hit a player once, and your creature gets bigger and famous for good.',
    },
  },
  {
    id: 'replicate',
    category: 'keywords',
    term: { de: 'Replicate', en: 'Replicate' },
    definitionNormal: {
      de: 'Beim Wirken eines Zaubers mit Replicate darf man die Replicate-Kosten beliebig oft zusätzlich zahlen; für jede Zahlung entsteht eine Kopie, die neue Ziele bekommen darf.',
      en: 'When you cast a spell with replicate, you may pay its replicate cost any number of additional times; each payment creates a copy, which may choose new targets.',
    },
    definitionTrottel: {
      de: 'Replicate heißt: zahl nochmal, und der Zauber passiert gleich mehrfach.',
      en: 'Replicate means: pay again, and the spell just happens multiple times.',
    },
  },
  {
    id: 'retrace',
    category: 'keywords',
    term: { de: 'Retrace', en: 'Retrace' },
    definitionNormal: {
      de: 'Eine Karte mit Retrace darf man aus dem Friedhof wirken, indem man zusätzlich zu den übrigen Kosten ein Land aus der Hand abwirft.',
      en: 'A card with retrace may be cast from your graveyard by discarding a land card in addition to paying its other costs.',
    },
    definitionTrottel: {
      de: 'Retrace heißt: wirf ein Land weg, und der Zauber aus dem Friedhof darf nochmal ran.',
      en: 'Retrace means: toss away a land, and the spell in your graveyard gets to go again.',
    },
  },
  {
    id: 'ripple',
    category: 'keywords',
    term: { de: 'Ripple', en: 'Ripple' },
    definitionNormal: {
      de: 'Beim Wirken eines Zaubers mit Ripple darf man die obersten N Karten der eigenen Bibliothek aufdecken und alle Karten mit demselben Namen kostenlos mitwirken.',
      en: 'When you cast a spell with ripple, you may reveal the top N cards of your library and cast any revealed cards with the same name for free.',
    },
    definitionTrottel: {
      de: 'Ripple heißt: dein Zauber reißt alle gleichnamigen Kumpel oben auf der Bibliothek gleich mit.',
      en: "Ripple means: your spell drags along every same-named buddy sitting on top of your library.",
    },
  },
  {
    id: 'scavenge',
    category: 'keywords',
    term: { de: 'Scavenge (Aasfressen)', en: 'Scavenge' },
    definitionNormal: {
      de: 'Scavenge ist eine Fähigkeit mit Hexenmeister-Tempo: Zahl die Kosten und exiliere diese Karte aus dem Friedhof, um so viele +1/+1-Marker auf eine Zielkreatur zu legen.',
      en: 'Scavenge is a sorcery-speed ability: pay the cost and exile this card from your graveyard to put that many +1/+1 counters on target creature.',
    },
    definitionTrottel: {
      de: 'Scavenge heißt: die tote Karte im Friedhof wird zu Muskelmasse für eine andere Kreatur.',
      en: "Scavenge means: the dead card in your graveyard turns into muscle mass for another creature.",
    },
  },
  {
    id: 'soulbond',
    category: 'keywords',
    term: { de: 'Soulbond (Seelenbund)', en: 'Soulbond' },
    definitionNormal: {
      de: 'Eine Kreatur mit Soulbond darf sich beim Ins-Spiel-Kommen mit einer anderen noch unverbundenen Kreatur paaren; solange beide kontrolliert werden, bleiben sie verbunden und teilen sich einen Bonus.',
      en: 'A creature with soulbond may pair with another unpaired creature when either enters the battlefield; as long as you control both, they stay bonded and share a bonus.',
    },
    definitionTrottel: {
      de: 'Soulbond heißt: zwei Kreaturen werden beste Freunde und profitieren beide davon.',
      en: 'Soulbond means: two creatures become best friends and both get the perks.',
    },
  },
  {
    id: 'soulshift',
    category: 'keywords',
    term: { de: 'Soulshift', en: 'Soulshift' },
    definitionNormal: {
      de: 'Stirbt eine Kreatur mit Soulshift, darf man eine Geist-Karte (Spirit) mit Manawert N oder weniger aus dem eigenen Friedhof zurück auf die Hand nehmen.',
      en: 'Whenever a creature with soulshift dies, you may return target Spirit card with mana value N or less from your graveyard to your hand.',
    },
    definitionTrottel: {
      de: 'Soulshift heißt: stirbt dieser Geist, holt er sich einen kleineren Geist-Kumpel aus dem Jenseits zurück.',
      en: 'Soulshift means: when this spirit dies, it pulls a smaller spirit buddy back from the beyond.',
    },
  },
  {
    id: 'spectacle',
    category: 'keywords',
    term: { de: 'Spectacle', en: 'Spectacle' },
    definitionNormal: {
      de: 'Hat ein Gegner diesen Zug bereits Lebenspunkte verloren, darf man die Karte für die günstigeren Spectacle-Kosten wirken.',
      en: "If an opponent has already lost life this turn, you may cast the card for its cheaper spectacle cost instead.",
    },
    definitionTrottel: {
      de: 'Spectacle heißt: blutet der Gegner schon ein bisschen, wird dein Zauber zum Schnäppchen.',
      en: "Spectacle means: if the opponent's already bleeding a little, your spell goes on sale.",
    },
  },
  {
    id: 'splice',
    category: 'keywords',
    term: { de: 'Splice (Verschmelzen)', en: 'Splice' },
    definitionNormal: {
      de: 'Beim Wirken eines Arkanzaubers darf man eine Karte mit Splice aus der Hand zeigen und deren Splice-Kosten zahlen, um ihre Effekte dem gewirkten Zauber hinzuzufügen.',
      en: 'As you cast an arcane spell, you may reveal a card with splice from your hand and pay its splice cost to add its effects to that spell.',
    },
    definitionTrottel: {
      de: 'Splice heißt: du schmuggelst die Fähigkeiten einer Handkarte heimlich in einen anderen Zauber.',
      en: "Splice means: you smuggle a hand card's effects into another spell without ever casting it.",
    },
  },
  {
    id: 'split-second',
    category: 'keywords',
    term: { de: 'Split Second', en: 'Split Second' },
    definitionNormal: {
      de: 'Solange ein Zauber mit Split Second auf dem Stapel liegt, dürfen keine Zaubersprüche gewirkt und keine Fähigkeiten aktiviert werden, die keine Manafähigkeiten sind.',
      en: "As long as a spell with split second is on the stack, players can't cast spells or activate abilities that aren't mana abilities.",
    },
    definitionTrottel: {
      de: 'Split Second heißt: während dieser Zauber wirkt, darf absolut niemand dazwischenfunken.',
      en: 'Split Second means: while this spell is resolving, absolutely nobody is allowed to interrupt.',
    },
    relatedTerms: ['stack'],
  },
  {
    id: 'storm',
    category: 'keywords',
    term: { de: 'Storm', en: 'Storm' },
    definitionNormal: {
      de: 'Beim Wirken eines Zaubers mit Storm entsteht für jeden davor in diesem Zug gewirkten Zauber eine Kopie, die neue Ziele bekommen darf.',
      en: 'When you cast a spell with storm, copy it for each spell cast before it this turn; the copies may choose new targets.',
    },
    definitionTrottel: {
      de: 'Storm heißt: je mehr du diese Runde schon gezaubert hast, desto mehr Kopien hagelt es am Ende.',
      en: "Storm means: the more you've already cast this turn, the bigger the hailstorm of copies at the end.",
    },
  },
  {
    id: 'sunburst',
    category: 'keywords',
    term: { de: 'Sunburst', en: 'Sunburst' },
    definitionNormal: {
      de: 'Ein Permanent mit Sunburst kommt mit einem +1/+1-Marker (bzw. Ladungsmarker bei Nicht-Kreaturen) für jede Farbe Mana ins Spiel, die zu seinen Kosten bezahlt wurde.',
      en: 'A permanent with sunburst enters with a +1/+1 counter (or charge counter if noncreature) for each color of mana spent to cast it.',
    },
    definitionTrottel: {
      de: 'Sunburst heißt: je bunter du bezahlst, desto mehr Marker gibt\'s obendrauf.',
      en: "Sunburst means: the more colors you pay with, the more counters you get on top.",
    },
  },
  {
    id: 'support',
    category: 'keywords',
    term: { de: 'Support (Unterstützung)', en: 'Support' },
    definitionNormal: {
      de: 'Support N bedeutet: Lege je einen +1/+1-Marker auf jede von bis zu N Zielkreaturen.',
      en: 'Support N means: put a +1/+1 counter on each of up to N target creatures.',
    },
    definitionTrottel: {
      de: 'Support heißt: ein bisschen Liebe für mehrere Kreaturen gleichzeitig.',
      en: 'Support means: a little love for several creatures at once.',
    },
  },
  {
    id: 'suspend',
    category: 'keywords',
    term: { de: 'Suspend (Verzögerung)', en: 'Suspend' },
    definitionNormal: {
      de: 'Man darf die Karte für ihre Suspend-Kosten mit N Zeitmarkern exilieren statt sie normal zu spielen. Zu Beginn der eigenen Aufrechterhaltungsphase wird ein Marker entfernt; ist der letzte weg, wird die Karte kostenlos gewirkt bzw. kommt mit Hast ins Spiel.',
      en: 'You may exile the card with N time counters for its suspend cost instead of playing it normally. At the beginning of your upkeep, remove a counter; when the last is removed, cast it for free (creatures enter with haste).',
    },
    definitionTrottel: {
      de: 'Suspend heißt: leg die Karte jetzt schon mal beiseite, und sie knallt ein paar Züge später kostenlos los.',
      en: 'Suspend means: stash the card away now, and it goes off for free a few turns later.',
    },
  },
  {
    id: 'toxic',
    category: 'keywords',
    term: { de: 'Toxic (Toxisch)', en: 'Toxic' },
    definitionNormal: {
      de: 'Toxic N bedeutet: Fügt diese Kreatur einem Spieler Kampfschaden zu, bekommt er zusätzlich N Gift-Marker.',
      en: 'Toxic N means: whenever this creature deals combat damage to a player, that player also gets N poison counters.',
    },
    definitionTrottel: {
      de: 'Toxic heißt: jeder Treffer im Kampf hinterlässt zusätzlich einen kleinen Gift-Stich.',
      en: 'Toxic means: every hit in combat also leaves a little sting of poison behind.',
    },
  },
  {
    id: 'transfigure',
    category: 'keywords',
    term: { de: 'Transfigure (Verwandlung)', en: 'Transfigure' },
    definitionNormal: {
      de: 'Zahl die Kosten und opfere diese Kreatur, um eine Kreaturenkarte mit demselben Manawert aus der eigenen Bibliothek zu suchen und ins Spiel zu bringen. Nur als Hexerei aktivierbar.',
      en: 'Pay the cost and sacrifice this creature to search your library for a creature card with the same mana value and put it onto the battlefield. Sorcery speed only.',
    },
    definitionTrottel: {
      de: 'Transfigure heißt: opfer diese Kreatur und tausch sie gegen eine andere mit demselben Preisschild aus dem Deck.',
      en: 'Transfigure means: sacrifice this creature and swap it for another one with the same price tag, straight from your deck.',
    },
  },
  {
    id: 'transmute',
    category: 'keywords',
    term: { de: 'Transmute', en: 'Transmute' },
    definitionNormal: {
      de: 'Zahl die Kosten und wirf diese Karte ab, um eine Karte mit demselben Manawert aus der eigenen Bibliothek zu suchen und auf die Hand zu nehmen. Nur einmal als Hexerei aktivierbar.',
      en: 'Pay the cost and discard this card to search your library for a card with the same mana value and put it into your hand. Sorcery speed, once only.',
    },
    definitionTrottel: {
      de: 'Transmute heißt: wirf die Karte weg und tausch sie gegen etwas mit demselben Preisschild aus dem Deck.',
      en: 'Transmute means: toss the card and swap it for anything with the same price tag from your deck.',
    },
  },
  {
    id: 'typecycling',
    category: 'keywords',
    term: { de: 'Typecycling', en: 'Typecycling' },
    definitionNormal: {
      de: 'Eine Variante von Cycling: Statt eine Karte zu ziehen, sucht man beim Abwerfen eine Karte des genannten Typs aus der eigenen Bibliothek.',
      en: 'A variant of cycling: instead of drawing a card, discarding it lets you search your library for a card of the stated type.',
    },
    definitionTrottel: {
      de: 'Typecycling heißt: wirf die Karte weg und angel dir stattdessen genau das Richtige aus dem Deck.',
      en: 'Typecycling means: toss the card and fish exactly what you need out of your deck instead.',
    },
  },
  {
    id: 'umbra-armor',
    category: 'keywords',
    term: { de: 'Umbra Armor (Schattenrüstung)', en: 'Umbra Armor' },
    definitionNormal: {
      de: 'Würde die verzauberte Kreatur zerstört werden, wird stattdessen aller Schaden von ihr entfernt und diese Verzauberung zerstört (Totem-Rüstung auf Auren mit "Umbra" im Namen).',
      en: 'If the enchanted creature would be destroyed, instead remove all damage from it and destroy this Aura (totem armor on Auras named "Umbra ...").',
    },
    definitionTrottel: {
      de: 'Umbra Armor heißt: Statt deiner Kreatur stirbt einfach die Rüstung.',
      en: 'Umbra Armor means: the armor dies instead of your creature.',
    },
  },
  {
    id: 'undying',
    category: 'keywords',
    term: { de: 'Undying', en: 'Undying' },
    definitionNormal: {
      de: 'Stirbt eine Kreatur mit Undying und hatte keine +1/+1-Marker, kommt sie mit einem +1/+1-Marker zurück auf das Spielfeld.',
      en: 'When a creature with undying dies and had no +1/+1 counters on it, it returns to the battlefield with a +1/+1 counter on it.',
    },
    definitionTrottel: {
      de: 'Undying heißt: einmal sterben zählt nicht, du kommst sogar stärker zurück.',
      en: "Undying means: dying once doesn't count, you come back even stronger.",
    },
    relatedTerms: ['persist'],
  },
  {
    id: 'unleash',
    category: 'keywords',
    term: { de: 'Unleash (Entfesseln)', en: 'Unleash' },
    definitionNormal: {
      de: 'Eine Kreatur mit Unleash darf mit einem +1/+1-Marker ins Spiel kommen; solange sie einen hat, darf sie nicht blocken.',
      en: "A creature with unleash may enter with a +1/+1 counter; as long as it has one, it can't block.",
    },
    definitionTrottel: {
      de: 'Unleash heißt: nimm den Kraft-Boost, verzichtest dafür aber aufs Blocken.',
      en: 'Unleash means: take the power boost, but give up the right to block.',
    },
  },
  {
    id: 'vanishing',
    category: 'keywords',
    term: { de: 'Vanishing (Verschwinden)', en: 'Vanishing' },
    definitionNormal: {
      de: 'Ein Permanent mit Vanishing kommt mit N Zeitmarkern ins Spiel. Zu Beginn der eigenen Aufrechterhaltungsphase wird ein Marker entfernt; ist der letzte weg, wird es geopfert.',
      en: 'A permanent with vanishing enters with N time counters. At the beginning of your upkeep, remove one; when the last is removed, sacrifice it.',
    },
    definitionTrottel: {
      de: 'Vanishing heißt: die Uhr tickt runter, und am Ende löst sich die Karte einfach in Luft auf.',
      en: 'Vanishing means: the clock ticks down, and eventually the card just vanishes into thin air.',
    },
  },
  {
    id: 'wither',
    category: 'keywords',
    term: { de: 'Wither (Verwelken)', en: 'Wither' },
    definitionNormal: {
      de: 'Eine Kreatur mit Wither fügt anderen Kreaturen ihren Kampfschaden in Form von -1/-1-Markern zu statt als normalen Schaden.',
      en: 'A creature with wither deals its combat damage to other creatures as -1/-1 counters instead of normal damage.',
    },
    definitionTrottel: {
      de: 'Wither heißt: statt normalem Schaden verkümmert die getroffene Kreatur dauerhaft.',
      en: 'Wither means: instead of normal damage, the creature it hits withers away permanently.',
    },
  },
  {
    id: 'banding',
    category: 'keywords',
    term: { de: 'Banding (historisch)', en: 'Banding (historical)' },
    definitionNormal: {
      de: 'Eine alte, sehr komplexe Regel: Kreaturen mit Banding (oder die mit ihnen angreifen/blocken) erlauben der kontrollierenden Spielerin, die Schadensverteilung im Kampf selbst zu bestimmen. Wegen der Komplexität wird Banding seit Langem nicht mehr auf neuen Karten gedruckt.',
      en: "An old, very complex rule: creatures with banding (or attacking/blocking alongside them) let their controller decide how combat damage is assigned. Due to its complexity, banding hasn't appeared on new cards in decades.",
    },
    definitionTrottel: {
      de: 'Banding war die Regel, die selbst erfahrene Spieler zum Regelheft greifen ließ – längst im Ruhestand.',
      en: 'Banding was the rule that made even veteran players reach for the rulebook – long since retired.',
    },
    relatedTerms: ['damage-assignment'],
  },
  {
    id: 'bury',
    category: 'keywords',
    term: { de: 'Bury (historisch)', en: 'Bury (historical)' },
    definitionNormal: {
      de: 'Alte Kurzform im Kartentext für "zerstören, und es kann nicht regeneriert werden". Wird auf neuen Karten nicht mehr verwendet, stattdessen wird es ausgeschrieben.',
      en: 'An old shorthand in card text meaning "destroy it, and it can\'t be regenerated." No longer used on new cards, which spell it out instead.',
    },
    definitionTrottel: {
      de: 'Bury hieß: tot und bleib auch tot, keine Wiederauferstehungs-Tricks erlaubt.',
      en: 'Bury meant: dead, and stay dead – no resurrection tricks allowed.',
    },
    relatedTerms: ['regenerate'],
  },
  {
    id: 'fear',
    category: 'keywords',
    term: { de: 'Fear (historisch)', en: 'Fear (historical)' },
    definitionNormal: {
      de: 'Eine ältere Fähigkeit: Eine Kreatur mit Fear kann nur von artifiziellen oder schwarzen Kreaturen geblockt werden. Wurde durch neuere Ausweich-Keywords abgelöst.',
      en: 'An older ability: a creature with fear can only be blocked by artifact or black creatures. Superseded by newer evasion keywords.',
    },
    definitionTrottel: {
      de: 'Fear hieß: fast niemand darf dich aufhalten – außer ein paar Robotern und den ganz Düsteren.',
      en: 'Fear meant: almost nobody could stop you – except a few robots and the real spooky types.',
    },
  },
  {
    id: 'intimidate',
    category: 'keywords',
    term: { de: 'Intimidate (historisch)', en: 'Intimidate (historical)' },
    definitionNormal: {
      de: 'Eine ältere Fähigkeit: Eine Kreatur mit Intimidate kann nur von artifiziellen Kreaturen oder Kreaturen derselben Farbe geblockt werden. Ebenfalls zugunsten neuerer Ausweich-Keywords eingestellt.',
      en: 'An older ability: a creature with intimidate can only be blocked by artifact creatures or creatures that share a color with it. Also retired in favor of newer evasion keywords.',
    },
    definitionTrottel: {
      de: 'Intimidate hieß: nur Roboter oder Farbverwandte trauen sich, dir in den Weg zu treten.',
      en: 'Intimidate meant: only robots or color-cousins dared step in your way.',
    },
  },
  {
    id: 'landhome',
    category: 'keywords',
    term: { de: 'Landhome (historisch)', en: 'Landhome (historical)' },
    definitionNormal: {
      de: 'Eine seltene, alte Fähigkeit (vor allem aus Homelands): Die Kreatur darf nur existieren, solange ein Land des genannten Typs im Spiel ist, sonst wird sie geopfert.',
      en: "A rare, old ability (mostly from Homelands): the creature can only exist as long as a land of the stated type is in play, or it's sacrificed.",
    },
    definitionTrottel: {
      de: 'Landhome hieß: ohne das richtige Zuhause-Land verschwindet die Kreatur einfach wieder.',
      en: 'Landhome meant: without the right home-type land around, the creature just disappears again.',
    },
  },
  {
    id: 'landwalk',
    category: 'keywords',
    term: { de: 'Landwalk (historisch)', en: 'Landwalk (historical)' },
    definitionNormal: {
      de: 'Eine Kreatur mit Landwalk (z. B. "Sumpfgängigkeit") kann nicht geblockt werden, solange die verteidigende Spielerin ein Land des genannten Typs kontrolliert. Wird wegen des Frust-Effekts ohne Gegenwehr nicht mehr neu gedruckt.',
      en: "A creature with landwalk (e.g. \"swampwalk\") can't be blocked as long as the defending player controls a land of the stated type. No longer printed due to its no-counterplay frustration factor.",
    },
    definitionTrottel: {
      de: 'Landwalk hieß: hat der Gegner das falsche Land, darf er gar nicht erst blocken.',
      en: "Landwalk meant: wrong land type in the opponent's yard, and they don't even get to block.",
    },
  },
  {
    id: 'phasing',
    category: 'keywords',
    term: { de: 'Phasing (historisch)', en: 'Phasing (historical)' },
    definitionNormal: {
      de: 'Ein Permanent mit Phasing wechselt jeden eigenen Entzugsschritt zwischen "ausgephast" (wird wie nicht-existent behandelt) und "eingephast". Eine alte, selten verwendete Fähigkeit.',
      en: 'A permanent with phasing alternates each of your untap steps between "phased out" (treated as if it doesn\'t exist) and "phased in." An old, rarely used ability.',
    },
    definitionTrottel: {
      de: 'Phasing hieß: die Karte macht mal eine Runde Unsichtbarkeits-Pause, als wäre sie gar nicht da.',
      en: "Phasing meant: the card takes an invisibility break every other turn, as if it wasn't even there.",
    },
  },
  {
    id: 'regenerate',
    category: 'keywords',
    term: { de: 'Regenerate (historisch)', en: 'Regenerate (historical)' },
    definitionNormal: {
      de: 'Regenerate erzeugt einen Schutzschild: Die nächste Zerstörung (und tödlicher Schaden) dieser Kreatur in diesem Zug wird stattdessen verhindert, sie wird enttappt, aus dem Kampf entfernt und abgetappt. Wird auf neuen Karten kaum noch verwendet.',
      en: "Regenerate creates a shield: the creature's next destruction (and lethal damage) this turn is prevented instead - it's untapped, removed from combat, and tapped. Rarely used on new cards anymore.",
    },
    definitionTrottel: {
      de: 'Regenerate hieß: Zerstörung Nummer eins prallt einfach ab, die Kreatur schüttelt sich nur kurz.',
      en: 'Regenerate meant: the first destruction just bounces off, the creature only shakes it off.',
    },
  },
  {
    id: 'shroud',
    category: 'keywords',
    term: { de: 'Shroud (historisch)', en: 'Shroud (historical)' },
    definitionNormal: {
      de: 'Wie Hexproof, nur strenger: Eine Kreatur mit Shroud kann von niemandem als Ziel gewählt werden – auch nicht von der eigenen kontrollierenden Spielerin. Wurde zugunsten des flexibleren Hexproof abgelöst.',
      en: "Like hexproof, but stricter: a permanent with shroud can't be targeted by anyone - not even its own controller. Superseded by the more flexible hexproof.",
    },
    definitionTrottel: {
      de: 'Shroud hieß: unsichtbar für alle, sogar für dich selbst – auch eigene Buff-Zauber konnten nicht mehr zielen.',
      en: "Shroud meant: invisible to everyone, even yourself – your own buff spells couldn't target it either.",
    },
    relatedTerms: ['hexproof'],
  },
];
