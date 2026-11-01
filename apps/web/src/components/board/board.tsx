import type { Marks, Score } from '@knightschool/core';
import { useState, type ReactNode } from 'react';
import { MarkKey } from '@/components/chess/mark-key';
import { cn } from '@/lib/utils';
import { BoardControls, type ControlsExercise } from './board-controls';
import type { SettingsGroup } from './board-settings-menu';
import { BoardSurface, type BoardBadge, type BoardSurfaceProps, type SystemArrow } from './board-surface';
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
  /** The page keeps the side (in its address): flipping calls this and `orientation` is used as given. */
  onFlip?: () => void;
  /** The eval bar beside the board where the reveal level allows it; off when the engine is off. */
  evalBar?: boolean;
  /** Which groups the gear's menu shows (a board with the engine adds Engine). */
  settingsGroups?: SettingsGroup[];
  badge?: BoardBadge;
  arrows?: SystemArrow[];
  lit?: BoardSurfaceProps['lit'];
  interactive?: boolean;
  /** An exercise waiting for an answer: Hint and Show me in the control row. */
  exercise?: ControlsExercise;
  /** Stepping stops here: before it is not part of what is shown (a step starting part-way). */
  stepMin?: number;
  /** Stepping forward stops at the move being asked, so the answer is never one click away. */
  asked?: number;
  /** The key to the marks under the board; off where a notes panel shows it instead. */
  markKey?: boolean;
  /** The settings gear in the control row (on unless turned off). */
  settings?: boolean;
  /** Stepping through a side line (a refutation): the step row offers "Back to the line". */
  offLine?: boolean;
  onBackToLine?: () => void;
  onMove?: (from: string, to: string) => boolean;
  /** Passed through to the surface, for drawing with the mouse (the marks editor's right button). */
  onSquareMouseDown?: BoardSurfaceProps['onSquareMouseDown'];
  onSquareMouseUp?: BoardSurfaceProps['onSquareMouseUp'];
  onSquareRightClick?: BoardSurfaceProps['onSquareRightClick'];
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
  onFlip,
  evalBar = true,
  settingsGroups,
  badge,
  arrows = [],
  lit,
  interactive,
  exercise,
  stepMin,
  asked,
  markKey = true,
  settings = true,
  offLine,
  onBackToLine,
  onMove,
  onSquareMouseDown,
  onSquareMouseUp,
  onSquareRightClick,
  caption,
  actions,
  keys = false,
  className,
}: BoardProps) {
  const [flipped, setFlipped] = useState(false);
  const orientation = !onFlip && flipped ? (fixed === 'white' ? 'black' : 'white') : fixed;
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
        {shows.eval && evalBar ? (
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
          onSquareMouseDown={onSquareMouseDown}
          onSquareMouseUp={onSquareMouseUp}
          onSquareRightClick={onSquareRightClick}
        />
      </div>
      <BoardControls
        onFlip={flippable ? (onFlip ?? (() => setFlipped(!flipped))) : undefined}
        settingsGroups={settingsGroups}
        keys={keys}
        settings={settings}
        stepper={onIndex ? { index, last, onIndex, keys, min: stepMin, asked, offLine, onBackToLine } : undefined}
        exercise={exercise}
        actions={actions}
      />
      {caption ? <div className="text-sm">{caption}</div> : null}
      {shows.marks && markKey ? <MarkKey marks={position.marks} /> : null}
    </div>
  );
}
