import { Chess, DEFAULT_POSITION, validateFen } from 'chess.js';
import { numberedLine } from './notation';
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

export const FEN_SHAPE = /^[1-8pnbrqkPNBRQK]+(\/[1-8pnbrqkPNBRQK]+){7}(\s|$)/;

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
