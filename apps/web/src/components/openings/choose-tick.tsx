import type { TickState } from '@knightschool/core';
import { Circle, CircleCheck, CircleDot } from 'lucide-react';
import { IconAction } from '@/components/shared/icon-action';
import { cn } from '@/lib/utils';

export type ChooseTickProps = {
  /** How much of it is in the learner's repertoire: nothing, some of its steps, or all of it. */
  state: TickState;
  /** What it ticks, for its hint: "the Giuoco Piano", "step 3, The quiet bishop". */
  name: string;
  onToggle: () => void;
  className?: string;
};

const ICONS = { none: Circle, some: CircleDot, all: CircleCheck } as const;

/**
 * The tick that adds something to the learner's repertoire and takes it off again, in one click and with no dialog
 * (docs/v2/components/choose-tick.md). It says what is chosen and nothing else: it makes no cards and changes no progress.
 */
export function ChooseTick({ state, name, onToggle, className }: ChooseTickProps) {
  const Icon = ICONS[state];
  const label =
    state === 'all'
      ? `Take ${name} off my repertoire`
      : state === 'some'
        ? `Add the rest of ${name} to my repertoire`
        : `Add ${name} to my repertoire`;
  return (
    <IconAction label={label} onClick={onToggle} pressed={state === 'all'} className={cn('bg-transparent', className)}>
      <Icon className={state === 'none' ? 'text-muted-foreground' : 'text-primary'} />
    </IconAction>
  );
}
