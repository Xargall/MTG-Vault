import { Injectable, inject } from '@angular/core';

import { Card, YugiohBanlistStatus, YugiohCard } from '../models/card.model';
import { withSignal } from '../utils/abortable-query';
import { cleanOcrText, similarity } from '../utils/string-similarity';
import { CardApiService, CardIdentification } from './card-api.interface';
import { SupabaseService } from './supabase.service';

const IDENTIFY_CONFIDENCE_THRESHOLD = 0.8;
// How many characters a scanned-but-nonexistent print code may be off from
// a real one before findSimilarPrintCodes stops suggesting it - see that
// method's doc. 2 covers both a single-character misread (e.g. "B"->"8")
// and the slightly bigger "H"->"N" + digit-shuffle case that's already been
// seen live, without opening the door to suggesting an unrelated set.
const FUZZY_PRINT_CODE_MAX_DISTANCE = 2;
const FUZZY_PRINT_CODE_LIMIT = 5;
// Deliberately tighter than FUZZY_PRINT_CODE_MAX_DISTANCE - a set prefix is
// usually only 2-4 characters long, so even distance 2 is already a third+
// of the string. findSimilarSetPrefixes' search space (a few hundred
// distinct prefixes) is small enough that this stays safe without needing
// to be looser.
const FUZZY_SET_PREFIX_MAX_DISTANCE = 2;
// Generous on purpose - needs to be high enough to surface every prefix
// tied at the best distance (see findSimilarSetPrefixes' doc on the real
// "LEND" -> LEDD/LEHD tie), not just a top handful.
const FUZZY_SET_PREFIX_LIMIT = 15;

/**
 * YGOPRODeck only ever tracks English print codes - confirmed live
 * 2026-10-23: both the synced `ygoprodeck_print_codes` mirror (0 of 38,521
 * rows have a non-"EN" language segment in the *modern* 2-letter sense) and
 * the live cardsetsinfo.php endpoint 404 on e.g. "LOB-DE001", while
 * "LOB-EN001" resolves instantly on both. The set+number portion of a print
 * code is identical across every language edition though, only the
 * language segment differs - so a German/French/Italian/etc. card is
 * identified via its English-equivalent code. The actually-printed language
 * is tracked separately (see extractYugiohLanguage in scanner.ts), so this
 * substitution never loses that information.
 */
// The 2-letter language segment isn't always immediately followed by
// digits - live-confirmed on a real card (2026-10-26): a multi-deck product
// like Legendary Hero Decks also inserts a sub-deck letter right after the
// language ("LEHD-DEB32" = DE + sub-deck B + number 32), which the old
// `[A-Z]{2}(\d+)` shape rejected outright, so this derivation silently
// never ran for this whole category of set. Any sub-deck letters carry over
// unchanged (confirmed against the live mirror: "LEHD-DEB32" has no local
// row at all, but "LEHD-ENB32" does, under the German print's own card_id).
//
// Sets from 1996-2004 (LOB, MRD, MRL, SDK, SDY, DOR, ... - audited against
// the full local mirror 2026-10-26) used a single-letter region tag instead
// of the 2-letter one, and a *different* letter per language, not just the
// first letter of today's code: G=German, F=French, I=Italian, S=Spanish
// (confirmed via Yugipedia's German/French/Italian region-tag pages - e.g.
// "LOB-G082" is a real German print of a card the mirror only has as
// "LOB-E082"). The switch to 2-letter codes happened with Ancient
// Sanctuary in 2004. Pre-2004 Spanish is a known gap even with this map:
// Yugipedia shows its early Spanish LOB printing used an entirely different
// set prefix ("LDD-S051", not "LOB-S051"), which no language-letter swap can
// recover - mapping S here is still harmless (a miss here is the same
// "not found locally" outcome as before, just never a false match).
const LEGACY_SINGLE_LETTER_TO_ENGLISH: Record<string, string> = { G: 'E', F: 'E', I: 'E', S: 'E' };

