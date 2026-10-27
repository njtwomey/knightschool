import { MARK_MEANINGS, markColours, type Marks } from '@knightschool/core';
import { Hint } from '@/components/hint';
import { MARK_RGB } from './shapes';

/** What the colours drawn on the board mean: only the colours there, each named, its meaning on hover. */
export function MarkKey({ marks }: { marks: Partial<Marks> | undefined }) {
  const colours = markColours(marks);
  if (colours.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="What the marks mean">
      {colours.map((colour) => (
        <Hint key={colour} text={MARK_MEANINGS[colour].hint}>
          <li className="flex items-center gap-1.5" tabIndex={0}>
            <span aria-hidden className="h-1 w-4 rounded-full" style={{ backgroundColor: MARK_RGB[colour] }} />
            {MARK_MEANINGS[colour].name}
          </li>
        </Hint>
      ))}
    </ul>
  );
}
