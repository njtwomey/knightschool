import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/** One choice of several, so a joined group: a shared border, flat inside, round at the two ends. */
export function TabGroup<T extends string>({
  tabs,
  value,
  onPick,
  label,
}: {
  tabs: readonly { tab: T; name: string; blurb: string }[];
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
