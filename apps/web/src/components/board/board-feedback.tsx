import { GRADE_INFO, numberedMove, type Grade } from '@knightschool/core';
import { ArrowRight, Check, Eye, GitBranch, Lightbulb, Undo2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { MoveRun, type RunMove } from '@/components/chess/move-run';
import { RichText, type RichTextBoard, type RichTextContext } from '@/components/chess/rich-text';
import { VerdictBadge } from '@/components/chess/verdict-badge';
import { VerdictNote } from '@/components/chess/verdict-note';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Reveal } from './board';

type Move = { ply: number; san: string; from: string; to: string };

/** The verdict on the move at the board's cursor: one shape per case in docs/v2/components/board-feedback.md. */
export type Feedback =
  /** Right: usually Book; the move's comment stays until the learner's next move. */
  | ({ kind: 'right'; grade?: Grade; comment?: string; ideas?: ReactNode } & Move)
  /** Wrong: cross and snap back, the badge, why, the author's note on that wrong move, and the refutation. */
  | ({
      kind: 'wrong';
      grade: Grade;
      costCp?: number;
      because?: string;
      authorNote?: string;
      refutation?: RunMove[];
    } & Move)
  /** As good as the line's move, but not it: no cross, no try used, and the line's move asked for. */
  | ({ kind: 'alternative'; grade: Grade; lineMove: string; linePly: number } & Move)
  /** The opponent's mistake: how often it is played at the band, what it costs, and "find the punishment". */
  | ({ kind: 'opponent-mistake'; grade: Grade; sharePct?: number; because: string } & Move)
  /** The punishment was there and not found. */
  | ({ kind: 'miss'; punish: Move; because?: string; refutation?: RunMove[] } & Move);

export type BoardFeedbackProps = {
  /** The feedback for the move at the cursor; none for a move with no feedback. */
  feedback?: Feedback | null;
  reveal?: Reveal;
  /** `feedback.explain`: the symbol only, a sentence, or the refutation on the board too. */
  explain?: 'symbol' | 'sentence' | 'refutation';
  /** From the session. */
  triesLeft?: number;
  help?: 'none' | 'hint' | 'shown';
  /** Show why: put the refutation on the board as a side branch to step through. */
  onShowWhy?: () => void;
  showingWhy?: boolean;
  onBackToLine?: () => void;
  /** A miss with something to read stays up with Next. */
  onNext?: () => void;
  /** Hovering the panel lights the move's squares on the board. */
  onLight?: (squares: string[] | null) => void;
  /** For comments with moves and positions in them. */
  context?: RichTextContext;
  board?: RichTextBoard;
  className?: string;
};

const sideName = (ply: number) => (ply % 2 === 0 ? 'White' : 'Black');
const runPly = (feedback: Feedback) => feedback.ply + 1;

function ShowWhy({
  onShowWhy,
  showingWhy,
  onBackToLine,
}: Pick<BoardFeedbackProps, 'onShowWhy' | 'showingWhy' | 'onBackToLine'>) {
  if (showingWhy && onBackToLine) {
    return (
      <Button variant="outline" size="sm" onClick={onBackToLine}>
        <Undo2 aria-hidden />
        Back to the line
      </Button>
    );
  }
  return onShowWhy ? (
    <Button variant="outline" size="sm" onClick={onShowWhy}>
      <Eye aria-hidden />
      Show why
    </Button>
  ) : null;
}

/**
 * The verdict on the move just played, and why, kept next to the board and tied to the move it is about
 * (docs/v2/components/board-feedback.md). Announced to screen readers as it changes.
 */
