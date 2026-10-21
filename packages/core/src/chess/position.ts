import { Chess } from 'chess.js';
import { fenToEpd, epdToFen } from './epd';
import { uciOf } from './chess';

/** Where to take a position from: a FEN, an EPD, or a PGN played up to a ply. */
export type PositionSource =
  | { fen: string }
  | { epd: string }
  | {
      pgn: string;
      /** Plies to play; 'last' (the default) plays everything. 0 is the start position. */ ply?: number | 'last';
    };

export type ResolvedPosition = {
  epd: string;
  fen: string;
  /** Plies played from the start of the PGN (0 for a FEN or EPD). */
  ply: number;
  /** Plies in the whole PGN, so a slider knows its range. 0 for a FEN or EPD. */
  totalPlies: number;
  /** The move just played, for highlighting. */
  lastMove?: { san: string; uci: string };
  turn: 'white' | 'black';
};

/** Turns a FEN, EPD or PGN-at-a-ply into something a board can draw. Throws an Error with a plain message if it cannot. */
export function resolvePosition(source: PositionSource): ResolvedPosition {
  if ('fen' in source || 'epd' in source) {
    const text = 'fen' in source ? source.fen : source.epd;
    let chess: Chess;
    try {
      chess = new Chess(epdToFen(fenToEpd(text), 0, 1));
    } catch {
      throw new Error(`Not a valid position: "${text.trim()}"`);
    }
    const epd = fenToEpd(chess.fen());
    return { epd, fen: chess.fen(), ply: 0, totalPlies: 0, turn: chess.turn() === 'w' ? 'white' : 'black' };
  }

  const loaded = new Chess();
  try {
    loaded.loadPgn(source.pgn);
  } catch (error) {
    throw new Error(`Cannot read that PGN: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  }
  const history = loaded.history({ verbose: true });
  const wanted = source.ply === undefined || source.ply === 'last' ? history.length : source.ply;
  if (!Number.isInteger(wanted) || wanted < 0 || wanted > history.length) {
    throw new Error(`Ply ${String(source.ply)} is outside this PGN (0 to ${history.length}).`);
  }
  // The PGN may start from a FEN header; replay from wherever it started.
  const start = loaded.getHeaders().FEN ?? undefined;
  const chess = start ? new Chess(start) : new Chess();
  let last: (typeof history)[number] | undefined;
  for (const move of history.slice(0, wanted)) {
    last = move;
    chess.move(move.san);
  }
  return {
    epd: fenToEpd(chess.fen()),
    fen: chess.fen(),
    ply: wanted,
    totalPlies: history.length,
    ...(last ? { lastMove: { san: last.san, uci: uciOf(last) } } : {}),
    turn: chess.turn() === 'w' ? 'white' : 'black',
  };
}
