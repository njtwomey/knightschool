import { Chess } from 'chess.js';
import { epdToFen, START_EPD } from './epd';

/** The standard starting position, as a FEN. */
export const START_FEN = epdToFen(START_EPD);

/** A FEN piece letter: PNBRQK for White, pnbrqk for Black. */
export type PieceLetter = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const FILES = 'abcdefgh';

/** A position being built by hand, before it is a FEN. */
export type Setup = { placement: string; turn: 'w' | 'b'; castling: string };

export const EMPTY_SETUP: Setup = { placement: '8/8/8/8/8/8/8/8', turn: 'w', castling: '' };

export function setupFromFen(fen: string): Setup {
  const [placement = '8/8/8/8/8/8/8/8', turn = 'w', castling = '-'] = fen.trim().split(/\s+/);
  return { placement, turn: turn === 'b' ? 'b' : 'w', castling: castling === '-' ? '' : castling };
}

/** The pieces as rows from rank 8 down to rank 1, each a list of eight letters or null. */
function toGrid(placement: string): (PieceLetter | null)[][] {
  return placement.split('/').map((row) => {
    const cells: (PieceLetter | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null);
      else cells.push(ch as PieceLetter);
    }
    while (cells.length < 8) cells.push(null);
    return cells.slice(0, 8);
  });
}

function fromGrid(grid: (PieceLetter | null)[][]): string {
  return grid
    .map((row) => {
      let out = '';
      let gap = 0;
      for (const cell of row) {
        if (cell === null) gap++;
        else {
          if (gap) out += gap;
          gap = 0;
          out += cell;
        }
      }
      return gap ? out + gap : out;
    })
    .join('/');
}

/** Puts a piece on a square (or empties it with null), leaving the rest as it was. */
export function placePiece(placement: string, square: string, piece: PieceLetter | null): string {
  const file = FILES.indexOf(square[0] ?? '');
  const rank = Number(square[1]);
  if (file < 0 || !(rank >= 1 && rank <= 8)) return placement;
  const grid = toGrid(placement);
  grid[8 - rank]![file] = piece;
  return fromGrid(grid);
}

/** The piece on a square, if any. */
export function pieceAt(placement: string, square: string): PieceLetter | null {
  const file = FILES.indexOf(square[0] ?? '');
  const rank = Number(square[1]);
  if (file < 0 || !(rank >= 1 && rank <= 8)) return null;
  return toGrid(placement)[8 - rank]?.[file] ?? null;
}

/** Castling rights that are still possible: a king and rook on their home squares. Anything else is dropped. */
export function possibleCastling(placement: string, castling: string): string {
  const has = (square: string, piece: PieceLetter) => pieceAt(placement, square) === piece;
  const kept = [
    ['K', has('e1', 'K') && has('h1', 'R')],
    ['Q', has('e1', 'K') && has('a1', 'R')],
    ['k', has('e8', 'k') && has('h8', 'r')],
    ['q', has('e8', 'k') && has('a8', 'r')],
  ] as const;
  return kept
    .filter(([right, ok]) => ok && castling.includes(right))
    .map(([right]) => right)
    .join('');
}

/** The FEN for a hand-built position, with impossible castling rights removed. */
export function fenFromSetup(setup: Setup): string {
  const castling = possibleCastling(setup.placement, setup.castling) || '-';
  return `${setup.placement} ${setup.turn} ${castling} - 0 1`;
}

/** Null if chess.js accepts the position (one king each, no pawns on the back ranks, the side to move can move), else why not. */
export function checkFen(fen: string): string | null {
  try {
    new Chess(fen);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message.replace(/^Invalid FEN: /, '') : 'Not a valid position';
  }
}

/**
 * A PGN for a game from a start position, ready to paste elsewhere: the start position goes in the SetUp and FEN
 * headers unless it is the standard one, then the moves with their numbers (starting at "1..." if Black is to move).
 */
export function pgnFor(startFen: string, sans: string[], headers: Record<string, string> = {}): string {
  const [, turn = 'w', , , , full = '1'] = startFen.trim().split(/\s+/);
  const standard = startFen.trim().split(/\s+/).slice(0, 4).join(' ') === START_EPD;
  const lines = Object.entries(headers).map(([key, value]) => `[${key} "${value}"]`);
  if (!standard) lines.push('[SetUp "1"]', `[FEN "${startFen.trim()}"]`);
  let number = Number(full) || 1;
  const moves: string[] = [];
  sans.forEach((san, i) => {
    const white = (turn === 'w') === (i % 2 === 0);
    if (white) moves.push(`${number}. ${san}`);
    else {
      moves.push(i === 0 ? `${number}... ${san}` : san);
      number++;
    }
  });
  const text = [...moves, '*'].join(' ');
  return lines.length ? `${lines.join('\n')}\n\n${text}` : text;
}

/**
 * Reads a pasted game: a PGN (with a FEN header if it starts from a set-up position) or a bare FEN. Returns where it
 * starts and its moves in SAN; throws a plain-English Error for anything else.
 */
export function loadGame(text: string): { startFen: string; sans: string[] } {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Paste a PGN or a FEN first.');
  // A FEN has at least four space-separated fields and a slash-separated board, and no move numbers.
  if (/^[1-8pnbrqkPNBRQK/]+\s+[wb]\s+\S+\s+\S+(\s+\d+\s+\d+)?$/.test(trimmed)) {
    const fields = trimmed.split(/\s+/);
    const fen = `${fields.slice(0, 4).join(' ')} ${fields[4] ?? 0} ${fields[5] ?? 1}`;
    const problem = checkFen(fen);
    if (problem) throw new Error(`That position is not valid: ${problem}`);
    return { startFen: fen, sans: [] };
  }
  const chess = new Chess();
  try {
    chess.loadPgn(trimmed);
  } catch (error) {
    throw new Error(`That is not a PGN I can read: ${error instanceof Error ? error.message : String(error)}`);
  }
  const header = chess.getHeaders().FEN;
  return { startFen: header && checkFen(header) === null ? header : START_FEN, sans: chess.history() };
}
