import type { BuiltOpening } from '@knightschool/core/content';
import { taughtAt } from '@/features/learn/model';

/**
 * The prompt for a position whose answer is the opening's own move: "Find the book move" and the line it is from, so
 * a learner who sees several good moves knows which one is asked (docs/v2/pages/checkpoint.md, review.md).
 */
export function BookPrompt({ opening, epd, branch }: { opening?: BuiltOpening; epd: string; branch?: boolean }) {
  const where = opening ? taughtAt(opening, epd) : undefined;
  return (
    <div className="grid gap-0.5">
      <p className="font-medium">{branch ? 'Play the book moves to the end of the branch' : 'Find the book move'}</p>
      {where ? (
        <p className="text-muted-foreground">
          {where.line}
          {where.step ? `: ${where.step}` : ''}
        </p>
      ) : null}
    </div>
  );
}
