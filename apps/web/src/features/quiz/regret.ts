import { moveRegret, playUci, positionFromEpd, type EngineScore, type Regret, type Side } from '@knightschool/core';
import { create } from 'zustand';
import { bakedEvaluation, loadAnalysis } from '@/data/analysis';
import { evaluateLive } from '@/data/engine/store';

/** Depth of a browser search for a position the baked analysis does not cover: about a second each. */
const REGRET_DEPTH = 14;

/** A wrong move played in the quiz: kept for the session only, never saved. */
export type Miss = {
  /** The position, the move played and the course's move: the same slip twice is one entry. */
  key: string;
  cardId: string;
  openingId: string;
  courseName: string;
  side: Side;
  /** The position before the move. */
  epd: string;
  playedUci: string;
  playedSan: string;
  expectedUci: string;
  expectedSan: string;
};

export const missKey = (epd: string, playedUci: string, expectedUci: string) => `${epd}|${playedUci}|${expectedUci}`;

export type MissCheck =
  | { status: 'pending' }
  /** Not covered by the baked analysis, and the engine is off in Settings. */
  | { status: 'skipped' }
  | { status: 'failed' }
  | { status: 'done'; regret: Regret; course: EngineScore; played: EngineScore; depth: number; baked: boolean };

/** Checks by miss key. They outlive a session, so quizzing the same line again does not search again. */
export const useMissChecks = create<{ checks: Record<string, MissCheck> }>(() => ({ checks: {} }));

const put = (key: string, check: MissCheck) =>
  useMissChecks.setState((state) => ({ checks: { ...state.checks, [key]: check } }));

/** A position with no moves needs no engine: mate is a win for the side that just moved, stalemate is level. */
function finalScore(epd: string): EngineScore | undefined {
  const chess = positionFromEpd(epd);
  if (chess.isCheckmate()) return { mate: chess.turn() === 'w' ? -1 : 1 };
  if (chess.isDraw()) return { cp: 0 };
  return undefined;
}

type Scores = { course: EngineScore; played: EngineScore; depth: number; baked: boolean };

/**
 * Scores of the course's move and the move played, compared at one depth: the baked search of the position before when
 * both moves are among its lines, else the baked searches of the two positions after, else the browser engine on both.
 */
async function scoresFor(miss: Miss, live: boolean, signal: AbortSignal): Promise<Scores | 'skipped' | undefined> {
  const file = await loadAnalysis();
  const before = bakedEvaluation(file, miss.epd, 0);
  const lineOf = (uci: string) => before?.lines.find((line) => line.pv[0] === uci);
  const [courseLine, playedLine] = [lineOf(miss.expectedUci), lineOf(miss.playedUci)];
  if (before && courseLine && playedLine)
    return { course: courseLine, played: playedLine, depth: before.depth, baked: true };

  const after = [playUci(miss.epd, miss.expectedUci).epd, playUci(miss.epd, miss.playedUci).epd] as const;
  const baked = after.map((epd) => {
    const final = finalScore(epd);
    if (final) return { score: final, depth: Infinity };
    const evaluation = bakedEvaluation(file, epd, 0);
    return evaluation?.lines[0] ? { score: evaluation.lines[0], depth: evaluation.depth } : undefined;
  });
  if (baked[0] && baked[1])
    return {
      course: baked[0].score,
      played: baked[1].score,
      depth: Math.min(baked[0].depth, baked[1].depth),
      baked: true,
    };
  if (!live) return 'skipped';

  const scores: EngineScore[] = [];
  for (const epd of after) {
    const final = finalScore(epd);
    if (final) {
      scores.push(final);
      continue;
    }
    const evaluation = await evaluateLive(epd, REGRET_DEPTH, signal);
    if (!evaluation?.lines[0]) return undefined;
    scores.push(evaluation.lines[0]);
  }
  return { course: scores[0]!, played: scores[1]!, depth: REGRET_DEPTH, baked: false };
}

/**
 * Works out what each wrong move cost, one at a time, after the session: baked analysis first, the browser engine for
 * the rest when `live`. Results land in `useMissChecks` as they come. Aborting stops the search under way.
 */
export async function checkMisses(misses: readonly Miss[], live: boolean, signal: AbortSignal): Promise<void> {
  for (const miss of misses) {
    if (signal.aborted) return;
    const known = useMissChecks.getState().checks[miss.key];
    if (known?.status === 'done' || known?.status === 'failed') continue;
    if (known?.status === 'skipped' && !live) continue;
    put(miss.key, { status: 'pending' });
    try {
      const scores = await scoresFor(miss, live, signal);
      if (signal.aborted) {
        put(miss.key, known ?? { status: 'pending' });
        return;
      }
      if (scores === 'skipped') put(miss.key, { status: 'skipped' });
      else if (!scores) put(miss.key, { status: 'failed' });
      else put(miss.key, { status: 'done', ...scores, regret: moveRegret(scores.course, scores.played, miss.side) });
    } catch {
      if (signal.aborted) return;
      put(miss.key, { status: 'failed' });
    }
  }
}
