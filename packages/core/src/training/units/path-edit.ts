import type { OpeningContent, UnitOverrides } from '../../schema/content';
import { courseUnits } from './cut';
import type { CourseUnit } from './types';

/** The lines in the order their units first come on a path, then any line with no unit, in the order given. */
export function lineOrderOf(units: CourseUnit[], lines: string[]): string[] {
  const seen: string[] = [];
  for (const unit of units) if (lines.includes(unit.line) && !seen.includes(unit.line)) seen.push(unit.line);
  return [...seen, ...lines.filter((line) => !seen.includes(line))];
}

/**
 * The `units.order` that studies a course's lines in `lineOrder`: a stable topological sort of its units in which a
 * unit's priority is its line's place in the order, so what a unit waits for always comes first (a branch moves as
 * early as the unit it grows from allows, never before it). Undefined when that is the default path, so nothing needs
 * writing. `custom` keeps a hand-written block's `after` and `drop`. The result always passes `checkUnitOverrides`.
 */
export function unitOrderFor(
  content: OpeningContent,
  lineOrder: string[],
  custom: Pick<UnitOverrides, 'after' | 'drop'> = { after: {}, drop: {} },
): string[] | undefined {
  const base = courseUnits({ ...content, opening: { ...content.opening, units: { order: [], ...custom } } });
  const withUnits = lineOrder.filter((line) => base.some((unit) => unit.line === line));
  const defaultOrder = lineOrderOf(base, withUnits).filter((line) => withUnits.includes(line));
  if (defaultOrder.join(' ') === withUnits.join(' ')) return undefined;
  const rank = (unit: CourseUnit) => {
    const at = withUnits.indexOf(unit.line);
    return at < 0 ? Infinity : at;
  };
  const placed = new Set<string>();
  const sequence: string[] = [];
  while (sequence.length < base.length) {
    const next = base
      .filter((unit) => !placed.has(unit.id) && unit.prerequisites.every((need) => placed.has(need)))
      .sort((a, b) => rank(a) - rank(b) || a.index - b.index)[0];
    if (!next) break; // cannot happen: courseUnits gives an order where every prerequisite comes first
    placed.add(next.id);
    sequence.push(next.id);
  }
  return sequence.join(' ') === base.map((unit) => unit.id).join(' ') ? undefined : sequence;
}

/**
 * The placements of `units.place` that still fit a course: a trap or quiz of it, a unit it has, and not before the
 * first unit that reaches the item. After the path is reordered, the others would be rejected by the build.
 */
export function fittingPlacements(content: OpeningContent, place: Record<string, string>): Record<string, string> {
  const units = courseUnits({
    ...content,
    opening: { ...content.opening, units: { order: [], after: {}, drop: {}, ...content.opening.units, place: {} } },
  });
  const natural = (item: string) => units.findIndex((unit) => unit.traps.includes(item) || unit.quizzes.includes(item));
  const items = new Set([
    ...content.opening.variants.filter((variant) => variant.kind === 'refutation').map((variant) => variant.id),
    ...content.quizzes.map((quiz) => quiz.id),
  ]);
  return Object.fromEntries(
    Object.entries(place).filter(([item, unitId]) => {
      const at = units.findIndex((unit) => unit.id === unitId);
      return items.has(item) && at >= 0 && at >= natural(item);
    }),
  );
}
