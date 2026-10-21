import { Chess, type Move } from 'chess.js';
import { epdToFen, fenToEpd } from './epd';

export type Square = Move['to'];

export function positionFromEpd(epd: string): Chess {
  return new Chess(epdToFen(epd));
}

export function epdOf(chess: Chess): string {
  return fenToEpd(chess.fen());
}

export function uciOf(move: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

/** Plays a SAN move from a position. Throws if it is not legal there. */
export function playSan(epd: string, san: string): { move: Move; uci: string; epd: string } {
  const chess = positionFromEpd(epd);
  const move = chess.move(san);
  return { move, uci: uciOf(move), epd: epdOf(chess) };
}

/** Plays a UCI move (e2e4, e7e8q) from a position. Throws if it is not legal there. */
export function playUci(epd: string, uci: string): { move: Move; san: string; epd: string } {
  const chess = positionFromEpd(epd);
  const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  return { move, san: move.san, epd: epdOf(chess) };
}

export function legalMovesFrom(epd: string, square: Square): Move[] {
  return positionFromEpd(epd).moves({ square, verbose: true });
}

export function sideToMove(epd: string): 'white' | 'black' {
  return epd.split(' ')[1] === 'w' ? 'white' : 'black';
}

/** Replays "1. e4 e5 2. Nf3" from the start and returns the resulting EPD. Throws on an illegal move. */
export function epdAfterPgn(pgn: string): string {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return epdOf(chess);
}

/**
 * Turns an engine line (UCI moves) into SAN with move numbers, from a position: "1. e4 e5 2. Nf3". Stops at the first
 * move that is not legal and at `maxPlies`.
 */
export function pvToSan(epd: string, pv: string[], maxPlies = 8): string {
  const chess = positionFromEpd(epd);
  const out: string[] = [];
  const startsWithBlack = sideToMove(epd) === 'black';
  for (const [index, uci] of pv.slice(0, maxPlies).entries()) {
    let move;
    try {
      move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    } catch {
      break;
    }
    const number = chess.moveNumber() - (move.color === 'w' ? 0 : 1);
    if (move.color === 'w') out.push(`${number}. ${move.san}`);
    else out.push(index === 0 && startsWithBlack ? `${number}... ${move.san}` : move.san);
  }
  return out.join(' ');
}

const isLegal = (epd: string, uci: string) => {
  try {
    playUci(epd, uci);
    return true;
  } catch {
    return false;
  }
};

/** A pawn dropped on the last rank arrives without a piece letter; the board offers a queen. Null if illegal. */
export function withPromotion(epd: string, uci: string): string | null {
  if (isLegal(epd, uci)) return uci;
  return isLegal(epd, `${uci}q`) ? `${uci}q` : null;
}
