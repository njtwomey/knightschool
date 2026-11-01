import { checkFen, fenToEpd, replay, START_FEN, type Side } from '@knightschool/core';

/** What the Board page keeps in its address: the start, the moves played (UCI), the move shown, the side below. */
export type BoardView = { fen: string; moves: string[]; ply: number; side: Side };

export const EMPTY_VIEW: BoardView = { fen: START_FEN, moves: [], ply: 0, side: 'white' };

const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

/**
 * `#fen=<start>&m=e2e4,e7e5&ply=1&side=black`, each part only when it differs from the default (the usual start, no
 * moves, the last move shown, White at the bottom). A broken part falls back to its default, and the moves stop
 * at the first that cannot be played.
 */
export function readBoardHash(hash: string): BoardView {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const given = params.get('fen');
  const checked = given ? checkFen(given) : null;
  const fen = checked?.ok ? checked.fen : START_FEN;
  const written = (params.get('m') ?? '').split(',').filter((move) => UCI.test(move));
  // Moves that cannot be played are cut there, keeping the ones before.
  const moves = replay(fenToEpd(fen), written).map((move) => move.uci);
  const ply = Number(params.get('ply'));
  return {
    fen,
    moves,
    ply: params.has('ply') && Number.isInteger(ply) ? Math.max(0, Math.min(moves.length, ply)) : moves.length,
    side: params.get('side') === 'black' ? 'black' : 'white',
  };
}

export function writeBoardHash(view: BoardView): string {
  const params = new URLSearchParams();
  if (view.fen !== START_FEN) params.set('fen', view.fen);
  if (view.moves.length) params.set('m', view.moves.join(','));
  if (view.ply !== view.moves.length) params.set('ply', String(view.ply));
  if (view.side === 'black') params.set('side', 'black');
  const text = params.toString().replace(/%2C/g, ',').replace(/%2F/g, '/');
  return text ? `#${text}` : '';
}
