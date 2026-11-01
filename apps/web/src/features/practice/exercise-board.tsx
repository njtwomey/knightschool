import type { ReactNode } from 'react';
import { Board } from '@/components/board/board';
import { BoardFeedback } from '@/components/board/board-feedback';
import { TriesTable } from '@/components/chess/tries-table';
import { siteConfig } from '@/data/site-config';
import type { useExerciseSession } from './use-exercise-session';

type Session = ReturnType<typeof useExerciseSession>;

/**
 * The one screen every exercise is played on: the board in the test preset (interactive on the learner's turn, Hint
 * and Show me in its control row), the feedback on the last move, and every guess in the tries table. Modes add their
 * own prompt, panel and summary around it.
 */
export function ExerciseBoard({
  session,
  prompt,
  aside,
  footer,
}: {
  session: Session;
  /** Under the board: what is asked ("Your move", "Find the win"). */
  prompt?: ReactNode;
  /** Above the feedback: the mode's own panel (progress, clock, the position's name). */
  aside?: ReactNode;
  /** Under the tries table: the mode's own actions or summary. */
  footer?: ReactNode;
}) {
  const triesLeft =
    siteConfig.teach.triesBeforeShown - session.attempt.tries.filter((t) => t.outcome === 'wrong').length;
  const side = session.exercise?.side ?? 'white';
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <Board
        positions={[{ epd: session.epd, lastMove: session.lastMove }]}
        index={0}
        reveal={session.done ? 'answered' : 'test'}
        orientation={side}
        flippable={false}
        interactive={session.learnerTurn}
        onMove={session.play}
        badge={session.badge}
        arrows={session.arrows}
        lit={session.hintSquare ? [session.hintSquare] : undefined}
        exercise={
          session.learnerTurn
            ? {
                help: session.attempt.shown ? 'shown' : session.attempt.hint ? 'hint' : 'none',
                onHint: session.hint,
                onShow: session.show,
                hintsAllowed: session.canShow,
                triesSpent: triesLeft <= 0,
              }
            : undefined
        }
        caption={
          session.learnerTurn ? (
            (prompt ?? <p className="font-medium">Your move: what does {side === 'white' ? 'White' : 'Black'} play?</p>)
          ) : session.done ? null : (
            <p className="text-muted-foreground">
              {session.thinking ? 'The engine is thinking…' : 'The other side is moving…'}
            </p>
          )
        }
      />
      <div className="grid content-start gap-4">
        {aside}
        <BoardFeedback feedback={session.feedback} reveal="answered" triesLeft={triesLeft} />
        <TriesTable tries={session.tries} />
        {footer}
      </div>
    </div>
  );
}
