import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/** A page's tab: its value in the address, its name, and what it is for (shown on hover). */
export type TabSpec<T extends string> = { tab: T; name: string; blurb: string };

/** One choice of several, so a joined group: a shared border, flat inside, round at the two ends. */
export function TabGroup<T extends string>({
  tabs,
  value,
  onPick,
  label,
}: {
  tabs: readonly TabSpec<T>[];
  value: T;
  onPick: (tab: T) => void;
  label: string;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(next) => next && onPick(next as T)}
      aria-label={label}
    >
      {tabs.map((item) => (
        <ToggleGroupItem
          key={item.tab}
          value={item.tab}
          title={item.blurb}
          className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {item.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
