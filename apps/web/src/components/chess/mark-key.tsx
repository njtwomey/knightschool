import { MARK_MEANINGS, markColours, type Marks } from '@knightschool/core';
import { MARK_RGB } from '@/components/board/colours';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** What the mark colours on the board mean: only the colours present. */
export function MarkKey({ marks }: { marks: Partial<Marks> | undefined }) {
  const colours = markColours(marks);
  if (colours.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="What the marks mean">
      {colours.map((colour) => (
        <Tooltip key={colour}>
          <TooltipTrigger asChild>
            <li className="inline-flex cursor-default items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: MARK_RGB[colour] }} aria-hidden />
              {MARK_MEANINGS[colour].name}
            </li>
          </TooltipTrigger>
          <TooltipContent>{MARK_MEANINGS[colour].hint}</TooltipContent>
        </Tooltip>
      ))}
    </ul>
  );
}
