import { Chess } from 'chess.js';
import { epdToFen, fenToEpd } from './epd';

/** A move played from a position: its UCI, its SAN, and the position after it. */
export type Played = { uci: string; san: string; from: string; to: string; epd: string };

const toPlayed = (chess: Chess, move: { from: string; to: string; promotion?: string; san: string }): Played => ({
  uci: move.from + move.to + (move.promotion ?? ''),
  san: move.san,
  from: move.from,
  to: move.to,
  epd: fenToEpd(chess.fen()),
});

/** Plays moves (SAN or UCI) from a position, stopping at the first one that is not legal. */
export function replay(startEpd: string, moves: readonly string[]): Played[] {
  const chess = new Chess(epdToFen(startEpd));
  const played: Played[] = [];
  for (const move of moves) {
    try {
      const uci = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move);
      const result = uci
        ? chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] })
        : chess.move(move);
      played.push(toPlayed(chess, result));
    } catch {
      break;
    }
  }
  return played;
}

/** One move from a position, or null when it is not legal there. */
export const playMove = (epd: string, move: string): Played | null => replay(epd, [move])[0] ?? null;
