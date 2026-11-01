import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
  /** Shown on hover or long-press; for a disabled option, why it is disabled. */
  hint?: string;
  disabled?: boolean;
  count?: number;
  icon?: ReactNode;
};

export type FilterToggleProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly FilterOption<T>[];
  /** The value meaning "no filter": choosing the chosen button again goes back to it. */
  allValue?: T;
  /** Shown before the row; the group is named for screen readers either way. */
  label: string;
  showLabel?: boolean;
  size?: 'sm' | 'default';
  disabled?: boolean;
  /** The group's id, for a label elsewhere (a settings row's). */
  id?: string;
  className?: string;
};

/**
 * A row of joined buttons, one chosen: every one-of-several choice and filter (docs/v2/components/filter-toggle.md).
 * The chosen item is marked from `aria-checked`, never its data state, which a hint round the item overwrites.
 */
export function FilterToggle<T extends string>({
  value,
  onChange,
  options,
  allValue,
  label,
  showLabel = true,
  size = 'default',
  disabled,
  id,
  className,
}: FilterToggleProps<T>) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {showLabel ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      <ToggleGroup
        id={id}
        type="single"
        variant="outline"
        size={size}
        spacing={0}
        value={value}
        aria-label={label}
        disabled={disabled}
        onValueChange={(next) => {
          // Radix sends '' when the chosen item is pressed again.
          if (next) onChange(next as T);
          else if (allValue !== undefined && value !== allValue) onChange(allValue);
        }}
        className="flex-wrap"
      >
        {options.map((option) => {
          const item = (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              aria-label={option.count !== undefined ? `${option.label}, ${option.count}` : undefined}
              // `!` beats the toggle's own `data-[state=on]:bg-muted`, which only applies to items without a hint.
              className="aria-checked:bg-primary! aria-checked:text-primary-foreground! aria-checked:hover:bg-primary/90!"
            >
              {option.icon}
              {option.label}
              {option.count !== undefined ? <span className="tabular-nums opacity-70">{option.count}</span> : null}
            </ToggleGroupItem>
          );
          if (!option.hint) return item;
          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                {/* A disabled button gets no pointer events, so its hint hangs on a wrapper. */}
                {option.disabled ? <span className="inline-flex">{item}</span> : item}
              </TooltipTrigger>
              <TooltipContent>{option.hint}</TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
