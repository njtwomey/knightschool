import { Chess } from 'chess.js';
import { fenToEpd } from './epd';
import { checkFen, FEN_SHAPE, firstPlyOf, START_FEN, type LoadResult } from './load';
import { numberedMove } from './notation';
import { readPgnGames } from './pgn-games';
import type { Played } from './play';

/**
 * Reads what was pasted: a FEN (or EPD), or a PGN (its `[FEN]` header if it has one, then its main line), with the one
 * PGN reader (readPgnGames). A move that cannot be played stops the reading, says where, and keeps the moves before it.
 */
export function loadGame(text: string): LoadResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, problem: 'Paste a FEN or a PGN.' };
  if (FEN_SHAPE.test(trimmed)) {
    const checked = checkFen(trimmed);
    return checked.ok ? { ok: true, game: { fen: checked.fen, moves: [] } } : checked;
  }
  // Headers and nothing else: there are no moves to read.
  if (!trimmed.replace(/^\s*\[[^\]]*\]\s*$/gm, '').trim())
    return { ok: false, problem: 'No moves found: paste a FEN or a PGN.' };
  let game;
  try {
    game = readPgnGames(trimmed)[0];
  } catch {
    return { ok: false, problem: 'Not a FEN or a PGN this board can read.' };
  }
  if (!game) return { ok: false, problem: 'No moves found: paste a FEN or a PGN.' };
  let fen = START_FEN;
  const given = game.tags.FEN;
  if (given) {
    const checked = checkFen(given);
    if (!checked.ok) return checked;
    fen = checked.fen;
  }
  const chess = new Chess(fen);
  const firstPly = firstPlyOf(fen);
  const moves: Played[] = [];
  for (const san of game.sans) {
    try {
      const move = chess.move(san);
      moves.push({
        uci: move.from + move.to + (move.promotion ?? ''),
        san: move.san,
        from: move.from,
        to: move.to,
        epd: fenToEpd(chess.fen()),
      });
    } catch {
      const problem = `${numberedMove(firstPly + moves.length, san)} is not legal here`;
      if (moves.length === 0 && !given)
        return { ok: false, problem: `Not a FEN or a PGN this board can read: ${problem}.` };
      return { ok: true, game: { fen, moves, problem: `${problem}; the moves before it are loaded.` } };
    }
  }
  if (moves.length === 0 && !given) return { ok: false, problem: 'No moves found: paste a FEN or a PGN.' };
  return { ok: true, game: { fen, moves } };
}
