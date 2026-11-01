import { playMove, type Grade } from '@knightschool/core';
import type { Try } from '@/components/chess/tries-table';
import { explorerMoves, judgeAgainstLine, mainLine } from './example';

/**
 * A believable session on the main line: at each of White's moves, the most played move at the band that is not the
 * line's, judged against the line's move from the stored evaluations; right answers in between.
 */
export function sampleTries(): Try[] {
  const tries: Try[] = [];
  mainLine.moves.forEach((move, ply) => {
    if (ply % 2 === 1 || ply < 4) return;
    const wrong = explorerMoves(move.before).find((candidate) => candidate.uci !== move.uci);
    if (wrong && ply % 4 === 0) {
      const after = playMove(move.before, wrong.uci);
      const judged = after ? judgeAgainstLine(move, { uci: wrong.uci, after: after.epd }) : null;
      tries.push({
        ply,
        asked: move.san,
        played: wrong.san,
        grade: judged?.grade ?? 'good',
        costCp: judged ? Math.round(judged.cost.cp) : null,
        drop: judged?.cost.drop ?? null,
        ms: 4200 + ply * 310,
        hint: ply === 8,
      });
    }
    tries.push({
      ply,
      asked: move.san,
      played: move.san,
      grade: 'book' as Grade,
      costCp: 0,
      drop: 0,
      ms: 1800 + ply * 120,
    });
  });
  return tries;
}
