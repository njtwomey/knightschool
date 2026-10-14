import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Wraps one element so hovering or focusing it explains what it means. The element itself is the trigger. */
export function Hint({ text, children }: { text: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children as React.ReactElement}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
