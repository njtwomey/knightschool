import { sideToMove, type Side } from '../chess/epd';
import { playMove } from '../chess/play';
import type { SiteConfig } from '../config/site-config';
import type { Note } from '../content/note';
import { capped, moveCost, winningChances, type Cost, type Score } from '../eval/score';
import { GRADE_INFO, gradeOf, isError, type Grade } from './grade';

/** An evaluation of a position: its score (White's view), how deep, from where, and the engine's best line. */
export type EvalEntry = { score: Score; depth: number; source: 'baked' | 'live'; pv?: string[] };

export type JudgeFacts = {
  /** The opening's moves for the mover here (its answer, and any alternatives). */
  expected?: { uci: string; alternative?: boolean }[];
  /** Moves the opening answers here, when the mover is the opponent: these are Book for them. */
  book?: string[];
  /** The author's note on this move, if the tree has the move. */
  note?: Note;
  /** The author's refutations written at this position. */
  refutations?: { uci: string; note?: Note; then: { uci: string }[] }[];
  evalOf: (epd: string) => EvalEntry | null;
  /** What players at the band play here. */
  counts?: { games: number; moves: { uci: string; games: number }[] };
  /** The verdict on the previous move, for Miss. */
  previous?: Pick<Verdict, 'grade' | 'side'>;
  config: Pick<SiteConfig['judge'], 'grades' | 'refutationPlies'> &
    Pick<SiteConfig['coverage'], 'punishShare' | 'punishLossCp'>;
};

export type Verdict = {
  uci: string;
  san: string;
  side: Side;
  grade: Grade;
  symbol: string | null;
  /** Against the best move, and against the line's move, when evaluations allow. */
  cost?: Cost;
  costVsLine?: Cost;
  /** The punishing reply and what follows, from the position after the move (Inaccuracy and worse). */
  refutation?: string[];
  note?: Note;
  /** Sound, but not the opening's move: no try used, the learner is asked for the line's move. */
  offRepertoire?: boolean;
  alternative?: boolean;
  source: 'author' | 'baked' | 'live';
  depth?: number;
  /** How often players at the band play it here (0 to 1), and whether it is a common mistake to punish. */
  share?: number;
  common?: boolean;
};

export type Judgement = { status: 'known'; verdict: Verdict } | { status: 'needs'; epds: string[] };

/** The author's grade from a PGN symbol: !! Best, ! Excellent, !? Good, ?! Inaccuracy, ? Mistake, ?? Blunder. */
const NAG_GRADE: Record<number, Grade> = {
  3: 'best',
  1: 'excellent',
  5: 'good',
  6: 'inaccuracy',
  2: 'mistake',
  4: 'blunder',
};
const authorGrade = (note: Note | undefined): Grade | null => {
  for (const nag of note?.nag ?? []) if (NAG_GRADE[nag]) return NAG_GRADE[nag]!;
  return null;
};

/**
 * How good a move is here and why (docs/v2/library/judge.md). Layers, first that knows wins: the author (the opening's
 * move is Book; a PGN symbol or a refutation gives the author's grade), then evaluations (baked or live). When an
 * evaluation that would settle it is missing, the answer is the positions to evaluate; call again once they are.
 */
export function judgeMove(epd: string, uci: string, facts: JudgeFacts): Judgement {
  const played = playMove(epd, uci);
  if (!played) throw new Error(`${uci} is not legal in ${epd}`);
  const side = sideToMove(epd);
  const expected = facts.expected?.find((move) => move.uci === uci);
  const refutation = facts.refutations?.find((candidate) => candidate.uci === uci);
  const note = facts.note ?? refutation?.note;
  const isBook = Boolean(expected) || Boolean(facts.book?.includes(uci));
  const byAuthor = isBook ? 'book' : authorGrade(note);

  const before = facts.evalOf(epd);
  const after = facts.evalOf(played.epd);
  const lineMove = facts.expected?.find((move) => !move.alternative) ?? facts.expected?.[0];
  const lineAfter = lineMove && lineMove.uci !== uci ? playMove(epd, lineMove.uci) : null;
  const lineEval = lineAfter ? facts.evalOf(lineAfter.epd) : null;

  const needs = [
    ...(before ? [] : [epd]),
    ...(after ? [] : [played.epd]),
    ...(lineAfter && !lineEval ? [lineAfter.epd] : []),
  ];
  if (!byAuthor && needs.length) return { status: 'needs', epds: needs };

  // The best the mover could do is at least the position's own score, or this move's if the engine missed it.
  const bestScore =
    before && after ? (better(before.score, after.score, side) ? before.score : after.score) : undefined;
  const cost = bestScore && after ? moveCost(bestScore, after.score, side) : undefined;
  const costVsLine = lineEval && after ? moveCost(lineEval.score, after.score, side) : undefined;

  let grade: Grade = byAuthor ?? gradeOf(cost!, facts.config.grades);
  if (
    !byAuthor &&
    cost &&
    facts.previous &&
    facts.previous.side !== side &&
    (facts.previous.grade === 'mistake' || facts.previous.grade === 'blunder') &&
    cost.drop >= facts.config.grades.good &&
    (grade === 'inaccuracy' || grade === 'mistake')
  ) {
    grade = 'miss';
  }

  const sound = grade === 'best' || grade === 'excellent' || grade === 'good';
  const offRepertoire = Boolean(facts.expected?.length && !expected && sound);
  const punish =
    isError(grade) || grade === 'miss'
      ? refutation
        ? refutation.then.map((move) => move.uci)
        : after?.pv?.slice(0, facts.config.refutationPlies)
      : undefined;

  const counted = facts.counts?.moves.find((move) => move.uci === uci);
  const share = facts.counts && facts.counts.games > 0 && counted ? counted.games / facts.counts.games : undefined;
  const common =
    share !== undefined &&
    (grade === 'mistake' || grade === 'blunder') &&
    share >= facts.config.punishShare &&
    (cost?.cp ?? 0) >= facts.config.punishLossCp;

  const source = byAuthor ? 'author' : (after?.source ?? before?.source ?? 'baked');
  const verdict: Verdict = {
    uci,
    san: played.san,
    side,
    grade,
    symbol: GRADE_INFO[grade].symbol,
    ...(cost ? { cost } : {}),
    ...(costVsLine ? { costVsLine } : {}),
    ...(punish?.length ? { refutation: punish } : {}),
    ...(note ? { note } : {}),
    ...(offRepertoire ? { offRepertoire } : {}),
    ...(expected?.alternative ? { alternative: true } : {}),
    source,
    ...(after || before ? { depth: Math.min(after?.depth ?? Infinity, before?.depth ?? Infinity) } : {}),
    ...(share !== undefined ? { share } : {}),
    ...(common ? { common } : {}),
  };
  return { status: 'known', verdict };
}

const better = (a: Score, b: Score, side: Side) => (side === 'white' ? capped(a) >= capped(b) : capped(a) <= capped(b));

/**
 * After a move leaves the book, whether the side kept its winning chance some moves later: kept within a drop of
 * `margin`, gained more than it, or gave away more than it.
 */
export function judgeDeviation(at: Score, later: Score, side: Side, margin: number): 'kept' | 'gave away' | 'gained' {
  const sign = side === 'white' ? 1 : -1;
  const change = sign * (winningChances(later) - winningChances(at));
  if (change <= -margin) return 'gave away';
  if (change >= margin) return 'gained';
  return 'kept';
}
