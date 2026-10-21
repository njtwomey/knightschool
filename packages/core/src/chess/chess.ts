import { Chess, type Move } from 'chess.js';
import { epdToFen, fenToEpd } from './epd';
import { numberedLine } from './notation';

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

/** A UCI move (e2e4, e7e8q) as chess.js takes it. */
const uciMove = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });

/** Plays a UCI move (e2e4, e7e8q) from a position. Throws if it is not legal there. */
export function playUci(epd: string, uci: string): { move: Move; san: string; epd: string } {
  const chess = positionFromEpd(epd);
  const move = chess.move(uciMove(uci));
  return { move, san: move.san, epd: epdOf(chess) };
}

/** A move as played: the UCI it was given as, its SAN, and the position after it. */
export type Played = { uci: string; san: string; epd: string };

/** Replays UCI moves from a position, stopping at the first that is not legal: the rest cannot follow it. */
export function replayUcis(startEpd: string, ucis: readonly string[]): Played[] {
  const chess = positionFromEpd(startEpd);
  const played: Played[] = [];
  for (const uci of ucis) {
    let move: Move;
    try {
      move = chess.move(uciMove(uci));
    } catch {
      break;
    }
    played.push({ uci, san: move.san, epd: epdOf(chess) });
  }
  return played;
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
  const sans = replayUcis(epd, pv.slice(0, maxPlies)).map((move) => move.san);
  return numberedLine(sans, sideToMove(epd) === 'black' ? 1 : 0);
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
