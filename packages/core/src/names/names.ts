import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import { movetextSans } from '../questions/questions';
import { wordMatches } from '../questions/match';

/** A Lichess opening name (lichess-org/chess-openings): "Italian Game: Classical Variation, Giuoco Pianissimo". */
export type LichessName = { eco: string; name: string };

/** One row of the Lichess names file, with its moves. */
export type NamedLine = LichessName & { sans: string[] };

/** The rows of the Lichess names file (eco, name, pgn, tab-separated, with a header row). */
export function parseOpeningNames(tsv: string): NamedLine[] {
  return tsv
    .trim()
    .split('\n')
    .slice(1)
    .flatMap((row) => {
      const [eco, name, pgn] = row.split('\t');
      return eco && name && pgn ? [{ eco, name, sans: movetextSans(pgn) }] : [];
    });
}

/** Each named position (EPD) and its name; where two rows reach one position, the first in the file. */
export function namedPositions(rows: readonly NamedLine[]): Map<string, LichessName> {
  const named = new Map<string, LichessName>();
  for (const row of rows) {
    const played = replay(START_EPD, row.sans);
    if (played.length !== row.sans.length || played.length === 0) continue;
    const epd = played.at(-1)!.epd;
    if (!named.has(epd)) named.set(epd, { eco: row.eco, name: row.name });
  }
  return named;
}

/** What Name it needs of an opening: the names each position goes by, and each variation's own Lichess name. */
export type OpeningNames = {
  /** Every position of the opening from its start: the deepest named position on the way, and its variation's name. */
  positions: Record<string, LichessName[]>;
  variations: Record<string, LichessName | null>;
};

/** "Italian Game: Classical Variation, Giuoco Pianissimo" is the Italian Game, then its variation's segments. */
export function splitName(name: string): { opening: string; segments: string[] } {
  const [opening, rest] = name.split(/:\s*/, 2) as [string, string | undefined];
  return { opening: opening.trim(), segments: rest ? rest.split(/,\s*/).map((part) => part.trim()) : [] };
}

/**
 * The Lichess names of an opening's positions. Each position takes the name of the deepest named position on the way
 * to it, along every line that reaches it (so a transposition may give two). A variation's own name is the Lichess
 * name whose variation is called as ours ("Giuoco Piano"), else the deepest name its lines share; positions on its
 * lines from that name on are known by it too.
 */
export function openingNames(opening: BuiltOpening, named: ReadonlyMap<string, LichessName>): OpeningNames {
  const byName = new Map<string, { epd: string; name: LichessName }>();
  for (const [epd, name] of named)
    if (!byName.has(name.name.toLowerCase())) byName.set(name.name.toLowerCase(), { epd, name });
  const lines = new Map(opening.lines.map((line) => [line.id, line]));
  const pathOf = (moves: readonly string[]) => [START_EPD, ...replay(START_EPD, moves).map((move) => move.epd)];
  const family = deepestOn(
    pathOf(lines.get(opening.variations[0]?.lines[0] ?? '')?.moves.slice(0, opening.startPly) ?? []),
    named,
  );
  const familyName = family ? splitName(family.name.name).opening : opening.name;

  const variations: OpeningNames['variations'] = {};
  const variationEpd = new Map<string, string>();
  for (const variation of opening.variations) {
    const own = variation.name ? byName.get(`${familyName}: ${variation.name}`.toLowerCase()) : undefined;
    const paths = variation.lines.flatMap((id) => (lines.get(id) ? [pathOf(lines.get(id)!.moves)] : []));
    const shared = paths.length ? paths.reduce((common, path) => common.filter((epd, i) => path[i] === epd)) : [];
    const found = own ?? deepestOn(shared, named);
    variations[variation.id] = found?.name ?? null;
    if (found) variationEpd.set(variation.id, found.epd);
  }

  const positions: OpeningNames['positions'] = {};
  const add = (epd: string, name: LichessName | undefined) => {
    if (!name) return;
    const list = (positions[epd] ??= []);
    if (!list.some((known) => known.name === name.name)) list.push(name);
  };
  for (const variation of opening.variations) {
    for (const id of variation.lines) {
      const line = lines.get(id);
      if (!line) continue;
      let deepest: LichessName | undefined;
      let passed = false;
      pathOf(line.moves).forEach((epd, ply) => {
        deepest = named.get(epd) ?? deepest;
        if (epd === variationEpd.get(variation.id)) passed = true;
        if (ply < opening.startPly) return;
        add(epd, deepest);
        if (passed) add(epd, variations[variation.id] ?? undefined);
      });
    }
  }
  return { positions, variations };
}

function deepestOn(path: readonly string[], named: ReadonlyMap<string, LichessName>) {
  for (let i = path.length - 1; i >= 0; i--) {
    const name = named.get(path[i]!);
    if (name) return { epd: path[i]!, name };
  }
  return undefined;
}

/** Words a name can do without: "Italian Game" is found by "italian", "Petrov's Defense" by "petrov". */
const FILLER = new Set(['game', 'opening', 'variation', 'defense', 'defence', 'the', 'of', 'line', 'system', 'and']);
/** A last segment that names nothing on its own ("Main Line", "with a6", "Normal"): the one before it is the name. */
const GENERIC = /^(main line|normal|with .*)$/i;

const nameWords = (text: string): string[] =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/['‘’`]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !FILLER.has(word))
    .map((word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word));

const covers = (typed: readonly string[], wanted: readonly string[]) =>
  wanted.length > 0 && wanted.every((word) => typed.some((one) => wordMatches(one, word)));

export type GuessCredit = 'full' | 'half' | 'none';

/**
 * How well a typed name names a position known by `names`: full credit for the variation (its deepest segment, or the
 * whole of it: "Giuoco Pianissimo" for "Italian Game: Classical Variation, Giuoco Pianissimo"), half for the opening
 * alone ("Italian") or a shallower part of the variation ("Classical"). A name with no variation is full credit for the opening. Forgiving as the answer matcher is:
 * case, accents, punctuation and filler words ignored, small slips allowed on longer words.
 */
export function gradeGuess(text: string, names: readonly LichessName[]): { credit: GuessCredit; name?: LichessName } {
  const typed = nameWords(text);
  let half: LichessName | undefined;
  for (const name of names) {
    const { opening, segments } = splitName(name.name);
    const meaningful = segments.filter((segment) => !GENERIC.test(segment));
    const deepest = meaningful.at(-1);
    if (segments.length === 0 && covers(typed, nameWords(opening))) return { credit: 'full', name };
    if (deepest && covers(typed, nameWords(deepest))) return { credit: 'full', name };
    if (segments.length && covers(typed, nameWords(segments.join(' ')))) return { credit: 'full', name };
    // The opening alone, or a shallower part of the variation ("Classical Variation"), is half.
    if (!half && [opening, ...meaningful].some((part) => covers(typed, nameWords(part)))) half = name;
  }
  return half ? { credit: 'half', name: half } : { credit: 'none' };
}
