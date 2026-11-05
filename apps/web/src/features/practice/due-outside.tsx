import { dueOutside } from './chosen';
import type { LearnerProgress } from './progress';
import { dueAllHref } from './sources';

/** A quiet line when moves are due outside the repertoire: they wait, and one link reviews them. */
export function DueOutside({ progress }: { progress: LearnerProgress }) {
  const count = dueOutside(progress);
  if (!count) return null;
  return (
    <p className="text-sm text-muted-foreground">
      {count} more {count === 1 ? 'card is' : 'cards are'} due outside your repertoire and{' '}
      {count === 1 ? 'waits' : 'wait'} until you tick {count === 1 ? 'it' : 'them'}.{' '}
      <a
        href={dueAllHref()}
        className="font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
      >
        Review them too
      </a>
    </p>
  );
}
