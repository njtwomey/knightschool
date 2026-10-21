import type { Weighting } from '@knightschool/core';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** How practice is picked from the chosen courses: an even draw, or favouring positions that more games reach. */
export function WeightingSelect({
  value,
  onChange,
  label,
}: {
  value: Weighting;
  onChange: (value: Weighting) => void;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as Weighting)}>
      <SelectTrigger aria-label={label} className="w-full sm:w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="random">Picked at random</SelectItem>
        <SelectItem value="popular">Favouring what players meet most</SelectItem>
      </SelectContent>
    </Select>
  );
}
