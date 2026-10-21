import { Hint } from '@/components/hint';
import type { FilterOption } from '@/components/filter-options';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * A row of joined buttons, one of them chosen: every filter and one-of-several choice in the app. Choosing the chosen
 * one again does nothing, unless the filter has an `allValue`, which it then goes back to (a filter with no "all"
 * button, such as Tier, is cleared that way).
 */
export function FilterToggle<T extends string | number>({
  value,
  onChange,
  options,
  label,
  allValue,
  id,
  size,
  disabled,
  title,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly FilterOption<T>[];
  /** Names the group for screen readers. */
  label?: string;
  allValue?: T;
  id?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <ToggleGroup
      id={id}
      type="single"
      variant="outline"
      size={size}
      value={String(value)}
      disabled={disabled}
      title={title}
      aria-label={label}
      onValueChange={(next) => {
        const option = options.find((candidate) => String(candidate.value) === next);
        if (option) onChange(option.value);
        else if (!next && allValue !== undefined) onChange(allValue);
      }}
      className={className}
    >
      {options.map((option) => {
        const item = (
          <ToggleGroupItem key={String(option.value)} value={String(option.value)} disabled={option.disabled}>
            {option.label}
          </ToggleGroupItem>
        );
        return option.hint ? (
          <Hint key={String(option.value)} text={option.hint}>
            {item}
          </Hint>
        ) : (
          item
        );
      })}
    </ToggleGroup>
  );
}
