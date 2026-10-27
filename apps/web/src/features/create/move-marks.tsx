import { MARK_COLOURS, MARK_MEANINGS, type MarkColour, type Marks } from '@knightschool/core';
import { Eraser, Hand } from 'lucide-react';
import { MARK_RGB } from '@/components/board/shapes';
import { Hint } from '@/components/hint';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * Drawing on the board for the move looked at: the colour (each means one thing everywhere), tapping instead of the
 * right button on a touch screen, and clearing the move's marks.
 */
export function MoveMarks({
  label,
  marks,
  colour,
  onColour,
  tapping,
  onTapping,
  onClear,
}: {
  label: string;
  marks: Marks;
  colour: MarkColour;
  onColour: (colour: MarkColour) => void;
  tapping: boolean;
  onTapping: (tapping: boolean) => void;
  onClear: () => void;
}) {
  const count = marks.arrows.length + marks.circles.length;
  return (
    <div className="grid gap-2 rounded-lg border p-3 text-sm">
      <p className="font-medium">Marks on {label}</p>
      <p className="text-xs text-muted-foreground">
        Drag with the right mouse button for an arrow, right-click a square to ring it; the same again takes it away.
        Learners see them while studying, never while being tested.
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={colour}
        onValueChange={(value) => value && onColour(value as MarkColour)}
        className="flex-wrap justify-self-start"
        aria-label="Colour"
      >
        {MARK_COLOURS.map((option) => (
          <Hint key={option} text={MARK_MEANINGS[option].hint}>
            <ToggleGroupItem value={option}>
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: MARK_RGB[option] }} />
              {MARK_MEANINGS[option].name}
            </ToggleGroupItem>
          </Hint>
        ))}
      </ToggleGroup>
      <div className="flex flex-wrap gap-2">
        <Toggle variant="outline" size="sm" pressed={tapping} onPressedChange={onTapping}>
          <Hand aria-hidden /> Draw by tapping
        </Toggle>
        <Button variant="outline" size="sm" onClick={onClear} disabled={count === 0}>
          <Eraser aria-hidden /> Clear the marks
        </Button>
      </div>
      {tapping && (
        <p className="text-xs text-muted-foreground">
          Tap where the arrow starts, then where it ends; tap a square twice to ring it. Turn this off to play moves.
        </p>
      )}
    </div>
  );
}
