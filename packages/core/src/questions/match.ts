/**
 * The forgiving matcher for typed answers (docs/v2/library/exercise.md, the typed grader): case, accents and
 * punctuation ignored, a curated list of near-synonyms read as one word, a plural s dropped, small typing slips
 * forgiven on longer words, and moves read alike whether written as SAN or in words ("Nxe5", "knight takes on e5").
 * Deliberately not fuzzy search: every keyword must be there, so it stays predictable and easy to explain.
 */

/** Each canonical word and the words read as it. */
const SYNONYMS: Record<string, readonly string[]> = {
  take: ['take', 'takes', 'taking', 'took', 'taken', 'capture', 'captures', 'capturing', 'captured', 'x'],
  check: ['check', 'checks', 'checking', 'checked'],
  mate: ['mate', 'mates', 'mated', 'mating', 'checkmate', 'checkmates', 'checkmated', 'checkmating'],
  castle: ['castle', 'castles', 'castling', 'castled'],
  centre: ['centre', 'center', 'central', 'middle'],
  attack: ['attack', 'attacks', 'attacking', 'attacked', 'hit', 'hits', 'hitting', 'threat', 'threaten', 'threatens'],
  defend: [
    'defend',
    'defends',
    'defending',
    'defended',
    'protect',
    'protects',
    'protecting',
    'protected',
    'guard',
    'guards',
    'guarding',
    'guarded',
    'support',
    'supports',
    'supporting',
    'supported',
  ],
  pin: ['pin', 'pins', 'pinned', 'pinning'],
  fork: ['fork', 'forks', 'forked', 'forking'],
  develop: ['develop', 'develops', 'developing', 'developed', 'development'],
  prepare: ['prepare', 'prepares', 'preparing', 'prepared', 'ready'],
  lose: ['lose', 'loses', 'losing', 'lost', 'hang', 'hangs', 'hanging', 'hung', 'drop', 'drops', 'dropped'],
  trade: ['trade', 'trades', 'traded', 'trading', 'exchange', 'exchanges', 'exchanged', 'swap', 'swaps'],
  retreat: ['retreat', 'retreats', 'retreated', 'retreating', 'back'],
  knight: ['knight', 'knights', 'horse', 'horses'],
  queen: ['queen', 'queens'],
  king: ['king', 'kings'],
  rook: ['rook', 'rooks'],
  bishop: ['bishop', 'bishops'],
  pawn: ['pawn', 'pawns'],
};
const CANONICAL = new Map(
  Object.entries(SYNONYMS).flatMap(([canonical, words]) => words.map((word) => [word, canonical] as const)),
);
/** Words that carry nothing: "the knight takes on e5" reads as "knight take e5". */
const FILLER = new Set(['the', 'a', 'an', 'to', 'on', 'onto', 'its', 'it', 'is', 'of']);
const PIECES: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };

const SAN = /^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=?([QRBN]))?([+#])?$/;
/** Lower-case SAN for every piece but the bishop (a lower-case b is a pawn on the b-file). */
const LOWER_SAN = /^([kqrn])([a-h])?([1-8])?(x)?([a-h][1-8])([+#])?$/;

/** The words of one SAN move, or null when the token is not one: "Nxe5" is knight, take, e5; "exd5" take, d5. */
function sanWords(token: string): string[] | null {
  const castle = /^([O0o])-?\1(-?\1)?([+#])?$/.exec(token);
  if (castle) return ['castle', ...(castle[2] ? ['queenside'] : []), ...suffix(castle[3])];
  const san = SAN.exec(token);
  if (san) {
    const [, piece, file, , capture, square, promotion, mark] = san;
    // A bare file and square with no capture ("e2e4"-like fragments) is not a move.
    if (!piece && file && !capture) return null;
    return [
      ...(piece ? [PIECES[piece]!] : []),
      ...(capture ? ['take'] : []),
      square!,
      ...(promotion ? ['promote', PIECES[promotion]!] : []),
      ...suffix(mark),
    ];
  }
  const lower = LOWER_SAN.exec(token);
  if (lower) {
    const [, piece, , , capture, square, mark] = lower;
    return [PIECES[piece!.toUpperCase()]!, ...(capture ? ['take'] : []), square!, ...suffix(mark)];
  }
  return null;
}
const suffix = (mark: string | undefined) => (mark === '+' ? ['check'] : mark === '#' ? ['mate'] : []);

/** One plural s off long words, so "pieces" reads as "piece". Squares such as h8 are untouched. */
const singular = (word: string) =>
  word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/['‘’`]/g, '');

/**
 * The words of a text as the matcher reads them: moves spelled out, synonyms mapped to one word, filler dropped, a
 * plural s taken off. Move numbers ("6.", "6...") go.
 */
export function answerWords(text: string): string[] {
  const out: string[] = [];
  for (const raw of fold(text).split(/\s+/)) {
    const token = raw
      .replace(/^[([{"]+/, '')
      .replace(/^\d+\.+/, '')
      .replace(/[)\]}",;:.!?]+$/, '');
    if (!token) continue;
    const move = sanWords(token);
    if (move) {
      out.push(...move);
      continue;
    }
    for (const word of token.toLowerCase().split(/[^a-z0-9]+/)) {
      if (!word || FILLER.has(word)) continue;
      out.push(CANONICAL.get(word) ?? CANONICAL.get(singular(word)) ?? nearSynonym(word) ?? singular(word));
    }
  }
  return out;
}

/** Edit distance counting a swap of two neighbouring letters as one edit; gives up (returns max + 1) past `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j]! + 1, row[j - 1]! + 1, previous[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, before[j - 2]! + 1);
      row.push(value);
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    before = previous;
    previous = row;
  }
  return previous[b.length]!;
}

/** Slips forgiven in a word: none under five letters (so squares and short words must be exact), one from five, two from eight. */
const slips = (word: string) => (word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0);

/** One typed word read as a wanted word: the same, or within the slips the wanted word allows. */
export const wordMatches = (typed: string, wanted: string) =>
  typed === wanted || (slips(wanted) > 0 && editDistance(typed, wanted, slips(wanted)) <= slips(wanted));

/** A slip of a longer synonym ("checkmaet") reads as its canonical word; short ones ("takes", "makes") never. */
function nearSynonym(word: string): string | undefined {
  if (word.length < 4) return undefined;
  for (const [surface, canonical] of CANONICAL) if (surface.length >= 6 && wordMatches(word, surface)) return canonical;
  return undefined;
}

/** Whether the wanted words appear in a row among the typed words. */
export function containsPhrase(typed: readonly string[], wanted: readonly string[]): boolean {
  if (wanted.length === 0) return false;
  for (let start = 0; start + wanted.length <= typed.length; start++) {
    if (wanted.every((word, k) => wordMatches(typed[start + k]!, word))) return true;
  }
  return false;
}

/** A keyword is found: one of its `|` alternatives appears, word for word, in the answer. */
const keywordFound = (typed: readonly string[], keyword: string) =>
  keyword.split('|').some((alternative) => containsPhrase(typed, answerWords(alternative)));

/**
 * Whether a typed answer is accepted: every keyword of at least one group appears in it. A keyword may be a phrase
 * ("takes on f7"), a move ("Nxe5"), or alternatives joined with `|` ("queen|lady").
 */
export function matchAnswer(text: string, answers: readonly (readonly string[])[]): boolean {
  const typed = answerWords(text);
  return answers.some((group) => group.length > 0 && group.every((keyword) => keywordFound(typed, keyword)));
}
