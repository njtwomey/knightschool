import { MARK_MEANINGS, markColours, parseIcon, SQUARE_ICONS, type Marks, type SquareIcon } from '@knightschool/core';
import { MARK_RGB } from '@/components/board/colours';
import { SquareIconGlyph } from '@/components/board/square-icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** What the marks on the board mean: the colours present, then the square icons present. */
export function MarkKey({ marks }: { marks: Partial<Marks> | undefined }) {
  const colours = markColours(marks);
  const icons = [...new Set((marks?.icons ?? []).flatMap((text) => parseIcon(text)?.icon ?? []))] as SquareIcon[];
  if (colours.length === 0 && icons.length === 0) return null;
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
      {icons.map((icon) => (
        <Tooltip key={icon}>
          <TooltipTrigger asChild>
            <li className="inline-flex cursor-default items-center gap-1">
              <SquareIconGlyph icon={icon} className="size-3.5" />
              {SQUARE_ICONS[icon].name}
            </li>
          </TooltipTrigger>
          <TooltipContent>{SQUARE_ICONS[icon].hint}</TooltipContent>
        </Tooltip>
      ))}
    </ul>
  );
}
