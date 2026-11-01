/** The learner's moves in a scope: `known` includes `mastered`; `learning` are in the reviews but not yet known. */
export type ProgressCounts = { total: number; known: number; mastered: number; learning?: number };

export const knownShare = ({ total, known }: ProgressCounts) => (total ? known / total : 0);

export function progressSentence(counts: ProgressCounts, noun = 'moves'): string {
  const { total, known, mastered, learning = 0 } = counts;
  if (!known && !learning) return 'Not started';
  return `${known} of ${total} ${noun} known${mastered ? `, ${mastered} mastered` : ''}`;
}

export function progressBreakdown({ total, known, mastered, learning = 0 }: ProgressCounts): string {
  const notStarted = Math.max(0, total - known - learning);
  return `Known ${known - mastered}, mastered ${mastered}, learning ${learning}, not started ${notStarted}`;
}
