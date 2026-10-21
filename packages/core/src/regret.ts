import type { Side } from './schema';

/** An engine score from White's point of view: centipawns, or moves to mate (negative when Black mates). */
export type EngineScore = { cp?: number; mate?: number };

/** A mate, or anything bigger, counts as this many centipawns, so one forced mate does not swamp a session's average. */
export const REGRET_CAP = 1000;

/** Below this many centipawns a different move is as good as the course's; from here to MISTAKE_CP it is an inaccuracy. */
export const SLIP_CP = 30;
export const MISTAKE_CP = 100;

export type RegretVerdict = 'better' | 'slip' | 'inaccuracy' | 'mistake';

export type Regret = {
  /** What the move played cost the mover against the course's move, 0 to REGRET_CAP. */
  cp: number;
  /** How much better the move played was than the course's, in centipawns, when it was (else 0). */
  gainCp: number;
  /** A forced mate changed hands: the move played allows one, or misses the one the course's move had. */
  mate: 'allowed' | 'missed' | null;
  verdict: RegretVerdict;
};

/**
 * A score from the mover's point of view, capped at ±REGRET_CAP; a mate is worth the cap. A mate of 0 says nothing about
 * who won, so a position that is already mate should be given as a mate in 1 for the winner.
 */
export function moverValue(score: EngineScore, side: Side): number {
  const sign = side === 'white' ? 1 : -1;
  if (score.mate !== undefined && score.mate !== 0) return sign * (score.mate > 0 ? REGRET_CAP : -REGRET_CAP);
  return sign * Math.max(-REGRET_CAP, Math.min(REGRET_CAP, score.cp ?? 0));
}

const matesFor = (score: EngineScore, side: Side): boolean =>
  score.mate !== undefined && score.mate !== 0 && score.mate > 0 === (side === 'white');

/**
 * The centipawn loss of playing one move where the course plays another. Both scores are of the positions after each
 * move, from White's point of view (as the engine package gives them); `side` is the side that moved.
 */
export function moveRegret(course: EngineScore, played: EngineScore, side: Side): Regret {
  const diff = moverValue(course, side) - moverValue(played, side);
  const other: Side = side === 'white' ? 'black' : 'white';
  const mate =
    matesFor(played, other) && !matesFor(course, other)
      ? 'allowed'
      : matesFor(course, side) && !matesFor(played, side)
        ? 'missed'
        : null;
  const cp = Math.max(0, diff);
  return { cp, gainCp: Math.max(0, -diff), mate, verdict: regretVerdict(cp, Math.max(0, -diff)) };
}

/** The verdict for a loss in centipawns: under SLIP_CP a slip of memory, under MISTAKE_CP an inaccuracy, else a mistake. */
export function regretVerdict(cp: number, gainCp = 0): RegretVerdict {
  if (cp >= MISTAKE_CP) return 'mistake';
  if (cp >= SLIP_CP) return 'inaccuracy';
  return gainCp >= SLIP_CP ? 'better' : 'slip';
}

/** One short sentence for a verdict, for the end-of-quiz list. */
export const REGRET_WORDS: Record<RegretVerdict, string> = {
  better: 'The engine likes yours more: the course just chose another way.',
  slip: 'About as good: a memory slip, not a mistake.',
  inaccuracy: 'A small inaccuracy.',
  mistake: 'A real mistake.',
};

export type RegretSummary = {
  /** Wrong moves in the session. */
  misses: number;
  /** Of those, the ones with an engine verdict so far. */
  checked: number;
  /** As good as the course's move, or better. */
  slips: number;
  inaccuracies: number;
  mistakes: number;
  totalCp: number;
  /** Mean loss over the checked moves, rounded; null before any is checked. */
  averageCp: number | null;
};

/** Totals for the list of wrong moves; `undefined` is a move still being checked (or one that could not be). */
export function regretSummary(regrets: readonly (Regret | undefined)[]): RegretSummary {
  const checked = regrets.filter((regret): regret is Regret => regret !== undefined);
  const count = (...verdicts: RegretVerdict[]) => checked.filter((regret) => verdicts.includes(regret.verdict)).length;
  const totalCp = checked.reduce((sum, regret) => sum + regret.cp, 0);
  return {
    misses: regrets.length,
    checked: checked.length,
    slips: count('better', 'slip'),
    inaccuracies: count('inaccuracy'),
    mistakes: count('mistake'),
    totalCp,
    averageCp: checked.length ? Math.round(totalCp / checked.length) : null,
  };
}
