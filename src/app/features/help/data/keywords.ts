import { HelpTerm } from './types';

// Card-text keyword abilities/actions. Currently the 7 most common ones -
// see project-help-manacurve-* memory / CLAUDE.md for the plan to expand
// this to full historical coverage.
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
];
