import type { OpeningIndexEntry } from '@knightschool/core';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Picks where practice comes from. `extra` adds choices of the page's own at the top (the quiz's "due cards"); the
 * rest are always the courses being learned, everything, and each course by name.
 */
export function SourceSelect({
  value,
  onChange,
  index,
  extra = [],
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  index: OpeningIndexEntry[];
  extra?: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full sm:w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {extra.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
        {extra.length > 0 && <SelectSeparator />}
        <SelectItem value="learning">The courses I am learning</SelectItem>
        <SelectItem value="all">Everything</SelectItem>
        {index.map((course) => (
          <SelectItem key={course.id} value={course.id}>
            {course.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
