import type { Marks, Score } from '@knightschool/core';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { MarkKey } from '@/components/chess/mark-key';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  answered: { marks: true, eval: true, play: true },
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
  const go = (next: number) => onIndex?.(Math.max(0, Math.min(last, next)));

  useEffect(() => {
    if (!keys || !onIndex) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input, textarea, [contenteditable]'))
        return;
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (step) go(index + step);
      else if (event.key === 'Home') go(0);
      else if (event.key === 'End') go(last);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const drawn: SystemArrow[] = [
    ...(shows.play && position.next ? [{ ...position.next, kind: 'play' as const }] : []),
    ...arrows,
  ];
  return (
    <div className={cn('grid w-full max-w-xl gap-2', className)}>
      <div className="flex gap-2">
        {shows.eval ? <EvalBar score={position.score ?? null} orientation={orientation} /> : null}
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
      <div className="flex flex-wrap items-center gap-1">
        {flippable ? (
          <Button variant="ghost" size="icon" aria-label="Flip the board" onClick={() => setFlipped(!flipped)}>
            <ArrowUpDown aria-hidden />
          </Button>
        ) : null}
        {onIndex ? (
          <div className="flex items-center" role="group" aria-label="Step through the moves">
            <Button variant="ghost" size="icon" aria-label="Start" disabled={index === 0} onClick={() => go(0)}>
              <ChevronFirst aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Back" disabled={index === 0} onClick={() => go(index - 1)}>
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Forward"
              disabled={index === last}
              onClick={() => go(index + 1)}
            >
              <ChevronRight aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" aria-label="End" disabled={index === last} onClick={() => go(last)}>
              <ChevronLast aria-hidden />
            </Button>
          </div>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {caption ? <div className="text-sm">{caption}</div> : null}
      {shows.marks ? <MarkKey marks={position.marks} /> : null}
    </div>
  );
}