export function BoardFeedback({
  feedback,
  reveal = 'answered',
  explain = 'refutation',
  triesLeft,
  help,
  onShowWhy,
  showingWhy,
  onBackToLine,
  onNext,
  onLight,
  context,
  board,
  className,
}: BoardFeedbackProps) {
  let body: ReactNode = null;
  if (feedback) {
    const sentence = explain !== 'symbol';
    const why = explain === 'refutation' ? { onShowWhy, showingWhy, onBackToLine } : {};
    switch (feedback.kind) {
      case 'right': {
        const grade = feedback.grade ?? 'book';
        body = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-feedback-right text-white" aria-hidden>
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="font-mono font-semibold">{numberedMove(feedback.ply, feedback.san)}</span>
              <VerdictBadge grade={grade} size="sm" />
            </div>
            {sentence && feedback.comment && reveal !== 'test' ? (
              <RichText text={feedback.comment} context={context} board={board} />
            ) : null}
            {feedback.ideas}
          </>
        );
        break;
      }
      case 'wrong':
        body = (
          <>
            <div className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-feedback-wrong text-white" aria-hidden>
                <X className="size-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm text-muted-foreground">Not this one</span>
            </div>
            {sentence ? (
              <VerdictNote
                grade={feedback.grade}
                ply={feedback.ply}
                san={feedback.san}
                costCp={feedback.costCp}
                because={feedback.because}
                refutation={explain === 'refutation' ? feedback.refutation : undefined}
                refutationPly={runPly(feedback)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">
                  {numberedMove(feedback.ply, feedback.san)}
                  {GRADE_INFO[feedback.grade].symbol}
                </span>
                <VerdictBadge grade={feedback.grade} size="sm" />
              </div>
            )}
            {sentence && feedback.authorNote ? (
              <div className="rounded-md bg-muted/60 p-2">
                <RichText text={feedback.authorNote} context={context} board={board} />
              </div>
            ) : null}
            {feedback.refutation?.length ? <ShowWhy {...why} /> : null}
          </>
        );
        break;
      case 'alternative':
        body = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold">{numberedMove(feedback.ply, feedback.san)}</span>
              <VerdictBadge grade={feedback.grade} size="sm" />
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="size-3.5" aria-hidden />
                not your repertoire move
              </span>
            </div>
            {sentence ? (
              <p className="text-sm">
                {GRADE_INFO[feedback.grade].name}, but not your repertoire move: this opening plays{' '}
                <span className="font-mono font-semibold">{numberedMove(feedback.linePly, feedback.lineMove)}</span>.
                Play it.
              </p>
            ) : null}
          </>
        );
        break;
      case 'opponent-mistake':
        body = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold">
                {numberedMove(feedback.ply, feedback.san)}
                {GRADE_INFO[feedback.grade].symbol}
              </span>
              <VerdictBadge grade={feedback.grade} size="sm" />
            </div>
            {sentence ? (
              <p className="text-sm">
                {sideName(feedback.ply)}'s{' '}
                <span className="font-mono">
                  {feedback.ply % 2 === 0 ? '' : '...'}
                  {feedback.san}
                  {GRADE_INFO[feedback.grade].symbol}
                </span>{' '}
                {feedback.sharePct !== undefined
                  ? `is played in ${feedback.sharePct}% of games at your level, and `
                  : ''}
                {feedback.because}
              </p>
            ) : null}
            <p className="text-sm font-medium">Find the punishment.</p>
          </>
        );
        break;
      case 'miss':
        body = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold">{numberedMove(feedback.ply, feedback.san)}</span>
              <VerdictBadge grade="miss" size="sm" />
            </div>
            {sentence ? (
              <p className="text-sm">
                A miss:{' '}
                <span className="font-mono font-semibold">
                  {numberedMove(feedback.punish.ply, feedback.punish.san)}
                </span>{' '}
                {feedback.because ?? 'wins material here.'}
              </p>
            ) : null}
            {explain === 'refutation' && feedback.refutation?.length ? (
              <p className="flex flex-wrap items-baseline gap-1 text-sm text-muted-foreground">
                <span>The punishment:</span>
                <MoveRun moves={feedback.refutation} firstPly={feedback.punish.ply} />
              </p>
            ) : null}
            {feedback.refutation?.length ? <ShowWhy {...why} /> : null}
          </>
        );
        break;
    }
  }
  const squares = feedback ? [feedback.from, feedback.to] : null;
  const quiet = [
    triesLeft !== undefined ? `${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left` : null,
    help === 'hint' ? 'hint used' : help === 'shown' ? 'move shown' : null,
  ].filter(Boolean);
  return (
    <section
      aria-live="polite"
      aria-label="Feedback on the last move"
      className={cn('grid min-h-16 content-start gap-2 rounded-lg border p-3', !feedback && 'border-dashed', className)}
      onMouseEnter={() => onLight?.(squares)}
      onMouseLeave={() => onLight?.(null)}
    >
      {body ?? <p className="sr-only">No feedback on this move.</p>}
      {quiet.length > 0 || onNext ? (
        <div className="flex items-center gap-2">
          {quiet.length > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {help && help !== 'none' ? <Lightbulb className="size-3.5" aria-hidden /> : null}
              {quiet.join(', ')}
            </p>
          ) : null}
          {onNext ? (
            <Button size="sm" className="ml-auto" onClick={onNext}>
              Next
              <ArrowRight aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
