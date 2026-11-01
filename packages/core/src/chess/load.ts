import { Chess, DEFAULT_POSITION, validateFen } from 'chess.js';
import { fenToEpd } from './epd';
import { numberedLine, numberedMove } from './notation';
import type { Played } from './play';

export const START_FEN = DEFAULT_POSITION;

/** What a pasted FEN or PGN gives: where it starts, the moves that could be played, and why it stopped if it did. */
export type LoadedGame = {
  fen: string;
  moves: Played[];
  /** "12...Nf3 is not legal here": the moves before it are kept. */
  problem?: string;
};

export type LoadResult = { ok: true; game: LoadedGame } | { ok: false; problem: string };

const FEN_SHAPE = /^[1-8pnbrqkPNBRQK]+(\/[1-8pnbrqkPNBRQK]+){7}(\s|$)/;
const RESULTS = new Set(['1-0', '0-1', '1/2-1/2', '½-½', '*']);

/** A FEN (or an EPD, given counters), checked; the reason when it is not a position chess.js can play from. */
export function checkFen(text: string): { ok: true; fen: string } | { ok: false; problem: string } {
  const fields = text.trim().split(/\s+/);
  const fen = fields.length === 4 ? `${fields.join(' ')} 0 1` : fields.join(' ');
  const checked = validateFen(fen);
  return checked.ok ? { ok: true, fen } : { ok: false, problem: `That FEN is not valid: ${checked.error}` };
}

/** The ply of the first move from a FEN: its move number and side to move. */
export function firstPlyOf(fen: string): number {
  const [, turn, , , , fullmove] = fen.trim().split(/\s+/);
  const number = Math.max(1, Number(fullmove) || 1);
  return (number - 1) * 2 + (turn === 'b' ? 1 : 0);
}

/** The moves of a PGN's main line as written: headers, comments, variations, NAGs, numbers and results taken out. */
function pgnTokens(body: string): string[] {
  let text = body.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  let out = '';
  let depth = 0;
  for (const char of text) {
    if (char === '(') depth++;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0) out += char;
  }
  text = out;
  return text
    .split(/\s+/)
    .map((token) =>
      token
        .replace(/^\d+\.(\.\.)?/, '')
        .replace(/[?!]+$/, '')
        .replace(/^0-0(-0)?(?=[+#]?$)/, (castle) => castle.replace(/0/g, 'O')),
    )
    .filter((token) => token && !RESULTS.has(token) && !/^\$\d+$/.test(token) && !/^\d+\.+$/.test(token));
}

/**
 * Reads what was pasted: a FEN (or EPD), or a PGN (its `[FEN]` header if it has one, then its main line). A move that
 * cannot be played stops the reading, says where, and keeps the moves before it.
 */
export function loadGame(text: string): LoadResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, problem: 'Paste a FEN or a PGN.' };
  if (FEN_SHAPE.test(trimmed)) {
    const checked = checkFen(trimmed);
    return checked.ok ? { ok: true, game: { fen: checked.fen, moves: [] } } : checked;
  }

  const headers = new Map<string, string>();
  const body = trimmed.replace(/\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]/g, (_, key: string, value: string) => {
    headers.set(key, value);
    return ' ';
  });
  let fen = START_FEN;
  const given = headers.get('FEN');
  if (given) {
    const checked = checkFen(given);
    if (!checked.ok) return checked;
    fen = checked.fen;
  }
  const chess = new Chess(fen);
  const firstPly = firstPlyOf(fen);
  const moves: Played[] = [];
  for (const token of pgnTokens(body)) {
    try {
      const move = chess.move(token);
      moves.push({
        uci: move.from + move.to + (move.promotion ?? ''),
        san: move.san,
        from: move.from,
        to: move.to,
        epd: fenToEpd(chess.fen()),
      });
    } catch {
      const problem = `${numberedMove(firstPly + moves.length, token)} is not legal here`;
      if (moves.length === 0 && !given)
        return { ok: false, problem: `Not a FEN or a PGN this board can read: ${problem}.` };
      return { ok: true, game: { fen, moves, problem: `${problem}; the moves before it are loaded.` } };
    }
  }
  if (moves.length === 0 && !given) return { ok: false, problem: 'No moves found: paste a FEN or a PGN.' };
  return { ok: true, game: { fen, moves } };
}

/** The full FEN after playing UCI moves from a FEN, with real move counters (for copying); stops at an illegal move. */
export function fenAfter(fen: string, ucis: readonly string[]): string {
  const chess = new Chess(fen);
  for (const uci of ucis) {
    try {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      break;
    }
  }
  return chess.fen();
}

/** A PGN of moves from a FEN: the set-up headers when it is not the usual start, then the numbered moves. */
export function pgnFor(fen: string, sans: readonly string[]): string {
  const start = fen.trim() === START_FEN ? '' : `[SetUp "1"]\n[FEN "${fen.trim()}"]\n\n`;
  const moves = numberedLine(sans, firstPlyOf(fen));
  return `${start}${moves ? `${moves} ` : ''}*`;
}
