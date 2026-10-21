import type { UnitOverrides } from '../../schema/content';
import { compareKeys, type CourseUnit } from './types';

/**
 * course.yaml `units:` applied to the default path. Strict (the build): any problem throws. Otherwise entries naming
 * units the learner's settings do not cut are skipped, and if what is left still fails, the default path is kept.
 */
export function applyOverrides(
  units: CourseUnit[],
  overrides: UnitOverrides | undefined,
  strict: boolean,
): CourseUnit[] {
  if (!overrides) return units;
  if (strict) return overrideUnits(units, overrides);
  const known = new Set(units.map((unit) => unit.id));
  const keep = (ids: string[]) => ids.filter((id) => known.has(id));
  const entries = (map: Record<string, string[]>) =>
    Object.entries(map)
      .filter(([id]) => known.has(id))
      .map(([id, ids]) => [id, keep(ids)] as const);
  const prerequisites = new Map(units.map((unit) => [unit.id, unit.prerequisites]));
  try {
    return overrideUnits(units, {
      order: keep(overrides.order),
      after: Object.fromEntries(entries(overrides.after)),
      drop: Object.fromEntries(
        entries(overrides.drop).map(([id, ids]) => [id, ids.filter((need) => prerequisites.get(id)!.includes(need))]),
      ),
    });
  } catch {
    return units;
  }
}

/**
 * The path after `units:`: prerequisites dropped and added, then the units in an order where every unit comes after
 * what it waits for. The units in `order` come as early as that allows, in their listed order (pulling what they wait
 * for forward with them); the others keep their default order.
 */
function overrideUnits(units: CourseUnit[], overrides: UnitOverrides): CourseUnit[] {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const named = [
    ...overrides.order,
    ...Object.entries(overrides.after).flat(2),
    ...Object.entries(overrides.drop).flat(2),
  ];
  const unknown = [...new Set(named.filter((id) => !byId.has(id)))];
  if (unknown.length > 0) {
    const lines = new Map<string, number>();
    for (const unit of units) lines.set(unit.line, Math.max(lines.get(unit.line) ?? 0, unit.n));
    const range = [...lines].map(([line, n]) => (n === 1 ? `${line}:1` : `${line}:1 to ${n}`)).join(', ');
    throw new Error(
      `units: ${unknown.map((id) => `"${id}"`).join(', ')} ${unknown.length === 1 ? 'is not a unit' : 'are not units'} of this ` +
        `course (with the default card settings). Its units are ${range}.`,
    );
  }
  const repeated = overrides.order.find((id, i) => overrides.order.indexOf(id) !== i);
  if (repeated) throw new Error(`units.order: "${repeated}" is listed twice`);

  const needs = new Map(units.map((unit) => [unit.id, [...unit.prerequisites]]));
  for (const [id, dropped] of Object.entries(overrides.drop)) {
    for (const need of dropped) {
      const list = needs.get(id)!;
      if (!list.includes(need))
        throw new Error(
          `units.drop: "${id}" does not wait for "${need}"` +
            (list.length
              ? ` (it waits for ${list.map((other) => `"${other}"`).join(', ')})`
              : ' (it waits for nothing)'),
        );
      list.splice(list.indexOf(need), 1);
    }
  }
  for (const [id, added] of Object.entries(overrides.after)) {
    for (const need of added) {
      if (need === id) throw new Error(`units.after: "${id}" cannot wait for itself`);
      if (!needs.get(id)!.includes(need)) needs.get(id)!.push(need);
    }
  }

  // A listed unit lends its place in `order` to everything it waits for, so those come forward with it.
  const priority = new Map<string, number>();
  overrides.order.forEach((id, rank) => {
    const stack = [id];
    const seen = new Set<string>();
    while (stack.length) {
      const at = stack.pop()!;
      if (seen.has(at)) continue;
      seen.add(at);
      priority.set(at, Math.min(priority.get(at) ?? Infinity, rank));
      stack.push(...needs.get(at)!);
    }
  });
  const key = (unit: CourseUnit) => [priority.get(unit.id) ?? Infinity, unit.index];
  const placed = new Set<string>();
  const result: CourseUnit[] = [];
  while (result.length < units.length) {
    const ready = units
      .filter((unit) => !placed.has(unit.id) && needs.get(unit.id)!.every((need) => placed.has(need)))
      .sort((a, b) => compareKeys(key(a), key(b)));
    const next = ready[0];
    if (!next)
      throw new Error(
        `units: ${describeCycle(
          units.filter((unit) => !placed.has(unit.id)),
          needs,
        )}`,
      );
    placed.add(next.id);
    result.push({ ...next, index: result.length, prerequisites: needs.get(next.id)! });
  }

  const position = new Map(result.map((unit) => [unit.id, unit.index]));
  for (let i = 0; i + 1 < overrides.order.length; i++) {
    const [a, b] = [overrides.order[i]!, overrides.order[i + 1]!];
    if (position.get(a)! > position.get(b)!)
      throw new Error(
        `units.order: "${a}" is listed before "${b}", but it waits for "${b}" (directly or through others)`,
      );
  }
  return result;
}

/** "a waits for b, which waits for a": the first cycle found among units that cannot be placed. */
function describeCycle(stuck: CourseUnit[], needs: Map<string, string[]>): string {
  const left = new Set(stuck.map((unit) => unit.id));
  const chain = [stuck[0]!.id];
  for (;;) {
    const next = needs.get(chain.at(-1)!)!.find((need) => left.has(need))!;
    const at = chain.indexOf(next);
    if (at >= 0) {
      const cycle = [...chain.slice(at), next];
      return `a cycle: "${cycle[0]}" waits for ${cycle
        .slice(1)
        .map((id) => `"${id}"`)
        .join(', which waits for ')}`;
    }
    chain.push(next);
  }
}
