import type { Side } from '../chess/epd';
import type { EvalWordBands } from '../config/site-config';

/**
 * An engine score from White's point of view: centipawns, or moves to mate (negative when Black mates), or a game already
 * over on the board (`over`: who won, or a draw), which the engine cannot score.
 */
export type Score = { cp?: number; mate?: number; over?: Side | 'draw' };

/** cp is capped here before anything else, so a forced mate or a won rook never swamps a cost or an average. */
export const CP_CAP = 1000;

const LICHESS_K = 0.00368208;

/** Centipawns for White, capped; a mate counts as the cap for the side that mates. */
export function capped(score: Score): number {
  if (score.over) return score.over === 'draw' ? 0 : score.over === 'white' ? CP_CAP : -CP_CAP;
  if (score.mate !== undefined) return score.mate === 0 ? 0 : score.mate > 0 ? CP_CAP : -CP_CAP;
  return Math.max(-CP_CAP, Math.min(CP_CAP, score.cp ?? 0));
}

/** Lichess's winning chances, from -1 (Black wins) to 1 (White wins). A mate is ±1. */
export function winningChances(score: Score): number {
  if (score.over) return score.over === 'draw' ? 0 : score.over === 'white' ? 1 : -1;
  if (score.mate !== undefined && score.mate !== 0) return score.mate > 0 ? 1 : -1;
  return 2 / (1 + Math.exp(-LICHESS_K * capped(score))) - 1;
}

/** The same, for one side: positive when that side is doing well. */
export const chancesFor = (score: Score, side: Side): number =>
  side === 'white' ? winningChances(score) : -winningChances(score);

/** The eval bar's white share, 0 to 1: the winning chance as a share, so the bar and the grades agree. */
export const whiteShare = (score: Score): number => (winningChances(score) + 1) / 2;

export type Cost = {
  /** What the move cost the mover in centipawns, 0 to CP_CAP. */
  cp: number;
  /** The drop in the mover's winning chances, 0 to 2. */
  drop: number;
  /** A forced mate changed hands: the move allows one, or misses the one the better move had. */
  mate: 'allowed' | 'missed' | null;
};

const matesFor = (score: Score, side: Side) =>
  score.mate !== undefined && score.mate !== 0 && score.mate > 0 === (side === 'white');

/**
 * The cost of playing one move where a better one was available. Both scores are of the positions after each move,
 * from White's point of view; `side` is the side that moved.
 */
export function moveCost(better: Score, played: Score, side: Side): Cost {
  const sign = side === 'white' ? 1 : -1;
  const cp = Math.max(0, sign * (capped(better) - capped(played)));
  const drop = Math.max(0, chancesFor(better, side) - chancesFor(played, side));
  const other: Side = side === 'white' ? 'black' : 'white';
  const mate =
    matesFor(played, other) && !matesFor(better, other)
      ? 'allowed'
      : matesFor(better, side) && !matesFor(played, side)
        ? 'missed'
        : null;
  return { cp, drop, mate };
}

export type EvalWords = {
  /** "Equal", "White is a little better", "Black is winning", "White mates in 3". */
  words: string;
  /** Who is better, or null when equal. */
  side: Side | null;
  /** "+0.6", "-2.3", "M3", "-M2". */
  number: string;
  level: 'equal' | 'little' | 'clear' | 'winning' | 'mate' | 'over';
};

const name = (side: Side) => (side === 'white' ? 'White' : 'Black');

/** Centipawns as pawns, signed, one decimal: "+0.6", "-2.3", "0.0". The one way a score or cost is written. */
export function formatPawns(cp: number, { signed = true }: { signed?: boolean } = {}): string {
  const value = (Math.abs(cp) / 100).toFixed(1);
  if (!signed || cp === 0) return value;
  return `${cp > 0 ? '+' : '-'}${value}`;
}

/** Words for a score, with bands on the winning chance from config `judge.evalWords`. */
export function evalWords(score: Score, bands: EvalWordBands): EvalWords {
  if (score.over === 'draw') return { words: 'Draw', side: null, number: '½-½', level: 'over' };
  if (score.over) {
    return { words: `Checkmate: ${name(score.over)} wins`, side: score.over, number: '#', level: 'over' };
  }
  if (score.mate !== undefined && score.mate !== 0) {
    const side: Side = score.mate > 0 ? 'white' : 'black';
    const n = Math.abs(score.mate);
    return { words: `${name(side)} mates in ${n}`, side, number: `${score.mate < 0 ? '-' : ''}M${n}`, level: 'mate' };
  }
  const cp = score.cp ?? 0;
  const number = formatPawns(cp);
  const chances = Math.abs(winningChances(score));
  const side: Side = cp >= 0 ? 'white' : 'black';
  if (chances < bands.equal) return { words: 'Equal', side: null, number, level: 'equal' };
  if (chances < bands.littleBetter) return { words: `${name(side)} is a little better`, side, number, level: 'little' };
  if (chances < bands.clearlyBetter) return { words: `${name(side)} is clearly better`, side, number, level: 'clear' };
  return { words: `${name(side)} is winning`, side, number, level: 'winning' };
}
