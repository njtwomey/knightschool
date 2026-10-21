import { moveNumber, runMove } from '@knightschool/core';
import { cn } from 'cn';
import { Fragment, type ReactNode } from 'react';
import { MoveTags } from '@/components/move-tags';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { moveParagraphs } from '@/lib/move-paragraphs';

/**
 * How a move is shown: `played` plainly, `future` dimmed (the rest of a line still to come), `explored` in the accent
 * colour (off the line), `lead` muted (moves that lead to where something starts), `core` in bold (the moves that are
 * the point), `done` bold in the accent colour (core moves already passed).
 */
export type MoveState = 'played' | 'future' | 'explored' | 'lead' | 'core' | 'done';

export type MoveListMove = {
  san: string;
  /** Plies played before this move: 0 for White's first. */
  ply: number;
  state?: MoveState;
  /** Supplementary tags (tip, trap, blunder), drawn after the move. */
  tags?: string[];
  /** The note on the move: `paragraphs` ends a paragraph with it. */
  comment?: string;
  /** A dotted underline, with this as the move's title (Create marks the line's picture this way). */
  mark?: string;
};

type Props = {
  moves: MoveListMove[];
  /**
   * `table` one row per full move (the moves so far), `inline` a run of moves that flows like text (it can sit in a
   * sentence), `paragraphs` runs of moves each ending with the comment on its last move (a line told in words).
   */
  layout: 'table' | 'inline' | 'paragraphs';
  /** The ply of the move whose position is shown: it is marked. */
  current?: number | null;
  /** Makes each move (other than explored ones) a button; it gets the move's ply. */
  onSelect?: (ply: number) => void;
  label?: string;
  /** Shown when there are no moves. */
  empty?: ReactNode;
  /** Inline: there are earlier moves left out, shown as "…". */
  truncated?: boolean;
  className?: string;
};

const STATE: Record<MoveState, string> = {
  played: '',
  future: 'text-muted-foreground/60',
  explored: 'font-medium text-primary',
  lead: 'text-muted-foreground',
  core: 'font-semibold',
  done: 'font-semibold text-primary',
};

/**
 * The one way to list moves: the quiz's and Play's moves so far, a line's About in words, Create's line, a unit on the
 * path, the moves played in board search. A move can be clicked to show its position when `onSelect` is given.
 */
export function MoveList({ moves, layout, current, onSelect, label, empty, truncated, className }: Props) {
  if (moves.length === 0) {
    return empty === undefined ? null : <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  const move = (entry: MoveListMove, text: string) => {
    const isCurrent = entry.ply === current;
    const look = cn(
      'rounded px-1 font-mono text-[length:inherit]',
      STATE[entry.state ?? 'played'],
      isCurrent && (entry.state === 'explored' ? 'bg-primary/15' : 'bg-secondary font-medium'),
      entry.mark && 'underline decoration-dotted underline-offset-4',
    );
    const content =
      onSelect && entry.state !== 'explored' ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className={cn(look, 'h-auto hover:underline')}
          aria-current={isCurrent ? 'step' : undefined}
          title={entry.mark}
          onClick={() => onSelect(entry.ply)}
        >
          {text}
        </Button>
      ) : (
        <span className={look} aria-current={isCurrent ? 'step' : undefined} title={entry.mark}>
          {text}
        </span>
      );
    return (
      <>
        {content}
        <MoveTags tags={entry.tags} className="ml-0.5" />
      </>
    );
  };

  /** A run of moves as text: the first carries its number, and so does every White move. */
  const run = (entries: MoveListMove[]) =>
    entries.map((entry, i) => (
      <Fragment key={entry.ply}>
        {i > 0 && ' '}
        {move(entry, runMove(entry.ply, entry.san, i === 0 || entries[i - 1]!.ply !== entry.ply - 1))}
      </Fragment>
    ));

  if (layout === 'inline') {
    return (
      <span className={cn('leading-relaxed', className)} aria-label={label}>
        {truncated && <span className="text-muted-foreground">… </span>}
        {run(moves)}
      </span>
    );
  }

  if (layout === 'paragraphs') {
    return (
      <div className={cn('grid gap-3', className)} aria-label={label}>
        {moveParagraphs(moves).map((paragraph) => {
          const comment = paragraph.at(-1)!.comment;
          return (
            <p key={paragraph[0]!.ply} className="leading-relaxed">
              {run(paragraph)}
              {comment && (
                <>
                  {' '}
                  <RichText text={comment} />
                </>
              )}
            </p>
          );
        })}
      </div>
    );
  }

  // A table of full moves; a list that starts with Black's move leaves White's cell of its first row empty.
  const first = moveNumber(moves[0]!.ply);
  const rows = moveNumber(moves.at(-1)!.ply) - first + 1;
  const byPly = new Map(moves.map((entry) => [entry.ply, entry]));
  const cell = (ply: number) => {
    const entry = byPly.get(ply);
    return <TableCell className="py-1">{entry && move(entry, entry.san)}</TableCell>;
  };
  return (
    <Table aria-label={label} className={className}>
      <TableBody>
        {Array.from({ length: rows }, (_, row) => {
          const number = first + row;
          return (
            <TableRow key={number}>
              <TableCell className="w-8 py-1 font-mono text-muted-foreground">{number}.</TableCell>
              {cell((number - 1) * 2)}
              {cell((number - 1) * 2 + 1)}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
