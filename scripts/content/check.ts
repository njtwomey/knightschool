/**
 * make content-check (pnpm content:check): where what the author wrote disagrees with the engine, from the committed
 * analysis (content/analysis/analysis.jsonl). A report, never a gate:
 * - a move whose author's symbol is more than one grade away from the engine's grade;
 * - a refutation whose reply is not among the engine's three best moves after the wrong move;
 * - an opening's own move (the learner's) that the engine grades Inaccuracy or worse.
 * Positions without analysis are listed so `pnpm analyse` can fill them.
 */
import {
  formatPawns,
  GRADES,
  gradeFromNags,
  judgeMove,
  numberedMove,
  playMove,
  type EvalEntry,
} from '../../packages/core/src/index.ts';
import { readAnalysis } from '../data-files.ts';
import { loadContent } from './load.ts';

const content = loadContent();
const analysis = readAnalysis().byEpd;
const evalOf = (epd: string): EvalEntry | null => {
  const best = analysis[epd]?.lines[0];
  if (!best) return null;
  return {
    score: best.mate !== undefined ? { mate: best.mate } : { cp: best.cp ?? 0 },
    depth: analysis[epd]!.depth,
    source: 'baked',
    pv: best.pv,
  };
};
const config = { ...content.config.judge, ...content.config.coverage };
const problems: string[] = [];
const missing = new Set<string>();
const engineGrade = (epd: string, uci: string) => {
  const judgement = judgeMove(epd, uci, { evalOf, config });
  if (judgement.status === 'needs') {
    judgement.epds.forEach((position) => missing.add(position));
    return null;
  }
  return judgement.verdict;
};

for (const opening of content.openings) {
  const plyOf = new Map<string, number>();
  for (const line of opening.lines) {
    let epd = opening.startEpd;
    for (let ply = opening.startPly; ply < line.moves.length; ply++) {
      plyOf.set(epd, ply);
      const next = opening.positions[epd]?.moves.find((move) => move.uci === line.moves[ply]);
      if (!next) break;
      epd = next.to;
    }
  }
  for (const [epd, position] of Object.entries(opening.positions)) {
    const ply = plyOf.get(epd) ?? 0;
    for (const move of position.moves) {
      const author = gradeFromNags(move.note?.nag);
      const verdict = engineGrade(epd, move.uci);
      if (!verdict) continue;
      const label = `${opening.id}: ${numberedMove(ply, move.san)}`;
      if (author && Math.abs(GRADES.indexOf(author) - GRADES.indexOf(verdict.grade)) > 1) {
        problems.push(`${label}: the author says ${author}, the engine ${verdict.grade}`);
      }
      if (move.mine && ['inaccuracy', 'mistake', 'blunder'].includes(verdict.grade)) {
        const best = analysis[epd]?.lines[0]?.pv[0];
        const san = best ? (playMove(epd, best)?.san ?? best) : '?';
        const cost = verdict.cost ? ` (costs ${formatPawns(verdict.cost.cp, { signed: false })})` : '';
        problems.push(
          `${label}: the opening plays it, but the engine grades it ${verdict.grade}${cost}; it prefers ${san}`,
        );
      }
    }
    for (const refutation of position.refutations ?? []) {
      const label = `${opening.id}: refutation ${numberedMove(ply, refutation.san)}`;
      const verdict = engineGrade(epd, refutation.uci);
      const author = gradeFromNags(refutation.note?.nag);
      if (verdict && author && Math.abs(GRADES.indexOf(author) - GRADES.indexOf(verdict.grade)) > 1) {
        problems.push(`${label}: the author says ${author}, the engine ${verdict.grade}`);
      }
      const after = playMove(epd, refutation.uci);
      const reply = refutation.then[0]?.uci;
      if (!after || !reply) continue;
      const best = analysis[after.epd]?.lines.map((line) => line.pv[0]);
      if (!best) missing.add(after.epd);
      else if (!best.includes(reply)) {
        const san = playMove(after.epd, reply)?.san ?? reply;
        const engine = playMove(after.epd, best[0]!)?.san ?? best[0];
        problems.push(`${label}: the reply ${san} is not among the engine's best (it plays ${engine})`);
      }
    }
  }
}

console.log(problems.length ? problems.join('\n') : 'content-check: the authors and the engine agree');
if (missing.size) console.log(`content-check: ${missing.size} position(s) lack analysis; run pnpm analyse`);
