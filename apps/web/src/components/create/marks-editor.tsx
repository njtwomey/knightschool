import { MARK_COLOURS, MARK_MEANINGS, type MarkColour } from '@knightschool/core';
import { Eraser } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Board } from '@/components/board/board';
import { FilterToggle, type FilterOption } from '@/components/finding/filter-toggle';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { markColourFor, toggleArrow, toggleRing, type MarkSet } from './marks';

export type { MarkSet } from './marks';

const SWATCH: Record<MarkColour, string> = {
  G: 'bg-mark-idea',
  R: 'bg-mark-threat',
  Y: 'bg-mark-target',
  B: 'bg-mark-support',
};

/** The four colours, each named for its meaning, with its key (1 to 4) in the hint. */
const COLOUR_OPTIONS: FilterOption<MarkColour>[] = MARK_COLOURS.map((c, i) => ({
  value: c,
  label: MARK_MEANINGS[c].name,
  hint: `${i + 1}: ${MARK_MEANINGS[c].hint}`,
  icon: <span className={cn('size-3 rounded-full', SWATCH[c])} aria-hidden />,
}));

const FILES = 'abcdefgh';
function squareAt(column: number, row: number, orientation: 'white' | 'black') {
  const file = orientation === 'white' ? column : 7 - column;
  const rank = orientation === 'white' ? 8 - row : row + 1;
  return `${FILES[file]}${rank}`;
}

export type MarksEditorProps = {
  /** The position the marks are drawn on (after the move being edited). */
  epd: string;
  lastMove?: { from: string; to: string };
  /** The move's name, for Undo ("mark 4...Nf6"). */
  moveName: string;
  marks: MarkSet;
  /** Each change saves at once as one undoable action; a run drawn within a few seconds folds into one Undo. */
  onChange: (marks: MarkSet, label: string) => void;
  /** False when another line owns this move's comment, where the marks live. */
  editable?: boolean;
  /** Named when not editable. */
  owner?: string;
  orientation?: 'white' | 'black';
  /** Tap to draw starts on (on by default on a touch screen). */
  tapToDraw?: boolean;
  className?: string;
};

/**
 * Drawing an author's arrows and rings for the move being edited: pick a colour, draw, clear. The four colours each
 * mean one thing everywhere, so the swatches teach the meanings as they are used (docs/v2/components/marks-editor.md).
 * Tap a square, then another for an arrow, or the same one again for a ring; with a mouse, right-drag draws an arrow
 * and right-click a ring (Shift red, Alt blue, both yellow, as on Lichess); 1 to 4 pick a colour while the board has
 * focus.
 */
export function MarksEditor({
  epd,
  lastMove,
  moveName,
  marks,
  onChange,
  editable = true,
  owner,
  orientation = 'white',
  tapToDraw: tapStart,
  className,
}: MarksEditorProps) {
  const id = useId();
  const [colour, setColour] = useState<MarkColour>('G');
  const [tapping, setTapping] = useState(
    () => tapStart ?? (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches),
  );
  const [first, setFirst] = useState<string | null>(null);
  /** Where a right-button drag started. */
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const count = marks.arrows.length + marks.circles.length;
  const label = `mark ${moveName}`;

  const tap = (square: string, event: MouseEvent) => {
    const drawn = markColourFor(event, colour);
    if (!first) {
      setFirst(square);
      return;
    }
    onChange(square === first ? toggleRing(marks, drawn, square) : toggleArrow(marks, drawn, first, square), label);
    setFirst(null);
  };

  /** Right-drag for an arrow, right-click for a ring, in the colour the modifiers pick when the button is let go. */
  const rightDown = (square: string, event: MouseEvent) => {
    if (editable && event.button === 2) setDragFrom(square);
  };
  const rightUp = (square: string, event: MouseEvent) => {
    if (event.button !== 2 || !dragFrom) return;
    const drawn = markColourFor(event, colour);
    onChange(
      square === dragFrom ? toggleRing(marks, drawn, square) : toggleArrow(marks, drawn, dragFrom, square),
      label,
    );
    setDragFrom(null);
  };

  const onKey = (event: KeyboardEvent) => {
    const picked = MARK_COLOURS[Number(event.key) - 1];
    if (picked && editable) {
      setColour(picked);
      event.preventDefault();
    } else if (event.key === 'Escape') {
      setFirst(null);
      setDragFrom(null);
    }
  };

  return (
    <div className={cn('grid gap-3', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterToggle
          label="Mark colour"
          showLabel={false}
          size="sm"
          value={colour}
          disabled={!editable}
          options={COLOUR_OPTIONS}
          onChange={setColour}
        />
        <div className="flex items-center gap-2">
          <Switch
            id={`${id}-tap`}
            checked={tapping}
            disabled={!editable}
            onCheckedChange={(on) => {
              setTapping(on);
              setFirst(null);
            }}
          />
          <Label htmlFor={`${id}-tap`}>Tap to draw</Label>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={!editable || count === 0}
          onClick={() => onChange({ arrows: [], circles: [] }, `clear the marks on ${moveName}`)}
        >
          <Eraser aria-hidden /> {count === 0 ? 'No marks' : `Clear ${count} ${count === 1 ? 'mark' : 'marks'}`}
        </Button>
      </div>

      <div
        className="relative w-full max-w-md rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        tabIndex={0}
        aria-label={`Board for drawing marks on ${moveName}`}
        onKeyDown={onKey}
        onMouseLeave={() => setDragFrom(null)}
      >
        <Board
          positions={[{ epd, lastMove, marks }]}
          index={0}
          orientation={orientation}
          flippable={false}
          evalBar={false}
          lit={first ? [first] : dragFrom ? [dragFrom] : []}
          interactive={false}
          onSquareMouseDown={editable ? rightDown : undefined}
          onSquareMouseUp={editable ? rightUp : undefined}
          className="max-w-none"
        />
        {editable && tapping ? (
          // Over the squares only: without an eval bar the surface is the board's full width, at its top.
          <div
            className="absolute inset-x-0 top-0 z-20 grid aspect-square grid-cols-8 grid-rows-8"
            role="grid"
            aria-label="Squares"
          >
            {Array.from({ length: 64 }, (_, i) => {
              const square = squareAt(i % 8, Math.floor(i / 8), orientation);
              return (
                <Button
                  key={square}
                  variant="ghost"
                  aria-label={first === square ? `${square}, picked: tap again for a ring` : square}
                  aria-pressed={first === square}
                  className="size-full rounded-none p-0 hover:bg-foreground/10 aria-pressed:bg-foreground/15 dark:hover:bg-foreground/10"
                  onClick={(event) => tap(square, event)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="grid gap-1 text-sm">
        {!editable ? (
          <p className="text-muted-foreground">
            The marks live in the move’s comment, which {owner ? `the line ${owner}` : 'another line'} writes. Edit them
            there.
          </p>
        ) : tapping ? (
          <p className="text-muted-foreground">
            {first
              ? `From ${first}: tap another square for an arrow, or ${first} again for a ring.`
              : 'Tap a square, then another for an arrow; the same square twice for a ring. Pieces cannot move while tap to draw is on.'}
          </p>
        ) : (
          <p className="text-muted-foreground">
            Right-drag for an arrow, right-click for a ring: Shift draws red, Alt blue, both yellow. Or turn on Tap to
            draw to add marks with clicks or taps.
          </p>
        )}
      </div>
    </div>
  );
}
