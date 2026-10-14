import type { GlossaryEntry } from '@knightschool/core';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { to } from '@/router/location';

/** An idea as a small badge. Hover or focus it for the definition; click to go to its glossary entry. */
export function MotifChip({ id, entry }: { id: string; entry?: GlossaryEntry }) {
  const label = entry?.name ?? id.replace(/-/g, ' ');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a href={`${to('/glossary')}#${id}`}>
          <Badge variant="outline" className="font-normal hover:bg-accent">
            {label}
          </Badge>
        </a>
      </TooltipTrigger>
      {entry && (
        <TooltipContent side="bottom" className="max-w-xs text-left">
          <p className="font-medium">{entry.name}</p>
          <p>{entry.summary}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
