import type { Marks, Score } from '@knightschool/core';
import { useState, type ReactNode } from 'react';
import { MarkKey } from '@/components/chess/mark-key';
import { cn } from '@/lib/utils';
import { BoardControls } from './board-controls';
import { BoardSurface, type BoardBadge, type SystemArrow } from './board-surface';
import { EvalBar } from './eval-bar';

/**
 * What a board shows depends on what the learner is doing (docs/v2/patterns/reveal.md): everything while studying,
 * the move to play while learning, nothing that gives the answer away while testing, everything again once answered.
 */
export type Reveal = 'study' | 'learn' | 'test' | 'answered';

const SHOWS: Record<Reveal, { marks: boolean; eval: boolean; play: boolean }> = {
  study: { marks: true, eval: true, play: false },
  learn: { marks: true, eval: true, play: true },
  test: { marks: false, eval: false, play: false },
  answered: { marks: true, eval: true, play: false },
};

export type BoardPosition = {
  epd: string;
  lastMove?: { from: string; to: string };
  marks?: Partial<Marks>;
  score?: Score | null;
  /** The move to play from here, drawn in Learn and once answered. */
  next?: { from: string; to: string };
};

export type BoardProps = {
  positions: BoardPosition[];
  index: number;
  onIndex?: (index: number) => void;
  reveal?: Reveal;
  orientation?: 'white' | 'black';
  /** Whether the page lets the board flip (not in an exercise that fixes the side). */
  flippable?: boolean;
  badge?: BoardBadge;
  arrows?: SystemArrow[];
  lit?: string[];
  interactive?: boolean;
  onMove?: (from: string, to: string) => boolean;
  caption?: ReactNode;
  actions?: ReactNode;
  /** Arrow keys step through the positions (one board per page owns them). */
  keys?: boolean;
  className?: string;
};

/**
 * The one board: the surface, the eval bar, one control row (flip, steps, the page's own actions), a caption and the
 * key to the marks. Every board a learner studies or tests on is this, configured, never another
 * (docs/v2/components/board.md).
 */
export function Board({
  positions,
  index,
  onIndex,
  reveal = 'study',
  orientation: fixed = 'white',
  flippable = true,
  badge,
  arrows = [],
  lit,
  interactive,
  onMove,
  caption,
  actions,
  keys = false,
  className,
}: BoardProps) {
  const [flipped, setFlipped] = useState(false);
  const orientation = flipped ? (fixed === 'white' ? 'black' : 'white') : fixed;
  const shows = SHOWS[reveal];
  const position = positions[index]!;
  const last = positions.length - 1;

  const drawn: SystemArrow[] = [
    ...(shows.play && position.next ? [{ ...position.next, kind: 'play' as const }] : []),
    ...arrows,
  ];
  return (
    <div className={cn('grid w-full max-w-xl content-start gap-2 self-start', className)}>
      <div className="flex items-start gap-2">
        {shows.eval ? (
          <EvalBar score={position.score ?? null} orientation={orientation} className="self-stretch" />
        ) : null}
        <BoardSurface
          epd={position.epd}
          orientation={orientation}
          lastMove={position.lastMove}
          marks={shows.marks ? position.marks : undefined}
          arrows={drawn}
          badge={badge}
          lit={lit}
          interactive={interactive}
          onMove={onMove}
        />
      </div>
      <BoardControls
        onFlip={flippable ? () => setFlipped(!flipped) : undefined}
        keys={keys}
        stepper={onIndex ? { index, last, onIndex, keys } : undefined}
        actions={actions}
      />
      {caption ? <div className="text-sm">{caption}</div> : null}
      {shows.marks ? <MarkKey marks={position.marks} /> : null}
    </div>
  );
}
