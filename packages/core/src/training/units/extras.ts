import { pathFromUcis, positionsAlong } from '../../navigation/content-walk';
import type { OpeningContent } from '../../schema/content';
import type { CourseUnit, UnitStretch } from './types';

/** The positions a stretch passes through: where it starts, and after each of its moves. */
export function stretchPositions(content: OpeningContent, stretch: Pick<UnitStretch, 'moves' | 'from'>): string[] {
  return positionsAlong(content, pathFromUcis(content, stretch.moves)).slice(stretch.from);
}

/**
 * Quizzes and traps go to the first unit whose stretches reach their position (for a trap, where it leaves), unless
 * course.yaml `units.place` puts one with a later unit. Strict (the build): a placement naming no trap or quiz, no unit,
 * or a unit before the natural one throws; otherwise such a placement is ignored.
 */
export function attachExtras(
  content: OpeningContent,
  units: CourseUnit[],
  place: Record<string, string> = {},
  strict = false,
) {
  const reached = (from?: number) =>
    units.map(
      (unit) =>
        new Set(
          unit.stretches.flatMap((stretch) =>
            stretchPositions(content, { moves: stretch.moves, from: from ?? stretch.from }),
          ),
        ),
    );
  const stretches = reached();
  const wholePaths = reached(0);
  // Each trap's positions, with the unit it leaves from.
  const trapAt = new Map<string, number>();
  const traps: { positions: Set<string>; unit: number }[] = [];
  for (const trap of content.opening.variants.filter((variant) => variant.kind === 'refutation')) {
    const positions = stretchPositions(content, { moves: trap.mainLine, from: 0 });
    for (let p = positions.length - 1; p >= 0; p--) {
      const i = stretches.findIndex((set) => set.has(positions[p]!));
      if (i >= 0) {
        trapAt.set(trap.id, i);
        traps.push({ positions: new Set(positions), unit: i });
        break;
      }
    }
  }
  // A quiz goes with the unit that reaches its position, else with the trap it is about, else with a unit on the way.
  const quizAt = new Map<string, number>();
  for (const quiz of content.quizzes) {
    let at = stretches.findIndex((set) => set.has(quiz.epd));
    if (at < 0) at = traps.find((trap) => trap.positions.has(quiz.epd))?.unit ?? -1;
    if (at < 0) at = wholePaths.findIndex((set) => set.has(quiz.epd));
    if (at >= 0) quizAt.set(quiz.id, at);
  }

  const index = new Map(units.map((unit, i) => [unit.id, i]));
  const trapIds = new Set(content.opening.variants.filter((variant) => variant.kind === 'refutation').map((v) => v.id));
  const quizIds = new Set(content.quizzes.map((quiz) => quiz.id));
  const fail = (message: string) => {
    if (strict) throw new Error(`units.place: ${message}`);
  };
  for (const [item, unitId] of Object.entries(place)) {
    const maps = [...(trapIds.has(item) ? [trapAt] : []), ...(quizIds.has(item) ? [quizAt] : [])];
    if (maps.length === 0) {
      fail(`"${item}" is not a trap or a quiz of this course`);
      continue;
    }
    const target = index.get(unitId);
    if (target === undefined) {
      fail(`"${unitId}" is not a unit of this course (with the default card settings)`);
      continue;
    }
    for (const map of maps) {
      const natural = map.get(item);
      if (natural !== undefined && target < natural) {
        fail(`"${item}" cannot come before "${units[natural]!.id}", the first unit to reach its position`);
        continue;
      }
      map.set(item, target);
    }
  }
  for (const [id, at] of trapAt) units[at]!.traps.push(id);
  // Quizzes keep the course's order within a unit.
  for (const quiz of content.quizzes) {
    const at = quizAt.get(quiz.id);
    if (at !== undefined) units[at]!.quizzes.push(quiz.id);
  }
}