function toEnglishPrintCode(code: string): string | null {
  const match = /^([A-Z0-9]+)-([A-Z]{2}|[A-Z])?([A-Z]*)(\d+|TKN)$/.exec(code);
  if (!match) return null;
  const [, set, lang, subDeck, number] = match;
  if (!lang || lang === 'EN') return null;
  if (lang.length === 1) {
    const legacyEnglish = LEGACY_SINGLE_LETTER_TO_ENGLISH[lang];
    return legacyEnglish ? `${set}-${legacyEnglish}${subDeck}${number}` : null;
  }
  return `${set}-EN${subDeck}${number}`;
}

interface YgoCardSet {
  set_code: string;
  set_name: string;
  set_rarity: string;
  set_price: string;
}

interface YgoCardImage {
  image_url: string;
  image_url_small: string;
}

interface YgoCardPrice {
  cardmarket_price: string;
  tcgplayer_price: string;
}

interface YgoRawCard {
  id: number;
  name: string;
  type: string;
  attribute?: string;
  atk?: number;
  def?: number;
  card_images: YgoCardImage[];
  card_prices: YgoCardPrice[];
  card_sets?: YgoCardSet[];
  banlist_info?: { ban_tcg?: YugiohBanlistStatus };
}

/**
 * Row shape of the `ygoprodeck_cards` table (supabase/sql/022_ygoprodeck_cards.sql),
 * synced from YGOPRODeck's full card database by scripts/sync-ygoprodeck-cards.mjs.
 * Queried directly via PostgREST - same reasoning as MtgApiService's
 * ScryfallCardRow: avoids hitting the live YGOPRODeck API on every read.
 * One row per card (YGOPRODeck's own numeric id is already the client's
 * Card.id here - unlike MTG there's no per-printing id/foil concept), unlike
 * ygoprodeck_print_codes below which fans out one row per print code.
 */
interface YgoprodeckCardRow {
  id: number;
  name: string;
  card_type: string;
  attribute: string | null;
  atk: number | null;
  def: number | null;
  image_url: string | null;
  image_url_small: string | null;
  price_eur: number | null;
  price_usd: number | null;
  set_name: string | null;
  rarity: string | null;
  banlist_status: YugiohBanlistStatus | null;
}

/** Row shape of `ygoprodeck_print_codes` - backs identifyByPrintCode's exact scanner lookup. */
interface YgoprodeckPrintCodeRow {
  set_code: string;
  card_id: number;
  set_name: string | null;
  set_rarity: string | null;
}

const CARD_INFO_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const ARCHETYPES_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/archetypes.php';
// Dedicated endpoint for an exact print-code lookup (e.g. "SDAZ-DE001") -
// cardinfo.php itself has no such parameter (confirmed: it 400s on
// "setcode"/"cardsets", its actual param list has neither). Only used as a
// fallback now - see identifyByPrintCode.
const CARD_SETS_INFO_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardsetsinfo.php';
// Batches an .in(column, [...]) PostgREST filter - same reasoning as
// MtgApiService's POSTGRES_BATCH_SIZE (keeps the query string comfortably
// under typical URL-length limits).
const POSTGRES_BATCH_SIZE = 200;
const SEARCH_ROW_LIMIT = 50;

/**
 * Matches a full print code as printed on a physical card - the modern
 * 2-letter-language form ("LOB-DE001"), a multi-deck product's sub-deck-
 * letter form ("LEHD-DEB32"), a pre-2004 single-letter-language form
 * ("LOB-G082"), a pre-2004 promo with no language segment at all
 * ("DL1-001"), or a Structure Deck token card ("SR03-ENTKN") - see
 * toEnglishPrintCode's doc for how each of these gets resolved. Used by
 * searchCards() to recognize that the typed query is a code, not a name,
 * and route it through identifyByPrintCode() instead.
 */
export const YUGIOH_PRINT_CODE_PATTERN = /^[A-Z0-9]+-[A-Z]*(?:\d+|TKN)$/i;

// A bare set code (e.g. "AMDE") typed into the search box, with nothing
// else - mirrors MtgApiService's SET_CODE_QUERY_PATTERN. Real Yu-Gi-Oh! set
// prefixes run 2-8 alphanumeric characters with no dash (a full print code,
// which always has one, already matches YUGIOH_PRINT_CODE_PATTERN above
// first), so this cheaply rules out an actual card name before bothering
// with the extra query - checked against actual set_code rows below rather
// than a fixed-length regex alone, so a short card name typed alone (e.g.
// "Kuriboh") still falls through to behave like a normal search.
const YUGIOH_SET_CODE_QUERY_PATTERN = /^[a-z0-9]{2,8}$/i;
// Generous enough for any real set without a limit - this is "show me the
// whole set", not a ranked search. Same value as MtgApiService's own
// SET_CARDS_LIMIT.
const SET_CARDS_LIMIT = 600;

