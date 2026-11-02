import { sideToMove } from '../chess/epd';
import type { BuiltOpening } from '../content/build-opening';
import type { OpeningFacts } from '../content/facts';
import type { Note } from '../content/note';
import type { Grade } from '../judge/grade';
import { judgeMove, type EvalEntry, type JudgeFacts } from '../judge/judge';

/** An opponent's mistake to punish: what a follow-up teaches (follow-ups.ts, docs/v2/pages/follow-up.md). */
export type OpponentMistake = {
  /** The position the opponent moves from, and the mistake. */
  epd: string;
  uci: string;
  san: string;
  grade: Grade;
  /** How often players at the band play it here, 0 to 1, when the explorer knows. */
  share?: number;
  costCp?: number;
  /** The punishing reply (the learner's move to find) and what follows it. */
  punish: string;
  then: string[];
  /** The author's notes on the punishing reply and each move after it, in step with `[punish, ...then]`. */
  lineNotes?: (Note | undefined)[];
  /** The author's note on the mistake, when it is a written refutation. */
  note?: Note;
  authored: boolean;
};

/** An evaluation from the shipped facts, as the judge reads it. */
export function factsEval(facts: OpeningFacts | undefined, epd: string): EvalEntry | null {
  const entry = facts?.evals[epd];
  const best = entry?.lines[0];
  if (!entry || !best) return null;
  return {
    score: best.mate !== undefined ? { mate: best.mate } : { cp: best.cp ?? 0 },
    depth: entry.depth,
    source: 'baked',
    pv: best.pv,
  };
}

/**
 * The opponent's mistakes to punish at the given positions (where the opponent moves in a step's stretch):
 * the author's refutations written there, and the band's replies the judge grades a mistake or blunder that are played
 * at least `coverage.minShare` of the time (common enough that the opening must answer them, and so analysed and
 * shipped). The opening's own moves are never mistakes here. Most common first; authored ones with no share last.
 */
export function opponentMistakes(
  opening: BuiltOpening,
  positions: readonly string[],
  facts: OpeningFacts | undefined,
  config: JudgeFacts['config'] & { minShare: number },
): OpponentMistake[] {
  const found = new Map<string, OpponentMistake>();
  const evalOf = (epd: string) => factsEval(facts, epd);
  for (const epd of new Set(positions)) {
    if (sideToMove(epd) === opening.side) continue;
    const node = opening.positions[epd];
    const book = node?.moves.map((move) => move.uci) ?? [];
    const counts = facts?.counts[epd];
    const shareOf = (uci: string) => {
      const counted = counts?.moves.find((move) => move.uci === uci);
      return counts && counts.games > 0 && counted ? counted.games / counts.games : undefined;
    };
    for (const refutation of node?.refutations ?? []) {
      const punish = refutation.then[0]?.uci;
      if (!punish || book.includes(refutation.uci)) continue;
      const judged = judgeMove(epd, refutation.uci, {
        refutations: [{ uci: refutation.uci, note: refutation.note, then: refutation.then }],
        evalOf,
        counts,
        config,
      });
      const verdict = judged.status === 'known' ? judged.verdict : undefined;
      const share = shareOf(refutation.uci);
      found.set(`${epd} ${refutation.uci}`, {
        epd,
        uci: refutation.uci,
        san: refutation.san,
        grade: verdict?.grade ?? 'mistake',
        ...(share !== undefined ? { share } : {}),
        ...(verdict?.cost ? { costCp: Math.round(verdict.cost.cp) } : {}),
        punish,
        then: refutation.then.slice(1).map((move) => move.uci),
        ...(refutation.then.some((move) => move.note) ? { lineNotes: refutation.then.map((move) => move.note) } : {}),
        ...(refutation.note ? { note: refutation.note } : {}),
        authored: true,
      });
    }
    for (const move of counts?.moves ?? []) {
      const key = `${epd} ${move.uci}`;
      if (book.includes(move.uci) || found.has(key)) continue;
      const judged = judgeMove(epd, move.uci, { book, evalOf, counts, config });
      if (judged.status !== 'known') continue;
      const { grade, share } = judged.verdict;
      if ((grade !== 'mistake' && grade !== 'blunder') || share === undefined || share < config.minShare) continue;
      const [punish, ...then] = judged.verdict.refutation ?? [];
      if (!punish) continue;
      found.set(key, {
        epd,
        uci: move.uci,
        san: judged.verdict.san,
        grade: judged.verdict.grade,
        ...(judged.verdict.share !== undefined ? { share: judged.verdict.share } : {}),
        ...(judged.verdict.cost ? { costCp: Math.round(judged.verdict.cost.cp) } : {}),
        punish,
        then,
        authored: false,
      });
    }
  }
  return [...found.values()].sort((a, b) => (b.share ?? -1) - (a.share ?? -1));
}
