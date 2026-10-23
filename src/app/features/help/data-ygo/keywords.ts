import { HelpTermInput } from '../data/types';

// Yu-Gi-Oh!'s equivalent of a "keyword glossary" - summoning mechanics,
// monster/spell/trap subtypes, chain & effect-type vocabulary, common
// card-text actions, and Extra Deck material mechanics. Unlike MTG, YGO
// doesn't template dozens of reusable combat keywords onto card text -
// its comparably sized "named mechanic" vocabulary is the actual full
// list here, including retired/historical subtypes (Gemini, Spirit,
// Union, Dual, Trap Monster). Content written from verified Yu-Gi-Oh!
// TCG rules knowledge; a couple of entries carry an inline // NOTE where
// Konami's exact current rulebook wording is worth double-checking.
export const HELP_TERMS_YGO_KEYWORDS: HelpTermInput[] = [
  {
    id: 'ygo-normal-summon',
    category: 'keywords',
    term: { de: 'Normalbeschwörung', en: 'Normal Summon' },
    definitionNormal: {
      de: 'Eine Normalbeschwörung bringt ein Monster offen in Angriffsposition (oder verdeckt als "Setzen") ins Spiel, ohne Tribut, sofern seine Stufe 1-4 beträgt. Normalerweise nur einmal pro Zug möglich.',
      en: 'A Normal Summon puts a monster into play face-up in Attack Position (or face-down as a "Set"), with no tribute required, provided its Level is 1-4. Normally allowed only once per turn.',
    },
    definitionTrottel: {
      de: 'Normalbeschwörung ist dein Standard-Zug fürs Monster: einmal pro Runde, kein Opfer nötig, solange es nicht zu dick ist.',
      en: "Normal Summon is your standard monster move: once per turn, no sacrifice needed, as long as it's not too beefy.",
    },
    relatedTerms: ['ygo-tribute-summon', 'ygo-set-monster', 'ygo-level'],
  },
  {
    id: 'ygo-tribute-summon',
    category: 'keywords',
    term: { de: 'Tribut-Beschwörung', en: 'Tribute Summon' },
    definitionNormal: {
      de: 'Monster der Stufe 5-6 benötigen für ihre Normalbeschwörung ein Tributmonster, Stufe 7+ zwei. Die Tribute werden als Kosten auf den Friedhof gelegt, bevor das neue Monster erscheint.',
      en: 'Level 5-6 monsters need one tribute monster for their Normal Summon, Level 7+ need two. The tributes are sent to the Graveyard as a cost before the new monster appears.',
    },
    definitionTrottel: {
      de: 'Je dicker das Monster, desto mehr musst du vorher opfern – 5-6 Sterne kosten eins, 7+ kosten zwei.',
      en: 'The beefier the monster, the more you sacrifice first – 5-6 stars cost one, 7+ cost two.',
    },
    relatedTerms: ['ygo-normal-summon', 'ygo-level'],
  },
  {
    id: 'ygo-special-summon',
    category: 'keywords',
    term: { de: 'Spezialbeschwörung', en: 'Special Summon' },
    definitionNormal: {
      de: 'Jede Beschwörung, die nicht Normal-, Tribut- oder Setzen ist, zählt als Spezialbeschwörung - sie zählt nicht gegen das einmal-pro-Zug-Limit der Normalbeschwörung und geschieht meist durch Karteneffekte.',
      en: 'Any Summon that isn\'t a Normal Summon, Tribute Summon, or Set counts as a Special Summon - it doesn\'t use up the once-per-turn Normal Summon, and is usually caused by a card effect.',
    },
    definitionTrottel: {
      de: 'Spezialbeschwörung ist der Umweg um die Ein-Monster-pro-Zug-Regel – kostet keinen "normalen Zug", dafür braucht\'s eine Karte, die es erlaubt.',
      en: "Special Summon is the detour around the one-monster-per-turn rule – it doesn't cost your normal play, but you need a card that allows it.",
    },
    relatedTerms: ['ygo-fusion-summon', 'ygo-synchro-summon', 'ygo-xyz-summon', 'ygo-link-summon', 'ygo-pendulum-summon'],
  },
  {
    id: 'ygo-set-monster',
    category: 'keywords',
    term: { de: 'Setzen (Set)', en: 'Set' },
    definitionNormal: {
      de: '"Setzen" legt ein Monster verdeckt in Verteidigungsposition ins Spiel (als Teil der Normalbeschwörung) oder eine Zauber-/Fallenkarte verdeckt in ihre Zone - beides ohne Effekt auszulösen.',
      en: '"Set" puts a monster face-down in Defense Position (as part of a Normal Summon), or a Spell/Trap face-down in its zone - either way, without triggering anything.',
    },
    definitionTrottel: {
      de: 'Setzen ist die leise Variante: Karte verdeckt hinlegen, keine Show, einfach bereithalten.',
      en: 'Setting is the quiet option: lay the card face-down, no fanfare, just keep it ready.',
    },
    relatedTerms: ['ygo-face-up-down', 'ygo-flip-summon'],
  },
  {
    id: 'ygo-flip-summon',
    category: 'keywords',
    term: { de: 'Flip-Beschwörung', en: 'Flip Summon' },
    definitionNormal: {
      de: 'Wird ein verdecktes Monster durch Angriff oder Effekt aufgedeckt (in Angriffsposition gedreht), ist das eine Flip-Beschwörung - sie löst "Flip-Effekt"-Abilities aus.',
      en: 'When a face-down monster gets flipped face-up (into Attack Position) by being attacked or by an effect, that\'s a Flip Summon - it triggers "Flip Effect" abilities.',
    },
    definitionTrottel: {
      de: 'Flip-Beschwörung ist das "Überraschung!"-Moment – dein verdecktes Monster zeigt sich und zündet dabei oft einen Effekt.',
      en: 'Flip Summon is the "surprise!" moment – your face-down monster reveals itself, often setting off an effect.',
    },
    relatedTerms: ['ygo-flip-effect-monster', 'ygo-set-monster'],
  },
  {
    id: 'ygo-fusion-summon',
    category: 'keywords',
    term: { de: 'Fusionsbeschwörung', en: 'Fusion Summon' },
    definitionNormal: {
      de: 'Eine Fusionsbeschwörung kombiniert die auf dem Fusions-Monster genannten Materialmonster (meist per Fusionszauber) und schickt sie als Kosten auf den Friedhof, bevor das Fusions-Monster erscheint.',
      en: "A Fusion Summon combines the material monsters named on the Fusion Monster (usually via a Fusion Spell), sending them to the Graveyard as a cost before the Fusion Monster appears.",
    },
    definitionTrottel: {
      de: 'Fusion ist Kochen nach Rezept – die richtigen Zutaten-Monster reinwerfen, fertiges Gericht kommt raus.',
      en: "Fusion is cooking by recipe – toss in the right ingredient monsters, the finished dish comes out.",
    },
    relatedTerms: ['ygo-fusion-monster', 'ygo-contact-fusion'],
  },
  {
    id: 'ygo-contact-fusion',
    category: 'keywords',
    term: { de: 'Kontaktfusion', en: 'Contact Fusion' },
    definitionNormal: {
      de: 'Eine Kontaktfusion führt die Fusionsbeschwörung ohne Fusionszauber durch - allein über die Materialmonster, deren eigener Text das erlaubt.',
      en: "A Contact Fusion performs a Fusion Summon without a Fusion Spell - purely through the material monsters whose own text allows it.",
    },
    definitionTrottel: {
      de: 'Kontaktfusion heißt: kein Zauber nötig, die Monster verschmelzen einfach direkt miteinander.',
      en: "Contact Fusion means no spell needed – the monsters just fuse directly with each other.",
    },
    relatedTerms: ['ygo-fusion-summon'],
  },
  {
    id: 'ygo-ritual-summon',
    category: 'keywords',
    term: { de: 'Ritualbeschwörung', en: 'Ritual Summon' },
    definitionNormal: {
      de: 'Eine Ritualbeschwörung bringt ein Ritual-Monster von der Hand ins Spiel, indem ein Ritualzauber ein oder mehrere Monster mit mindestens der nötigen Stufen-Summe als Tribut auf den Friedhof legt.',
      en: "A Ritual Summon brings a Ritual Monster from the hand into play, as the Ritual Spell tributes one or more monsters whose combined Level meets the requirement.",
    },
    definitionTrottel: {
      de: 'Ritual heißt: erst Zutaten-Monster opfern, dann poppt das Ritual-Monster von der Hand aufs Feld.',
      en: "Ritual means: sacrifice the ingredient monsters first, then the Ritual Monster pops from hand onto the field.",
    },
    relatedTerms: ['ygo-ritual-monster', 'ygo-ritual-spell'],
  },
  {
    id: 'ygo-synchro-summon',
    category: 'keywords',
    term: { de: 'Synchrobeschwörung', en: 'Synchro Summon' },
    definitionNormal: {
      de: 'Eine Synchrobeschwörung schickt ein Tuner-Monster plus ein oder mehrere Nicht-Tuner als Material auf den Friedhof, deren Stufen-Summe exakt der Stufe des Synchro-Monsters entspricht.',
      en: 'A Synchro Summon sends one Tuner monster plus one or more non-Tuners to the Graveyard as material, whose combined Level exactly matches the Synchro Monster\'s Level.',
    },
    definitionTrottel: {
      de: 'Synchro ist Punktlandung: Tuner + Rest müssen exakt die Stufe des Zielmonsters ergeben, keine Toleranz.',
      en: "Synchro is a precision landing: Tuner plus the rest must add up exactly to the target's Level, no wiggle room.",
    },
    relatedTerms: ['ygo-synchro-monster', 'ygo-tuner-monster'],
  },
  {
    id: 'ygo-xyz-summon',
    category: 'keywords',
    term: { de: 'Xyz-Beschwörung', en: 'Xyz Summon' },
    definitionNormal: {
      de: 'Eine Xyz-Beschwörung stapelt zwei oder mehr Monster derselben Stufe unter das Xyz-Monster - sie werden zu Xyz-Material, nicht auf den Friedhof geschickt.',
      en: 'An Xyz Summon stacks two or more monsters of the same Level underneath the Xyz Monster - they become Xyz Material rather than going to the Graveyard.',
    },
    definitionTrottel: {
      de: 'Xyz-Beschwörung ist Stapeln statt Verheizen – die Materialmonster bleiben als Vorrat unter der Karte liegen.',
      en: "Xyz Summon is stacking, not burning – the material monsters stay parked underneath as a stash.",
    },
    relatedTerms: ['ygo-xyz-monster', 'ygo-xyz-material', 'ygo-rank'],
  },
  {
    id: 'ygo-pendulum-summon',
    category: 'keywords',
    term: { de: 'Pendelbeschwörung', en: 'Pendulum Summon' },
    definitionNormal: {
      de: 'Eine Pendelbeschwörung bringt beliebig viele Monster, deren Stufe zwischen den beiden Pendel-Skalen in der Pendel-Zone liegt, gleichzeitig von der Hand (bzw. auch aus dem Extra Deck, bei Pendel-Monstern) aufs Feld.',
      en: 'A Pendulum Summon brings any number of monsters whose Level falls between the two Pendulum Scales in the Pendulum Zones onto the field at once, from the hand (or from the Extra Deck, for Pendulum Monsters).',
    },
    definitionTrottel: {
      de: 'Pendelbeschwörung ist der große Rundumschlag – alles, was zwischen den beiden Skalenwerten passt, kommt auf einmal rein.',
      en: 'Pendulum Summon is the big sweep – everything that fits between the two scale values comes in all at once.',
    },
    relatedTerms: ['ygo-pendulum-monster', 'ygo-pendulum-scale', 'ygo-pendulum-zone'],
  },
  {
    id: 'ygo-link-summon',
    category: 'keywords',
    term: { de: 'Link-Beschwörung', en: 'Link Summon' },
    definitionNormal: {
      de: 'Eine Link-Beschwörung schickt Materialmonster, deren Anzahl die Link-Monster-Vorgabe erfüllt, auf den Friedhof (oder nutzt sie je nach Materialbedingung anders), und platziert das Link-Monster so, dass seine Pfeile auf gültige Zonen zeigen.',
      en: "A Link Summon sends material monsters meeting the Link Monster's material condition to the Graveyard (or uses them per its specific condition), placing the Link Monster so its arrows point at valid zones.",
    },
    definitionTrottel: {
      de: 'Link-Beschwörung braucht die richtige Materialanzahl UND einen Platz, von dem aus die Pfeile sinnvoll zeigen.',
      en: 'Link Summon needs the right amount of material AND a spot where the arrows actually point somewhere useful.',
    },
    relatedTerms: ['ygo-link-monster', 'ygo-link-rating', 'ygo-link-marker'],
  },
  {
    id: 'ygo-tuner-monster',
    category: 'keywords',
    term: { de: 'Tuner-Monster', en: 'Tuner Monster' },
    definitionNormal: {
      de: 'Ein Tuner-Monster ist für Synchrobeschwörungen zwingend nötig - mindestens eins muss unter den Materialmonstern sein, kombiniert mit einem oder mehreren Nicht-Tunern.',
      en: "A Tuner monster is mandatory for Synchro Summons - at least one must be among the material monsters, combined with one or more non-Tuners.",
    },
    definitionTrottel: {
      de: 'Ohne Tuner kein Synchro – er ist die Zutat, die den Rest überhaupt erst "stimmt".',
      en: 'No Tuner, no Synchro – it\'s the ingredient that "tunes" everything else in the first place.',
    },
    relatedTerms: ['ygo-synchro-summon', 'ygo-synchro-monster'],
  },
  {
    id: 'ygo-flip-effect-monster',
    category: 'keywords',
    term: { de: 'Flip-Effekt-Monster', en: 'Flip Effect Monster' },
    definitionNormal: {
      de: 'Ein Flip-Effekt-Monster löst seinen Effekt genau dann aus, wenn es durch Flip-Beschwörung aufgedeckt wird - durch Angriff oder einen Karteneffekt.',
      en: "A Flip Effect monster triggers its effect precisely when it's Flip Summoned - revealed face-up via attack or a card effect.",
    },
    definitionTrottel: {
      de: 'Flip-Effekt-Monster sind die Jack-in-the-Box-Karten – verdeckt hinlegen, und sobald sie aufgedeckt werden, knallt der Effekt.',
      en: "Flip Effect monsters are the jack-in-the-box cards – set them face-down, and the moment they flip up, the effect goes off.",
    },
    relatedTerms: ['ygo-flip-summon'],
  },
  {
    id: 'ygo-gemini-monster',
    category: 'keywords',
    term: { de: 'Gemini-Monster', en: 'Gemini Monster' },
    definitionNormal: {
      de: 'Ein Gemini-Monster gilt zunächst nur als Normal-Monster, bis man es erneut normal beschwört (während es schon auf dem Feld liegt) - erst dann sind seine Effekte aktiv.',
      en: 'A Gemini monster starts out treated as a Normal Monster, until it is Normal Summoned again while already on the field - only then do its effects switch on.',
    },
    definitionTrottel: {
      de: 'Gemini-Monster brauchen eine zweite Beschwörung, um "aufzuwachen" und ihre eigentlichen Effekte zu zeigen.',
      en: 'Gemini monsters need a second Summon to "wake up" and show their real effects.',
    },
  },
  {
    id: 'ygo-spirit-monster',
    category: 'keywords',
    term: { de: 'Spirit-Monster', en: 'Spirit Monster' },
    definitionNormal: {
      de: 'Ein Spirit-Monster kehrt am Ende des Zuges, in dem es normal beschworen wurde, automatisch auf die Hand zurück.',
      en: "A Spirit monster automatically returns to its owner's hand at the End Phase of the turn it was Normal Summoned.",
    },
    definitionTrottel: {
      de: 'Spirit-Monster sind Gastspieler – sie bleiben nur für einen Zug, dann gehen sie wieder nach Hause.',
      en: "Spirit monsters are guest stars – they only stick around for one turn, then they head back home.",
    },
  },
  {
    id: 'ygo-toon-monster',
    category: 'keywords',
    term: { de: 'Toon-Monster', en: 'Toon Monster' },
    definitionNormal: {
      de: 'Toon-Monster benötigen die Feldzauberkarte "Toon World" (oder eine Variante) auf dem Feld, um beschworen werden zu können, und dürfen oft Spieler direkt angreifen, selbst wenn Monster im Weg stehen.',
      en: 'Toon monsters need the "Toon World" Field Spell (or a variant) in play before they can be Summoned, and often get to attack players directly even past blocking monsters.',
    },
    definitionTrottel: {
      de: 'Toon-Monster brauchen erst ihre eigene Zeichentrick-Welt, dafür dürfen sie dann oft frech am Gegner vorbeidirekt zuschlagen.',
      en: 'Toon monsters need their own cartoon world first, but in exchange they often get to sneak past the opponent for a direct hit.',
    },
  },
  {
    id: 'ygo-union-monster',
    category: 'keywords',
    term: { de: 'Union-Monster', en: 'Union Monster' },
    definitionNormal: {
      de: 'Ein Union-Monster kann sich selbst an ein anderes Monster "ausrüsten" und verleiht ihm dabei einen Bonus. Wird das ausgerüstete Monster zerstört, wird das Union-Monster stattdessen zerstört und bleibt somit auf dem Feld.',
      en: "A Union monster can equip itself to another monster, granting it a bonus. If the equipped monster would be destroyed, the Union monster is destroyed instead, staying in play as a monster otherwise.",
    },
    definitionTrottel: {
      de: 'Union-Monster spielen Bodyguard – sie hängen sich an ein anderes Monster und fangen den tödlichen Treffer stattdessen selbst ein.',
      en: 'Union monsters play bodyguard – they latch onto another monster and take the killing blow for it instead.',
    },
  },
  {
    id: 'ygo-dual-monster',
    category: 'keywords',
    term: { de: 'Dual-Monster', en: 'Dual Monster' },
    definitionNormal: {
      de: 'Ein Dual-Monster gilt nach der ersten Beschwörung zunächst nur als Normal-Monster, bis man es erneut normal beschwört (ähnlich wie Gemini), danach sind seine Effekte aktiv - und es gilt endgültig als Effekt-Monster.',
      en: "A Dual monster starts out treated as a Normal Monster after its first Summon, until Normal Summoned again (similar to Gemini) - only then do its effects switch on, and it permanently counts as an Effect Monster.",
    },
    definitionTrottel: {
      de: 'Dual-Monster sind wie Gemini, nur dass sie beim zweiten Aufwachen endgültig zum Effekt-Monster werden.',
      en: 'Dual monsters are like Gemini, except once they "wake up" the second time, they stay an Effect Monster for good.',
    },
    relatedTerms: ['ygo-gemini-monster'],
  },
  {
    id: 'ygo-normal-spell',
    category: 'keywords',
    term: { de: 'Normalzauber', en: 'Normal Spell' },
    definitionNormal: {
      de: 'Normalzauber dürfen nur in einer eigenen Hauptphase aktiviert werden und wandern danach auf den Friedhof.',
      en: "Normal Spells can only be activated during one of your own Main Phases, then go to the Graveyard afterward.",
    },
    definitionTrottel: {
      de: 'Normalzauber sind die Nur-wenn-ich-dran-bin-Karten, danach ab in den Friedhof.',
      en: 'Normal Spells are the only-on-my-turn cards, then straight to the Graveyard.',
    },
    exampleCards: ['Raigeki'],
  },
  {
    id: 'ygo-quick-play-spell',
    category: 'keywords',
    term: { de: 'Schnellzauber (Quick-Play Spell)', en: 'Quick-Play Spell' },
    definitionNormal: {
      de: 'Ein Schnellzauber darf von der Hand aus nur in einer eigenen Hauptphase aktiviert werden, von einer vorher gesetzten Position aus aber jederzeit, zu dem eine Aktivierung möglich wäre - auch im gegnerischen Zug.',
      en: "A Quick-Play Spell can only be activated from the hand during one of your own Main Phases - but from a face-down Set position, it can go off any time activation would normally be allowed, including your opponent's turn.",
    },
    definitionTrottel: {
      de: 'Von der Hand nur in deinem Zug, aber einmal verdeckt gesetzt darfst du jederzeit zünden – fast wie eine Falle.',
      en: 'From the hand it\'s your-turn-only, but once Set face-down you can fire it any time – almost like a Trap.',
    },
  },
  {
    id: 'ygo-continuous-spell',
    category: 'keywords',
    term: { de: 'Dauerzauber (Continuous Spell)', en: 'Continuous Spell' },
    definitionNormal: {
      de: 'Ein Dauerzauber bleibt nach der Aktivierung offen auf dem Feld und wirkt dauerhaft weiter, bis er entfernt wird.',
      en: "A Continuous Spell stays face-up on the field after activation, continuing to apply its effect until removed.",
    },
    definitionTrottel: {
      de: 'Dauerzauber sind die Für-immer-Karten – einmal aktiviert, bleiben sie liegen und wirken weiter.',
      en: 'Continuous Spells are the forever cards – activate once, and they stick around still working.',
    },
  },
  {
    id: 'ygo-equip-spell',
    category: 'keywords',
    term: { de: 'Ausrüstungszauber (Equip Spell)', en: 'Equip Spell' },
    definitionNormal: {
      de: 'Ein Ausrüstungszauber wird an ein Monster angelegt und verändert dessen Werte oder verleiht ihm eine Eigenschaft. Verlässt das ausgerüstete Monster das Feld, geht die Ausrüstungskarte normalerweise auf den Friedhof.',
      en: "An Equip Spell attaches to a monster, changing its stats or granting it a property. If the equipped monster leaves the field, the Equip Card usually goes to the Graveyard too.",
    },
    definitionTrottel: {
      de: 'Ausrüstungszauber sind das Upgrade für ein Monster - geht das Monster weg, fällt die Ausrüstung meist mit ab.',
      en: 'Equip Spells are the upgrade for a monster - if the monster goes, the gear usually falls off with it.',
    },
  },
  {
    id: 'ygo-field-spell',
    category: 'keywords',
    term: { de: 'Feldzauber (Field Spell)', en: 'Field Spell' },
    definitionNormal: {
      de: 'Ein Feldzauber wird in die eigene Feldzauber-Zone gelegt und wirkt dauerhaft für das gesamte Feld, bis er ersetzt oder entfernt wird. Jede Spielerin kann gleichzeitig einen eigenen haben.',
      en: "A Field Spell goes into its owner's Field Zone and affects the whole field for as long as it stays there - replaced or removed. Each player can have one in play at the same time.",
    },
    definitionTrottel: {
      de: 'Feldzauber verändern die Spielumgebung selbst – wie das Wetter für das ganze Feld.',
      en: 'Field Spells change the playing environment itself – like weather for the whole field.',
    },
    relatedTerms: ['ygo-field-zone'],
  },
  {
    id: 'ygo-ritual-spell',
    category: 'keywords',
    term: { de: 'Ritualzauber (Ritual Spell)', en: 'Ritual Spell' },
    definitionNormal: {
      de: 'Ein Ritualzauber führt die Ritualbeschwörung eines bestimmten (oder passenden) Ritual-Monsters durch, indem er andere Monster als Tribut mit ausreichender Stufen-Summe auf den Friedhof legt.',
      en: 'A Ritual Spell performs the Ritual Summon of a specific (or compatible) Ritual Monster by tributing other monsters whose combined Level meets the requirement.',
    },
    definitionTrottel: {
      de: 'Der Ritualzauber ist das Rezept – er sagt genau, welche Monster-Zutaten für welches Ritual-Monster reinmüssen.',
      en: 'The Ritual Spell is the recipe – it spells out exactly which monster ingredients go into which Ritual Monster.',
    },
    relatedTerms: ['ygo-ritual-summon', 'ygo-ritual-monster'],
  },
  {
    id: 'ygo-normal-trap',
    category: 'keywords',
    term: { de: 'Normalfalle', en: 'Normal Trap' },
    definitionNormal: {
      de: 'Eine Normalfalle löst sich nach Aktivierung auf und wandert danach auf den Friedhof.',
      en: "A Normal Trap resolves once and then goes to the Graveyard.",
    },
    definitionTrottel: {
      de: 'Normalfalle: einmal zuschnappen, danach ab in den Friedhof.',
      en: 'Normal Trap: snap shut once, then straight to the Graveyard.',
    },
    exampleCards: ['Mirror Force'],
  },
  {
    id: 'ygo-continuous-trap',
    category: 'keywords',
    term: { de: 'Dauerfalle (Continuous Trap)', en: 'Continuous Trap' },
    definitionNormal: {
      de: 'Eine Dauerfalle bleibt nach der Aktivierung offen auf dem Feld und wirkt weiter, bis sie entfernt wird.',
      en: "A Continuous Trap stays face-up on the field after activation and keeps working until removed.",
    },
    definitionTrottel: {
      de: 'Dauerfalle ist die Falle, die liegen bleibt und immer wieder zuschnappen kann.',
      en: 'Continuous Trap is the trap that stays put and keeps on snapping.',
    },
  },
  {
    id: 'ygo-counter-trap',
    category: 'keywords',
    term: { de: 'Konterfalle (Counter Trap)', en: 'Counter Trap' },
    definitionNormal: {
      de: 'Konterfallen haben Spell Speed 3 - die höchste Geschwindigkeit im Spiel - und können damit auch andere Zauber-, Fallen- und manche Monstereffekte direkt negieren, während diese sich aktivieren.',
      en: 'Counter Traps have Spell Speed 3 - the highest speed in the game - letting them negate other Spells, Traps, and some monster effects as they\'re being activated.',
    },
    definitionTrottel: {
      de: 'Konterfallen sind die schnellsten Karten im Spiel – sie grätschen anderen Zaubern/Fallen noch rein, bevor die überhaupt wirken.',
      en: 'Counter Traps are the fastest cards in the game – they slide in and stop other Spells/Traps before they even resolve.',
    },
    relatedTerms: ['ygo-spell-speed'],
    exampleCards: ['Solemn Judgment'],
  },
  {
    id: 'ygo-chain',
    category: 'keywords',
    term: { de: 'Chain (Kette)', en: 'Chain' },
    definitionNormal: {
      de: 'Eine Chain entsteht, wenn auf eine Aktivierung mit einer weiteren Aktivierung reagiert wird - sie löst sich in umgekehrter Reihenfolge auf (zuletzt aktiviert, zuerst aufgelöst).',
      en: 'A Chain forms when one activation is responded to with another activation - it resolves in reverse order (last activated, first resolved).',
    },
    definitionTrottel: {
      de: 'Chain ist wie ein Teller-Stapel: Was zuletzt obendrauf kommt, wird zuerst wieder abgetragen.',
      en: 'A Chain is like a stack of plates: whatever goes on last comes off first.',
    },
    relatedTerms: ['ygo-chain-link'],
  },
  {
    id: 'ygo-chain-link',
    category: 'keywords',
    term: { de: 'Chain Link', en: 'Chain Link' },
    definitionNormal: {
      de: 'Jede Aktivierung innerhalb einer Chain ist ein durchnummerierter Chain Link. Chain Link 1 ist die erste Aktivierung, löst sich aber zuletzt auf.',
      en: 'Each activation within a Chain is a numbered Chain Link. Chain Link 1 is the first activation, but resolves last.',
    },
    definitionTrottel: {
      de: 'Chain Links sind die Nummernschilder der Kette – Nummer 1 fängt an, löst sich aber als Letzte auf.',
      en: "Chain Links are the chain's numbered tags – Link 1 starts things off, but resolves dead last.",
    },
    relatedTerms: ['ygo-chain'],
  },
  {
    id: 'ygo-trigger-effect',
    category: 'keywords',
    term: { de: 'Trigger-Effekt (Trigger Effect)', en: 'Trigger Effect' },
    definitionNormal: {
      de: 'Ein Trigger-Effekt aktiviert sich automatisch, sobald seine Bedingung erfüllt ist (z. B. "wenn dieses Monster zerstört wird") - er wird auf den Chain gelegt, sobald möglich.',
      en: 'A Trigger Effect activates automatically once its condition is met (e.g. "when this card is destroyed") - it gets added to the Chain as soon as possible.',
    },
    definitionTrottel: {
      de: 'Trigger-Effekte feuern von selbst, sobald "das Ding" passiert ist – du musst nur noch zustimmen, dass sie auf die Kette kommen.',
      en: 'Trigger Effects fire on their own once "the thing" happens – you just need to let them join the Chain.',
    },
  },
  {
    id: 'ygo-ignition-effect',
    category: 'keywords',
    term: { de: 'Ignition-Effekt (Ignition Effect)', en: 'Ignition Effect' },
    definitionNormal: {
      de: 'Ein Ignition-Effekt darf nur während einer eigenen Hauptphase aktiviert werden, wenn der Chain leer ist, und braucht keine auslösende Bedingung - man entscheidet sich einfach dafür.',
      en: "An Ignition Effect can only be activated during one of your own Main Phases with an empty Chain, and needs no triggering condition - you simply choose to activate it.",
    },
    definitionTrottel: {
      de: 'Ignition-Effekte sind reine "ich will jetzt"-Effekte: dein Zug, leere Kette, einfach aktivieren.',
      en: 'Ignition Effects are pure "I feel like it" effects: your turn, empty Chain, just activate.',
    },
  },
  {
    id: 'ygo-quick-effect',
    category: 'keywords',
    term: { de: 'Quick-Effekt (Quick Effect)', en: 'Quick Effect' },
    definitionNormal: {
      de: 'Ein Quick-Effekt darf jederzeit aktiviert werden, zu dem man reagieren dürfte - auch im gegnerischen Zug - und sich dabei auf eine bestehende Chain legen.',
      en: 'A Quick Effect can be activated any time a response would be allowed - including on the opponent\'s turn - joining an existing Chain if there is one.',
    },
    definitionTrottel: {
      de: 'Quick-Effekte sind die Jederzeit-Karten unter den Monstereffekten – fast wie eine Falle, nur eben ein Monster-Text.',
      en: "Quick Effects are the anytime option among monster effects – almost like a Trap, just written on a monster.",
    },
  },
  {
    id: 'ygo-continuous-effect',
    category: 'keywords',
    term: { de: 'Dauer-Effekt (Continuous Effect)', en: 'Continuous Effect' },
    definitionNormal: {
      de: 'Ein Dauer-Effekt wirkt ständig, ohne auf die Chain zu müssen und ohne aktiviert zu werden - z. B. eine permanente Statserhöhung, solange die Karte auf dem Feld liegt.',
      en: "A Continuous Effect just applies constantly, without ever going on the Chain or being activated - e.g. a permanent stat boost for as long as the card is on the field.",
    },
    definitionTrottel: {
      de: 'Dauer-Effekte laufen einfach im Hintergrund mit – kein Chain, kein Aktivieren, sie wirken schlicht immer.',
      en: 'Continuous Effects just run in the background – no Chain, no activation, they simply always apply.',
    },
  },
  {
    id: 'ygo-cost-vs-condition',
    category: 'keywords',
    term: { de: 'Kosten vs. Bedingung (Cost vs. Condition)', en: 'Cost vs. Condition' },
    definitionNormal: {
      de: 'Kosten (z. B. "entsorge eine Karte") werden beim Aktivieren sofort bezahlt und lassen sich nicht negieren. Eine Bedingung (z. B. "falls du keine Karten auf der Hand hast") muss schon vorher erfüllt sein, bevor man überhaupt aktivieren darf.',
      en: 'A cost (e.g. "discard a card") is paid immediately on activation and can\'t be negated away. A condition (e.g. "if you have no cards in hand") must already be true before you\'re even allowed to activate.',
    },
    definitionTrottel: {
      de: 'Kosten zahlst du sofort und kriegst sie nicht zurück, egal was danach passiert. Bedingung heißt: Erst checken, ob\'s überhaupt erlaubt ist, bevor du loslegst.',
      en: 'You pay a cost right away and never get it back, no matter what happens after. A condition just means: check first whether you\'re even allowed to start.',
    },
  },
  {
    id: 'ygo-activate',
    category: 'keywords',
    term: { de: 'Aktivieren (Activate)', en: 'Activate' },
    definitionNormal: {
      de: 'Aktivieren heißt, eine Zauber-, Fallen- oder Monsterkarteneffekt offiziell anzukündigen und auf die Chain zu legen - vergleichbar mit dem Wirken eines Zaubers in anderen Sammelkartenspielen.',
      en: 'To activate means officially announcing a Spell, Trap, or monster effect and putting it on the Chain - roughly the Yu-Gi-Oh! equivalent of casting a spell in other TCGs.',
    },
    definitionTrottel: {
      de: 'Aktivieren ist das offizielle "Jetzt kommt\'s" – die Karte wird angesagt und geht auf die Kette.',
      en: 'Activating is the official "here it comes" – the card gets announced and joins the Chain.',
    },
    relatedTerms: ['ygo-chain'],
  },
  {
    id: 'ygo-spell-speed',
    category: 'keywords',
    term: { de: 'Zaubergeschwindigkeit (Spell Speed)', en: 'Spell Speed' },
    definitionNormal: {
      de: 'Spell Speed (1-3) regelt, was auf was reagieren darf: Speed 1 darf nicht auf eine bestehende Chain reagieren, Speed 2 schon, Speed 3 (Konterfallen) kann sogar andere Aktivierungen direkt negieren.',
      en: 'Spell Speed (1-3) governs what can respond to what: Speed 1 cannot respond to an existing Chain, Speed 2 can, and Speed 3 (Counter Traps) can even directly negate other activations.',
    },
    definitionTrottel: {
      de: 'Je höher die Zaubergeschwindigkeit, desto frecher darf die Karte dazwischenfunken.',
      en: 'The higher the Spell Speed, the more a card is allowed to butt in.',
    },
    relatedTerms: ['ygo-counter-trap'],
  },
  {
    id: 'ygo-hard-once-per-turn',
    category: 'keywords',
    term: { de: 'Striktes Einmal-pro-Zug (Hard OPT)', en: 'Hard Once Per Turn (HOPT)' },
    definitionNormal: {
      de: 'Ein striktes "Einmal pro Zug" (Text direkt auf der Karte, nicht in Klammern) gilt pro Kartenname insgesamt, über beide Spielerzüge hinweg - anders als die "weiche" Variante in Klammern, die nur für den eigenen Zug zählt.',
      en: 'A hard "once per turn" (written directly in the card text, not in parentheses) applies per card name across both players\' turns combined - unlike the "soft" bracketed version, which only counts for your own turn.',
    },
    definitionTrottel: {
      de: 'Hartes Einmal-pro-Zug zählt für die ganze Runde (dein Zug UND der vom Gegner), weiches Einmal-pro-Zug nur für deinen eigenen.',
      en: "Hard once-per-turn counts for the whole round (your turn AND your opponent's), soft once-per-turn only for your own.",
    },
    // NOTE: exact current rulebook phrasing for "(each name)" wording worth double-checking against the latest official rulebook before publishing.
  },
  {
    id: 'ygo-destroy',
    category: 'keywords',
    term: { de: 'Zerstören (Destroy)', en: 'Destroy' },
    definitionNormal: {
      de: 'Zerstören schickt eine Karte vom Feld auf den Friedhof (es sei denn, ein anderer Effekt greift stattdessen, z. B. Verbannen). Zerstörung durch Kampf und durch Karteneffekt sind beide "Zerstörung".',
      en: 'Destroy sends a card from the field to the Graveyard (unless another effect intervenes, e.g. banishing it instead). Destruction by battle and by card effect both count as "destruction".',
    },
    definitionTrottel: {
      de: 'Zerstören heißt: ab auf den Friedhof, egal ob durch Kampf oder durch einen Effekt.',
      en: 'Destroy means: off to the Graveyard, whether it happened in battle or via an effect.',
    },
    relatedTerms: ['ygo-graveyard'],
  },
  {
    id: 'ygo-discard',
    category: 'keywords',
    term: { de: 'Abwerfen (Discard)', en: 'Discard' },
    definitionNormal: {
      de: 'Abwerfen schickt eine Karte von der Hand auf den Friedhof - entweder als Kosten eines Effekts oder in der Endphase, falls die Handkartenzahl 6 überschreitet.',
      en: 'Discarding sends a card from the hand to the Graveyard - either as the cost of an effect, or during the End Phase if hand size exceeds 6.',
    },
    definitionTrottel: {
      de: 'Abwerfen = Karte aus der Hand direkt in den Friedhof legen.',
      en: 'Discard = drop a card straight from hand into the Graveyard.',
    },
  },
  {
    id: 'ygo-mill',
    category: 'keywords',
    term: { de: 'Millen (Mill)', en: 'Mill' },
    definitionNormal: {
      de: 'Millen (umgangssprachlich, kein offizieller Kartentext-Begriff) bezeichnet das Senden von Karten vom eigenen Deck direkt auf den Friedhof, ohne sie zu ziehen.',
      en: 'Milling (a slang term, not official card-text wording) refers to sending cards straight from the deck to the Graveyard without drawing them.',
    },
    definitionTrottel: {
      de: 'Millen heißt: Karten vom Deck direkt in den Friedhof schieben, ohne sie je in die Hand zu nehmen.',
      en: "Milling means sliding cards from the deck straight into the Graveyard without ever drawing them.",
    },
    relatedTerms: ['ygo-graveyard'],
  },
  {
    id: 'ygo-shuffle',
    category: 'keywords',
    term: { de: 'Mischen (Shuffle)', en: 'Shuffle' },
    definitionNormal: {
      de: 'Mischen verteilt die Karten eines Decks (oder einer anderen gemischten Zone) in zufälliger Reihenfolge neu - oft gefordert, wenn Karten vom Friedhof oder aus der Hand zurück ins Deck gelegt werden.',
      en: 'Shuffling randomizes the order of a deck (or another shuffled zone) - often required when cards return from the Graveyard or hand back into the deck.',
    },
    definitionTrottel: {
      de: 'Mischen bringt die Reihenfolge wieder komplett durcheinander – niemand weiß mehr, was wo liegt.',
      en: "Shuffling scrambles the order completely – nobody knows what's where anymore.",
    },
  },
  {
    id: 'ygo-search',
    category: 'keywords',
    term: { de: 'Suchen/Hinzufügen (Search)', en: 'Search / Add to Hand' },
    definitionNormal: {
      de: 'Ein Such-Effekt lässt die passende Karte im eigenen Deck gezielt gesucht und auf die Hand genommen werden, statt zufällig zu ziehen.',
      en: 'A Search effect lets a player look through their own deck for a specific card and add it to hand, instead of drawing randomly.',
    },
    definitionTrottel: {
      de: 'Suchen heißt: statt blind zu ziehen, darfst du dir gezielt die Karte raussuchen, die du brauchst.',
      en: "Search means: instead of drawing blind, you get to dig out exactly the card you need.",
    },
  },
  {
    id: 'ygo-negate',
    category: 'keywords',
    term: { de: 'Negieren (Negate)', en: 'Negate' },
    definitionNormal: {
      de: 'Negieren verhindert, dass eine Aktivierung sich auflöst (sie verschwindet trotzdem vom Chain) oder dass ein Effekt/eine Fähigkeit weiterhin wirkt. Negierte Kosten, bereits ausgelöste Teileffekte oder bereits erfolgte Beschwörungen bleiben davon unberührt, je nach genauem Wortlaut.',
      en: "Negating stops an activation from resolving (it still leaves the Chain) or stops an effect/ability from continuing to apply. Already-paid costs, already-applied partial effects, or a Summon that already happened may or may not be undone, depending on the exact wording.",
    },
    definitionTrottel: {
      de: 'Negieren heißt: Stopp-Schild davor – die Karte ist trotzdem "weg vom Stapel", aber ihre Wirkung passiert nicht.',
      en: "Negate means: slap a stop sign on it – the card still leaves the Chain, but its effect just doesn't happen.",
    },
  },
  {
    id: 'ygo-piercing',
    category: 'keywords',
    term: { de: 'Durchschlagender Schaden (Piercing)', en: 'Piercing Battle Damage' },
    definitionNormal: {
      de: 'Durchschlagender Schaden lässt überschüssigen Kampfschaden gegen einen Blocker in Verteidigungsposition direkt an die gegnerische Spielerin durchgehen - normalerweise richtet ein Angriff gegen einen Verteidiger keinen Spielerschaden an.',
      en: "Piercing damage lets excess battle damage against a Defense Position blocker carry through directly to the opponent - normally an attack against a defender deals no damage to the player at all.",
    },
    definitionTrottel: {
      de: 'Piercing heißt: selbst wenn der Verteidiger überlebt, bekommt der Gegner trotzdem den Rest-Schaden ab.',
      en: "Piercing means even if the defender survives, the opponent still takes the leftover damage.",
    },
  },
  {
    id: 'ygo-direct-attack',
    category: 'keywords',
    term: { de: 'Direkter Angriff (Direct Attack)', en: 'Direct Attack' },
    definitionNormal: {
      de: 'Ein direkter Angriff greift die gegnerische Spielerin selbst an statt eines Monsters - normalerweise nur möglich, wenn sie keine Monster kontrolliert, oder wenn ein Effekt es explizit erlaubt.',
      en: "A direct attack targets the opponent's player instead of a monster - normally only possible if they control no monsters, or when an effect explicitly allows it.",
    },
    definitionTrottel: {
      de: 'Direkter Angriff heißt: keine Monster im Weg, also geht\'s direkt auf die Lebenspunkte.',
      en: "Direct attack means no monsters in the way, so it goes straight for the life points.",
    },
  },
  {
    id: 'ygo-multiple-attacks',
    category: 'keywords',
    term: { de: 'Mehrfachangriff', en: 'Multiple Attacks' },
    definitionNormal: {
      de: 'Manche Karteneffekte erlauben einem Monster, in derselben Kampfphase mehr als einmal anzugreifen.',
      en: 'Some card effects let a monster attack more than once in the same Battle Phase.',
    },
    definitionTrottel: {
      de: 'Mehrfachangriff heißt: ein Monster darf gleich mehrmals zuschlagen, statt nur einmal.',
      en: 'Multiple Attacks means one monster gets to swing more than once, instead of just once.',
    },
  },
  {
    id: 'ygo-battle-position-change',
    category: 'keywords',
    term: { de: 'Kampfpositionswechsel', en: 'Battle Position Change' },
    definitionNormal: {
      de: 'Ein Monster darf normalerweise einmal pro Zug und nur in einer eigenen Hauptphase die Kampfposition wechseln - nicht in dem Zug, in dem es beschworen wurde, und nicht, nachdem es in diesem Zug schon angegriffen hat.',
      en: "A monster can normally change Battle Position once per turn, only during one of your own Main Phases - not the turn it was Summoned, and not after it has already attacked that turn.",
    },
    definitionTrottel: {
      de: 'Umdrehen geht nur einmal pro Zug, nicht im Beschwörungszug, und nicht nach einem Angriff.',
      en: "Flipping position only works once per turn, not the turn it was Summoned, and not after it's attacked.",
    },
    relatedTerms: ['ygo-attack-defense-position'],
  },
  {
    id: 'ygo-replay',
    category: 'keywords',
    term: { de: 'Replay', en: 'Replay' },
    definitionNormal: {
      de: 'Ändert sich nach der Angriffserklärung, aber vor der Blocker-/Schadensauflösung die Zahl der angreifenden oder verteidigenden Monster (z. B. durch ein zerstörtes Monster), darf der Angriff neu erklärt werden ("Replay").',
      en: "If the number of attacking or defending monsters changes after an attack is declared but before damage, (e.g. a monster gets destroyed), the attack may be re-declared - a Replay.",
    },
    definitionTrottel: {
      de: 'Replay heißt: ändert sich mitten im Angriff was Entscheidendes, darfst du den Angriff nochmal neu ansagen.',
      en: "Replay means: if something crucial changes mid-attack, you get to re-declare the attack from scratch.",
    },
    relatedTerms: ['ygo-replay-scenario'],
  },
  {
    id: 'ygo-damage-step',
    category: 'keywords',
    term: { de: 'Schadensschritt (Damage Step)', en: 'Damage Step' },
    definitionNormal: {
      de: 'Im Schadensschritt werden ATK/DEF-Werte final festgelegt, Schaden berechnet und zugefügt. Nur wenige Effekttypen (z. B. "beim Schadensberechnung") dürfen hier noch eingreifen.',
      en: 'In the Damage Step, ATK/DEF values are finalized, damage is calculated, and dealt. Only a few effect types (e.g. "during damage calculation") may still intervene here.',
    },
    definitionTrottel: {
      de: 'Der Schadensschritt ist der Moment der Wahrheit – Werte stehen fest, Schaden wird berechnet, kaum noch Raum für Tricks.',
      en: 'The Damage Step is the moment of truth – stats are locked in, damage gets calculated, barely any room left for tricks.',
    },
    relatedTerms: ['ygo-battle-phase', 'ygo-damage-step-walkthrough'],
  },
  {
    id: 'ygo-xyz-material',
    category: 'keywords',
    term: { de: 'Xyz-Material (Overlay Unit)', en: 'Xyz Material (Overlay Unit)' },
    definitionNormal: {
      de: 'Xyz-Material liegt verdeckt unter einem Xyz-Monster, gilt nicht länger als "auf dem Feld" im normalen Sinne und kann von Effekten als Kosten abgelöst (entfernt) werden.',
      en: "Xyz Material sits stacked underneath an Xyz Monster, no longer counts as 'on the field' in the normal sense, and can be detached as a cost by effects.",
    },
    definitionTrottel: {
      de: 'Xyz-Material ist der Treibstofftank – du zapfst ihn an, wenn ein Effekt Material als Kosten verlangt.',
      en: "Xyz Material is the fuel tank – you tap into it whenever an effect asks for material as its cost.",
    },
    relatedTerms: ['ygo-xyz-summon', 'ygo-xyz-detach-timing'],
  },
  {
    id: 'ygo-synchro-material',
    category: 'keywords',
    term: { de: 'Synchro-Material', en: 'Synchro Material' },
    definitionNormal: {
      de: 'Synchro-Material (Tuner + Nicht-Tuner) wird bei der Synchrobeschwörung als Kosten auf den Friedhof geschickt, nicht unter dem Synchro-Monster gestapelt.',
      en: 'Synchro Material (Tuner + non-Tuners) is sent to the Graveyard as a cost during the Synchro Summon, not stacked underneath the Synchro Monster.',
    },
    definitionTrottel: {
      de: 'Synchro-Material wird verbraucht, nicht aufgehoben – es landet direkt im Friedhof.',
      en: "Synchro Material gets used up, not kept – it goes straight to the Graveyard.",
    },
    relatedTerms: ['ygo-synchro-summon'],
  },
  {
    id: 'ygo-fusion-material',
    category: 'keywords',
    term: { de: 'Fusions-Material', en: 'Fusion Material' },
    definitionNormal: {
      de: 'Fusions-Material wird für eine Fusionsbeschwörung als Kosten auf den Friedhof geschickt (bei Kontaktfusion ohne Zauberkarte, sonst meist per Fusionszauber).',
      en: 'Fusion Material is sent to the Graveyard as a cost for a Fusion Summon (without a spell for Contact Fusion, otherwise usually via a Fusion Spell).',
    },
    definitionTrottel: {
      de: 'Fusions-Material sind die Zutaten, die beim Kochen tatsächlich verbrennen.',
      en: 'Fusion Material is the ingredients that actually get burned up in the cooking.',
    },
    relatedTerms: ['ygo-fusion-summon'],
  },
  {
    id: 'ygo-link-material',
    category: 'keywords',
    term: { de: 'Link-Material', en: 'Link Material' },
    definitionNormal: {
      de: 'Link-Material wird für die Link-Beschwörung gemäß der Materialbedingung des Link-Monsters auf den Friedhof geschickt.',
      en: "Link Material is sent to the Graveyard for a Link Summon according to the Link Monster's material condition.",
    },
    definitionTrottel: {
      de: 'Link-Material ist der Preis für die Link-Beschwörung – auch hier geht\'s direkt in den Friedhof.',
      en: 'Link Material is the price of a Link Summon – it also goes straight to the Graveyard.',
    },
    relatedTerms: ['ygo-link-summon'],
  },
  {
    id: 'ygo-link-marker',
    category: 'keywords',
    term: { de: 'Link-Marker', en: 'Link Marker' },
    definitionNormal: {
      de: 'Link-Marker sind die Pfeile an den Ecken/Seiten eines Link-Monsters, die auf benachbarte Zonen zeigen - sie bestimmen, welche davon als "co-verlinkt" gelten.',
      en: "Link Markers are the arrows at the corners/sides of a Link Monster, pointing at adjacent zones - they determine which of those count as 'co-linked'.",
    },
    definitionTrottel: {
      de: 'Link-Marker sind die Pfeile, die zeigen, wohin das Link-Monster "guckt".',
      en: "Link Markers are the arrows showing where the Link Monster is 'looking'.",
    },
    relatedTerms: ['ygo-link-rating', 'ygo-co-linked'],
  },
  {
    id: 'ygo-co-linked',
    category: 'keywords',
    term: { de: 'Co-verlinkt (Co-Linked)', en: 'Co-Linked' },
    definitionNormal: {
      de: 'Zwei Monster sind co-verlinkt, wenn ihre jeweiligen Link-Pfeile gegenseitig aufeinander zeigen - viele Supportkarten verleihen co-verlinkten Monstern Boni.',
      en: "Two monsters are co-linked when their respective Link Arrows point at each other - many support cards grant bonuses to co-linked monsters.",
    },
    definitionTrottel: {
      de: 'Co-verlinkt heißt: zwei Pfeile zeigen sich gegenseitig an – das zählt oft als eigener Bonus.',
      en: "Co-linked means two arrows point at each other – that often counts as its own bonus.",
    },
    relatedTerms: ['ygo-link-marker'],
  },
  {
    id: 'ygo-extra-link',
    category: 'keywords',
    term: { de: 'Extra Link', en: 'Extra Link' },
    definitionNormal: {
      de: 'Ein Extra Link entsteht, wenn beide Extra Monsterzonen und alle fünf Monsterzonen einer Spielerin so mit Link-Monstern besetzt sind, dass der Gegner keine seiner Extra-Deck-Monster mehr in seinen eigenen Monsterzonen platzieren kann.',
      en: "An Extra Link happens when both Extra Monster Zones and all five Monster Zones of a player are so filled with Link Monsters that the opponent can no longer place any of their own Extra Deck monsters in their Monster Zones at all.",
    },
    definitionTrottel: {
      de: 'Extra Link ist die totale Blockade – der Gegner kriegt gar keine Extra-Deck-Monster mehr unter.',
      en: "Extra Link is total lockdown – the opponent can't fit any Extra Deck monsters anywhere anymore.",
    },
    relatedTerms: ['ygo-link-rating', 'ygo-monster-zones'],
  },
  {
    id: 'ygo-pendulum-zone',
    category: 'keywords',
    term: { de: 'Pendel-Zone', en: 'Pendulum Zone' },
    definitionNormal: {
      de: 'Pendel-Monster werden, statt normal beschworen zu werden, oft in eine der beiden Pendel-Zonen (die äußeren Zauber-/Fallenzonen) gelegt, wo ihre Skalenwerte eine spätere Pendelbeschwörung ermöglichen.',
      en: 'Instead of being Summoned normally, Pendulum Monsters are often placed into one of the two Pendulum Zones (the outer Spell & Trap Zones), where their scale values enable a later Pendulum Summon.',
    },
    definitionTrottel: {
      de: 'Die Pendel-Zone ist der Parkplatz für Pendel-Monster, bevor sie den großen Rundumschlag starten.',
      en: 'The Pendulum Zone is the parking spot for Pendulum Monsters before they launch the big sweep.',
    },
    relatedTerms: ['ygo-pendulum-monster', 'ygo-pendulum-summon'],
  },
  {
    id: 'ygo-pendulum-effect',
    category: 'keywords',
    term: { de: 'Pendel-Effekt', en: 'Pendulum Effect' },
    definitionNormal: {
      de: 'Der Pendel-Effekt ist der zweite Effekttext eines Pendel-Monsters, der nur gilt, während es in der Pendel-Zone liegt - unabhängig von seinem Monster-Effekt auf dem Feld.',
      en: "A Pendulum Effect is a Pendulum Monster's second block of text, which only applies while it sits in a Pendulum Zone - separate from its monster effect while on the field.",
    },
    definitionTrottel: {
      de: 'Der Pendel-Effekt gilt nur im Pendel-Parkplatz – auf dem Feld zählt stattdessen der normale Monster-Effekt.',
      en: 'The Pendulum Effect only counts while parked as a pendulum – on the field, the regular monster effect takes over instead.',
    },
    relatedTerms: ['ygo-pendulum-zone'],
  },
  {
    id: 'ygo-token-monster',
    category: 'keywords',
    term: { de: 'Spielsteinmonster (Token)', en: 'Monster Token' },
    definitionNormal: {
      de: 'Ein Token ist ein Monster ohne eigene physische Karte, das durch einen Effekt erzeugt wird (meist 0 ATK/0 DEF, keine Stufe/kein Attribut, sofern nichts anderes angegeben) und beim Verlassen des Feldes einfach verschwindet.',
      en: 'A Token is a monster with no physical card of its own, created by an effect (usually 0 ATK/0 DEF, no Level/Attribute unless stated otherwise), which simply disappears once it leaves the field.',
    },
    definitionTrottel: {
      de: 'Ein Token ist ein Monster "aus dem Nichts" – verlässt es das Feld, poof, weg ist es für immer.',
      en: 'A Token is a monster "out of nowhere" – once it leaves the field, poof, gone for good.',
    },
  },
  {
    id: 'ygo-counters',
    category: 'keywords',
    term: { de: 'Zähler (Counter)', en: 'Counter' },
    definitionNormal: {
      de: 'Zähler (z. B. Zauberzähler, Flammenzähler) werden auf Karten platziert und oft als Kosten für Effekte entfernt - unabhängig vom generellen Begriff "Counter" für Gegenzauber.',
      en: 'Counters (e.g. Spell Counters, Flame Counters) are placed on cards and often removed as the cost of an effect - unrelated to "counter" in the sense of countering a spell.',
    },
    definitionTrottel: {
      de: 'Zähler sind kleine Markierungen auf der Karte – viele Effekte kosten genau das: einen Zähler wegnehmen.',
      en: 'Counters are little markers sitting on a card – plenty of effects cost exactly that: remove one counter.',
    },
  },
  {
    id: 'ygo-trap-monster',
    category: 'keywords',
    term: { de: 'Fallenmonster (Trap Monster, eingestellt)', en: 'Trap Monster (Discontinued)' },
    definitionNormal: {
      de: 'Ein Fallenmonster war eine Fallenkarte, die sich bei Aktivierung in ein Monster verwandelte (mit eigenen ATK/DEF, aber weiterhin als Fallenkarte zählend). Die Unterart wurde seit vielen Jahren nicht mehr unterstützt.',
      en: 'A Trap Monster was a Trap Card that turned into a monster upon activation (with its own ATK/DEF while still counting as a Trap Card). This subtype hasn\'t seen support in many years.',
    },
    definitionTrottel: {
      de: 'Fallenmonster waren Fallen, die sich bei Aktivierung selbst in ein Monster verwandelten - heute eine Rarität aus früheren Zeiten.',
      en: 'Trap Monsters were traps that turned themselves into a monster on activation - a rarity from an earlier era today.',
    },
  },
];