@Injectable({ providedIn: 'root' })
export class YugiohApiService implements CardApiService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Prefix match first (so e.g. "Dark Mag" ranks "Dark Magician" ahead of
   * anything merely containing the words), then a contains pass to fill in
   * the rest - deduped by id since a card can appear in both passes. Unlike
   * MTG's scryfall_cards there's no per-printing duplication to also collapse
   * (one row per card here), so this is simpler than MtgApiService's
   * equivalent. Falls back to the live API only when the local cache has
   * nothing at all (not yet synced, or a genuinely brand-new card).
   */
  async searchCards(query: string, signal?: AbortSignal): Promise<Card[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // A pasted/typed print code (incl. a German one like "LOB-DE001") goes
    // straight to the exact card via identifyByPrintCode - the same lookup
    // the scanner uses, including its English-equivalent-code fallback - so
    // the code printed on a non-English card actually works here. Falls
    // through to the normal name search below if nothing matches.
    if (YUGIOH_PRINT_CODE_PATTERN.test(trimmed)) {
      const card = await this.identifyByPrintCode(trimmed.toUpperCase());
      if (card) return [card];
    }

    // A bare set code (e.g. "AMDE") browses every print under that set
    // prefix instead of searching by name - falls through to the name
    // search below if it doesn't actually match a real set prefix. See
    // getCardsBySetCodePrefix.
    if (YUGIOH_SET_CODE_QUERY_PATTERN.test(trimmed)) {
      const setCards = await this.getCardsBySetCodePrefix(trimmed.toUpperCase(), signal);
      if (setCards.length > 0) return setCards;
    }

    const escaped = trimmed.replace(/[%_]/g, '\\$&');
    const [prefixResult, containsResult] = await Promise.all([
      withSignal(
        this.supabase.client.from('ygoprodeck_cards').select('*').ilike('name', `${escaped}%`).order('name').limit(SEARCH_ROW_LIMIT),
        signal,
      ),
      withSignal(
        this.supabase.client.from('ygoprodeck_cards').select('*').ilike('name', `%${escaped}%`).order('name').limit(SEARCH_ROW_LIMIT),
        signal,
      ),
    ]);

    const prefixRows = (prefixResult.data ?? []) as YgoprodeckCardRow[];
    const containsRows = (containsResult.data ?? []) as YgoprodeckCardRow[];
    const seen = new Set<number>();
    const rows: YgoprodeckCardRow[] = [];
    for (const row of [...prefixRows, ...containsRows]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }

    if (rows.length > 0) return rows.map((row) => this.rowToCard(row));

    const raw = await this.fetchCardInfo({ fname: trimmed });
    return raw.map((card) => this.toCard(card));
  }

  async getCard(id: string): Promise<Card | null> {
    const idNum = Number(id);
    if (Number.isFinite(idNum)) {
      const { data } = await this.supabase.client
        .from('ygoprodeck_cards')
        .select('*')
        .eq('id', idNum)
        .maybeSingle();
      if (data) return this.rowToCard(data as YgoprodeckCardRow);
    }

    const raw = await this.fetchCardInfo({ id });
    return raw.length > 0 ? this.toCard(raw[0]) : null;
  }

  async getCardsByIds(ids: string[]): Promise<Card[]> {
    if (ids.length === 0) return [];

    const idNums = ids.map(Number).filter((n) => Number.isFinite(n));
    const rows = await this.queryByColumn('id', idNums);
    if (rows.length > 0) return rows.map((row) => this.rowToCard(row));

    const raw = await this.fetchCardInfo({ id: ids.join(',') });
    return raw.map((card) => this.toCard(card));
  }

  /**
   * YGOPRODeck has no per-printing artwork/id like Scryfall - every result
   * here shares the same underlying card (id, image, atk/def, ...) - but it
   * DOES track a real set_name/rarity per printing (ygoprodeck_print_codes,
   * same table identifyByPrintCode resolves against), so there's still a
   * real, meaningful choice to make here: which of the card's actual prints
   * the user physically has. Reported live (2026-10-27): searching by name
   * only ever offered ygoprodeck_cards' single denormalized "representative"
   * print (e.g. Obelisk the Tormentor always showing as "2016 Mega-Tins"),
   * with no way to pick the print actually owned (e.g. "2019 Gold
   * Sarcophagus Tin") - same underlying one-row-per-card-entity limitation
   * the scanner's print-code path already works around via withPrintInfo.
   * Falls back to a single generic entry only if no print rows exist at all
   * (shouldn't normally happen - the representative entry's own set/rarity
   * came from one of these rows in the first place).
   */
  async getPrints(name: string): Promise<Card[]> {
    const { data } = await this.supabase.client
      .from('ygoprodeck_cards')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (data) {
      const row = data as YgoprodeckCardRow;
      const base = this.rowToCard(row);
      const { data: printRows } = await this.supabase.client
        .from('ygoprodeck_print_codes')
        .select('set_code, set_name, set_rarity')
        .eq('card_id', row.id)
        .order('set_name');
      const prints = (printRows ?? []) as { set_code: string; set_name: string | null; set_rarity: string | null }[];
      if (prints.length > 0) {
        return prints.map((print) => this.withPrintInfo(base, print.set_name, print.set_rarity, print.set_code));
      }
      return [base];
    }

    const raw = await this.fetchCardInfo({ name });
    if (raw.length === 0) return [];
    const base = this.toCard(raw[0]);
    const sets = raw[0].card_sets ?? [];
    if (sets.length === 0) return [base];
    return sets.map((set) => this.withPrintInfo(base, set.set_name, set.set_rarity, set.set_code));
  }

  /**
   * Resolves an exact print code read off a physical card (e.g. from the
   * camera scanner's Gemini/Tesseract path - "SDAZ-DE001") straight to its
   * card. Local ygoprodeck_print_codes lookup first, live cardsetsinfo.php
   * fallback only on a local miss (not yet synced, or a genuinely new
   * print) - unlike identifyCard's fuzzy name search, a print code either
   * matches exactly or it doesn't, so there's no confidence score to weigh.
   * Both lookups retry with the English-equivalent code (see
   * toEnglishPrintCode) before giving up, since YGOPRODeck never has the
   * literal non-English code to find in the first place.
   */
  async identifyByPrintCode(code: string): Promise<Card | null> {
    const localHit = await this.lookupPrintCodeLocally(code);
    if (localHit) return localHit;

    const englishCode = toEnglishPrintCode(code);
    if (englishCode) {
      const localEnglishHit = await this.lookupPrintCodeLocally(englishCode);
      if (localEnglishHit) return localEnglishHit;
    }

    const response = await fetch(`${CARD_SETS_INFO_ENDPOINT}?setcode=${encodeURIComponent(englishCode ?? code)}`);
    if (!response.ok) return null;

    const body:
      | { id: number; name: string; set_code?: string; set_name?: string; set_rarity?: string }
      | { error: string } = await response.json();
    if ('error' in body) return null;

    const card = await this.getCard(String(body.id));
    return card
      ? this.withPrintInfo(card, body.set_name ?? null, body.set_rarity ?? null, body.set_code ?? englishCode ?? code)
      : null;
  }

  /**
   * Bare-set-code browse counterpart to identifyByPrintCode - every print
   * whose set_code starts with this prefix (e.g. "AMDE" -> every
   * "AMDE-..." printing), for browsing/adding a whole set at once instead
   * of searching by name. Mirrors MtgApiService's getCardsBySetCode, but
   * unlike MTG (where every printing already has its own card_id/row) a
   * matched row here still needs its underlying card resolved and its own
   * printCode/setName/rarity overlaid via withPrintInfo - the same card_id
   * can legitimately appear more than once if a set has several
   * rarities/sub-decks of the same card. Returns [] for anything that
   * isn't actually a known set prefix (the caller falls back to a plain
   * name search then).
   */
  private async getCardsBySetCodePrefix(prefix: string, signal?: AbortSignal): Promise<Card[]> {
    const escaped = prefix.replace(/[%_]/g, '\\$&');
    const { data, error } = await withSignal(
      this.supabase.client
        .from('ygoprodeck_print_codes')
        .select('set_code, card_id, set_name, set_rarity')
        .ilike('set_code', `${escaped}-%`)
        .order('set_code')
        .limit(SET_CARDS_LIMIT),
      signal,
    );
    if (error) throw error;

    const rows = (data ?? []) as YgoprodeckPrintCodeRow[];
    if (rows.length === 0) return [];

    const cards = await this.getCardsByIds(rows.map((row) => String(row.card_id)));
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    return rows
      .map((row) => {
        const card = cardsById.get(String(row.card_id));
        return card ? this.withPrintInfo(card, row.set_name, row.set_rarity, row.set_code) : null;
      })
      .filter((entry): entry is YugiohCard => entry !== null);
  }

  /**
   * Batch counterpart to withPrintInfo, for a caller (CollectionService)
   * that already has its own Cards and just needs each one's specific
   * printing's set_name/rarity by the print_code it persisted at add-time
   * (040_collection_set_code.sql) - rather than resolving one Card per code
   * via identifyByPrintCode (which would also re-fetch the whole card).
   * Missing/unsynced codes are simply absent from the returned map, left
   * for the caller to fall back to the card's own generic set/rarity.
   */
  async getSetInfoForCodes(codes: string[]): Promise<Map<string, { setName: string | null; rarity: string | null }>> {
    const result = new Map<string, { setName: string | null; rarity: string | null }>();
    if (codes.length === 0) return result;

    const { data, error } = await this.supabase.client
      .from('ygoprodeck_print_codes')
      .select('set_code, set_name, set_rarity')
      .in('set_code', codes);
    if (error) {
      console.warn('ygoprodeck_print_codes set_code batch failed:', error);
      return result;
    }

    for (const row of (data ?? []) as { set_code: string; set_name: string | null; set_rarity: string | null }[]) {
      result.set(row.set_code, { setName: row.set_name, rarity: row.set_rarity });
    }
    return result;
  }

  /**
   * ygoprodeck_cards only ever stores one denormalized "representative"
   * set_name/rarity per *card* (see migration 039's doc - live-confirmed:
   * "TN19-DE007" correctly resolved to Obelisk the Tormentor, but the app
   * showed "2016 Mega-Tins", a different one of its 18 real printings).
   * Overrides those two fields with the specific printing's own values once
   * a print code has actually resolved one - never the other way around,
   * and never touches anything but these two display fields.
   */
  /**
   * `printCode` (new, see 040_collection_set_code.sql) is the actual
   * matched set_code this printing's info came from, when known - kept on
   * the Card itself (not just used to compute setName/rarity here) so a
   * caller than persists the add to the collection (scanner.ts,
   * AddCardDialog) can save *which* printing was picked, not just its
   * display values. Every call site in this file is Yu-Gi-Oh!-only despite
   * the broader `Card` param/return type (shared with the other games'
   * services via CardApiService) - safe to assert as YugiohCard.
   */
  private withPrintInfo(card: Card, setName: string | null, rarity: string | null, printCode: string | null = null): Card {
    return {
      ...card,
      setName: setName ?? card.setName,
      rarity: rarity ?? card.rarity,
      printCode: printCode ?? (card as YugiohCard).printCode ?? null,
    } as YugiohCard;
  }

  private async lookupPrintCodeLocally(code: string): Promise<Card | null> {
    const { data } = await this.supabase.client
      .from('ygoprodeck_print_codes')
      .select('card_id, set_name, set_rarity')
      .eq('set_code', code)
      .maybeSingle();
    if (!data) return null;

    const row = data as YgoprodeckPrintCodeRow;
    const card = await this.getCard(String(row.card_id));
    return card ? this.withPrintInfo(card, row.set_name, row.set_rarity, code) : null;
  }

  /**
   * Last-resort fallback for the scanner, called only once identifyByPrintCode
   * has already failed every exact path (as read, as read's English-equivalent,
   * and the live cardsetsinfo.php lookup) - i.e. the code Gemini read matches
   * no real card at all. Rather than just giving up, searches the full local
   * mirror (via migration 037's match_yugioh_print_code RPC, built on
   * fuzzystrmatch's levenshtein()) for real codes within a couple of
   * characters of what was read - live-confirmed case (2026-10-26): Gemini
   * read "LEND-EN008" off a card actually printed "LEHD-DEB00", one edit away
   * from the real "LEHD-ENB00".
   *
   * Deliberately returns candidates for confirmation rather than resolving
   * one itself - a misread code could just as easily be one edit away from
   * the WRONG card (e.g. a different set's number), so silently auto-adding
   * the closest match risks putting a wrong card in someone's collection.
   * The caller (scanner.ts) shows these through the same candidate-picker UI
   * MTG's own ambiguous-match path uses, never auto-adds on its own.
   *
   * Deduped by card - a card can have several print codes (reprints), and
   * only the closest-matching one per card is worth surfacing.
   */
  async findSimilarPrintCodes(code: string): Promise<{ card: Card; matchedCode: string; distance: number }[]> {
    const { data, error } = await this.supabase.client.rpc('match_yugioh_print_code', {
      p_code: code,
      p_max_distance: FUZZY_PRINT_CODE_MAX_DISTANCE,
      p_limit: FUZZY_PRINT_CODE_LIMIT,
    });
    if (error) console.warn('match_yugioh_print_code failed:', error);
    return this.resolvePrintCodeRows(data);
  }

  /**
   * Narrower sibling of findSimilarPrintCodes/identifyByPrintCode, for once
   * the *set* is already known - either because the user just confirmed a
   * findSimilarSetPrefix guess, or because that guess came back an exact
   * match (distance 0) and there's nothing to confirm. Unlike the flat
   * whole-code search, this has no distance cap: the search space is
   * already narrowed to one set's own codes (a handful of rows), so even a
   * fairly different number/language is safe to surface - it can't
   * accidentally suggest an unrelated set's card the way widening the flat
   * search's budget would (see migration 038's doc for the live-confirmed
   * case this exists for).
   */
  async findSimilarPrintCodesInSet(
    setPrefix: string,
    code: string,
  ): Promise<{ card: Card; matchedCode: string; distance: number }[]> {
    const { data, error } = await this.supabase.client.rpc('match_yugioh_print_code_in_set', {
      p_set_prefix: setPrefix,
      p_code: code,
      p_limit: FUZZY_PRINT_CODE_LIMIT,
    });
    if (error) console.warn('match_yugioh_print_code_in_set failed:', error);
    return this.resolvePrintCodeRows(data);
  }

  /**
   * Shared row->Card resolution for findSimilarPrintCodes/findSimilarPrintCodesInSet -
   * deduped by card (a card can have several print codes/reprints; only the
   * closest-matching one per card is worth surfacing), ranked by distance.
   * Overrides each card's generic set_name/rarity with the matched
   * printing's own (see withPrintInfo's doc) - without this, the picker's
   * whole point (telling candidates apart by what's shown on screen) breaks
   * for any card with more than one real printing, which is most of them.
   */
  private async resolvePrintCodeRows(
    data: unknown,
  ): Promise<{ card: Card; matchedCode: string; distance: number }[]> {
    if (!data) return [];

    const rows = data as { set_code: string; card_id: number; set_name: string | null; set_rarity: string | null; distance: number }[];
    const bestByCard = new Map<number, (typeof rows)[number]>();
    for (const row of rows) {
      const existing = bestByCard.get(row.card_id);
      if (!existing || row.distance < existing.distance) bestByCard.set(row.card_id, row);
    }
    const ranked = [...bestByCard.values()].sort((a, b) => a.distance - b.distance);

    const cards = await this.getCardsByIds(ranked.map((row) => String(row.card_id)));
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    return ranked
      .map((row) => {
        const card = cardsById.get(String(row.card_id));
        return card
          ? { card: this.withPrintInfo(card, row.set_name, row.set_rarity, row.set_code), matchedCode: row.set_code, distance: row.distance }
          : null;
      })
      .filter((entry): entry is { card: Card; matchedCode: string; distance: number } => entry !== null);
  }

  /**
   * First stage of the two-step fallback (see migration 038's doc): is the
   * SET portion of a scanned-but-nonexistent code (everything before the
   * first "-") close to one of the few hundred *real* set prefixes? Only
   * ever called after findSimilarPrintCodes has already found nothing - a
   * much smaller, safer search space than fuzzy-matching the whole code at
   * once, so the scanner can confirm the set first ("meintest du Set X?")
   * before even looking at the number.
   *
   * Returns every prefix tied at the *best* distance found, not just one -
   * live-confirmed (2026-10-26): "LEND" is equally one edit away from both
   * "LEDD" (Legendary Dragon Decks) and "LEHD" (Legendary Hero Decks), two
   * unrelated real product lines with near-identical codes. Picking either
   * one to ask "meintest du X?" about would be a coin flip dressed up as a
   * confident guess - the caller is expected to fall through to showing
   * actual cards (which the user can recognize by picture) instead of a
   * single-set yes/no question whenever more than one row comes back.
   * Empty when nothing is close enough to suggest at all, same
   * conservative principle as findSimilarPrintCodes.
   */
  async findSimilarSetPrefixes(code: string): Promise<{ prefix: string; setName: string | null; distance: number }[]> {
    const prefix = code.split('-')[0] ?? code;
    const { data, error } = await this.supabase.client.rpc('match_yugioh_set_prefix', {
      p_prefix: prefix,
      p_max_distance: FUZZY_SET_PREFIX_MAX_DISTANCE,
      p_limit: FUZZY_SET_PREFIX_LIMIT,
    });
    if (error) {
      console.warn('match_yugioh_set_prefix failed:', error);
      return [];
    }
    const rows = (data ?? []) as { prefix: string; set_name: string | null; distance: number }[];
    if (rows.length === 0) return [];

    const bestDistance = Math.min(...rows.map((row) => row.distance));
    return rows
      .filter((row) => row.distance === bestDistance)
      .map((row) => ({ prefix: row.prefix, setName: row.set_name, distance: row.distance }));
  }

  async identifyCard(rawText: string): Promise<CardIdentification | null> {
    const cleaned = cleanOcrText(rawText);
    if (!cleaned) return null;

    const localRows = await this.queryByColumn(
      'name',
      [],
      // A plain ilike scan (bounded, since ygoprodeck_cards is only ~13k
      // rows total - nowhere near scryfall_cards' size) rather than an
      // .in() batch - identifyCard's whole point is fuzzy OCR text that
      // won't equal any name exactly.
      `%${cleaned.replace(/[%_]/g, '\\$&')}%`,
    );

    let best: { row: YgoprodeckCardRow; confidence: number } | null = null;
    for (const row of localRows) {
      const confidence = similarity(cleaned, row.name);
      if (!best || confidence > best.confidence) best = { row, confidence };
    }
    if (best && best.confidence >= IDENTIFY_CONFIDENCE_THRESHOLD) {
      return { card: this.rowToCard(best.row), confidence: best.confidence };
    }

    const raw = await this.fetchCardInfo({ fname: cleaned });
    let bestRaw: { card: YgoRawCard; confidence: number } | null = null;
    for (const card of raw) {
      const confidence = similarity(cleaned, card.name);
      if (!bestRaw || confidence > bestRaw.confidence) bestRaw = { card, confidence };
    }

    if (!bestRaw || bestRaw.confidence < IDENTIFY_CONFIDENCE_THRESHOLD) return null;
    return { card: this.toCard(bestRaw.card), confidence: bestRaw.confidence };
  }

  async getCardsByNames(names: string[]): Promise<Card[]> {
    if (names.length === 0) return [];

    const rows = await this.queryByColumn('name', names);
    if (rows.length > 0) return rows.map((row) => this.rowToCard(row));

    const raw = await this.fetchCardInfo({ name: names.join('|') });
    return raw.map((card) => this.toCard(card));
  }

  private archetypesCache: Promise<string[]> | null = null;

  /** All known archetype/theme names - used to power theme-based browsing (Yu-Gi-Oh has no community-decklist API to draw on). Stays on the live API - a separate, low-traffic endpoint already cached client-side, not part of the card-data cache above. */
  getArchetypes(): Promise<string[]> {
    if (!this.archetypesCache) {
      this.archetypesCache = this.fetchArchetypes();
    }
    return this.archetypesCache;
  }

  private async fetchArchetypes(): Promise<string[]> {
    const response = await fetch(ARCHETYPES_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Archetyp-Liste konnte nicht geladen werden (${response.status})`);
    }
    const body: Array<{ archetype_name: string }> = await response.json();
    return body.map((entry) => entry.archetype_name).sort((a, b) => a.localeCompare(b));
  }

  async getCardsByArchetype(archetype: string): Promise<Card[]> {
    const raw = await this.fetchCardInfo({ archetype });
    return raw.map((card) => this.toCard(card));
  }

  /** Shared batching for an `.in(column, [...])` PostgREST query, or a single `.ilike(column, likePattern)` scan when likePattern is given - a failed batch is logged and skipped rather than failing the whole call. */
  private async queryByColumn(
    column: 'id' | 'name',
    values: (string | number)[],
    likePattern?: string,
  ): Promise<YgoprodeckCardRow[]> {
    if (likePattern) {
      const { data, error } = await this.supabase.client.from('ygoprodeck_cards').select('*').ilike(column, likePattern);
      if (error) {
        console.warn(`ygoprodeck_cards ${column} ilike failed:`, error);
        return [];
      }
      return (data ?? []) as YgoprodeckCardRow[];
    }

    const rows: YgoprodeckCardRow[] = [];
    for (let i = 0; i < values.length; i += POSTGRES_BATCH_SIZE) {
      const batch = values.slice(i, i + POSTGRES_BATCH_SIZE);
      const { data, error } = await this.supabase.client.from('ygoprodeck_cards').select('*').in(column, batch);
      if (error) {
        console.warn(`ygoprodeck_cards ${column} batch failed, skipping ${batch.length} row(s):`, error);
        continue;
      }
      rows.push(...((data ?? []) as YgoprodeckCardRow[]));
    }
    return rows;
  }

  private async fetchCardInfo(params: Record<string, string>): Promise<YgoRawCard[]> {
    const url = `${CARD_INFO_ENDPOINT}?${new URLSearchParams(params).toString()}`;
    const response = await fetch(url);

    if (response.status === 400) {
      // YGOPRODeck returns 400 (not an empty list) when nothing matches.
      return [];
    }
    if (!response.ok) {
      throw new Error(`YGOPRODeck-Anfrage fehlgeschlagen (${response.status})`);
    }

    const body: { data: YgoRawCard[] } = await response.json();
    return body.data;
  }

  private toCard(raw: YgoRawCard): YugiohCard {
    const price = raw.card_prices?.[0];
    const parsePrice = (value: string | undefined) => {
      const parsed = value ? parseFloat(value) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    return {
      game: 'yugioh',
      id: String(raw.id),
      oracleId: null,
      name: raw.name,
      oracleName: raw.name,
      localizedName: null,
      imageUrl: raw.card_images?.[0]?.image_url ?? null,
      imageUrlSmall: raw.card_images?.[0]?.image_url_small ?? null,
      setName: raw.card_sets?.[0]?.set_name ?? null,
      rarity: raw.card_sets?.[0]?.set_rarity ?? null,
      prices: {
        eur: parsePrice(price?.cardmarket_price),
        eurFoil: null,
        usd: parsePrice(price?.tcgplayer_price),
        usdFoil: null,
      },
      attribute: raw.attribute ?? null,
      cardType: raw.type,
      atk: raw.atk ?? null,
      def: raw.def ?? null,
      banlistStatus: raw.banlist_info?.ban_tcg ?? null,
      printCode: null,
    };
  }

  /** Same shape as toCard(), sourced from a ygoprodeck_cards row instead of a raw YGOPRODeck API response. */
  private rowToCard(row: YgoprodeckCardRow): YugiohCard {
    return {
      game: 'yugioh',
      id: String(row.id),
      oracleId: null,
      name: row.name,
      oracleName: row.name,
      localizedName: null,
      imageUrl: row.image_url,
      imageUrlSmall: row.image_url_small,
      setName: row.set_name,
      rarity: row.rarity,
      prices: {
        eur: row.price_eur,
        eurFoil: null,
        usd: row.price_usd,
        usdFoil: null,
      },
      attribute: row.attribute,
      cardType: row.card_type,
      atk: row.atk,
      def: row.def,
      banlistStatus: row.banlist_status,
      printCode: null,
    };
  }
}
