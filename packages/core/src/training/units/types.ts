import type { LineKind, TrapKind, Variant } from '../../schema/content';
import type { CardDefinition, CardOptions } from '../cards';

/** About this many of the learner's own moves make one unit: one sitting. */
export const UNIT_SIZE = 4;
/** A unit is graduated when every card's interval has reached this many days. */
export const GRADUATED_DAYS = 7;

/** What a unit is about: the kind of the line it belongs to. */
export type UnitKind = LineKind | TrapKind;

/**
 * A run of moves to play: `moves` (UCI) from the start position, of which the first `from` lead to where it begins and
 * are played for you. `plies` are the indices in `moves` of the learner's own moves that are the unit's cards.
 */
export type UnitStretch = { moves: string[]; from: number; plies: number[] };

/**
 * One step of a course's study path: about four of the learner's own moves, in one stretch of a line, or (`side`) in
 * a few short stretches where the opponent leaves the same unit in different ways.
 *
 * The learner's moves (`cards`) are the core of the unit: they are its review cards. Quizzes and traps are attached to
 * it as supplementary material, shown while studying but never required.
 */
export type CourseUnit = {
  /** `<line>:<n>`: stable while the course's lines stay as they are. */
  id: string;
  /** The line (variant id) the unit belongs to. A branch inside a line's file belongs to that line. */
  line: string;
  /** 1 for the line's first unit, 2 for its next, and so on, across all the line's branches. */
  n: number;
  /** Place in the path, from 0. */
  index: number;
  kind: UnitKind;
  /** True for the first unit of a branch: it starts where it leaves the units before it. */
  branch: boolean;
  /** True for a group of short branches (other replies) leaving the same unit. */
  side: boolean;
  /** One stretch, or one per short branch of a side unit. */
  stretches: UnitStretch[];
  /** The learner's core moves, stretch by stretch in the order played: one card each. */
  cards: CardDefinition[];
  /** Units to pass first. */
  prerequisites: string[];
  /** Supplementary: quiz ids about positions in the stretch. */
  quizzes: string[];
  /** Supplementary: traps (variant ids) that leave the tree from the stretch. */
  traps: string[];
};

export type UnitOptions = CardOptions & {
  size?: number;
  /**
   * How course.yaml `units:` is applied. Strict (the build, with the default card settings): an unknown id, a cycle or an
   * impossible order throws. Otherwise (the app, whose card settings may cut other units): entries naming units that do
   * not exist are skipped, and if what is left still fails the default path is kept.
   */
  strict?: boolean;
};

/** How much a kind of line matters on the path: lower comes first. */
export const KIND_RANK: Record<UnitKind, number> = {
  main: 0,
  gambit: 0,
  sideline: 1,
  'against-us': 1,
  rare: 2,
  'for-us': 3,
};

/** Is a variant's own line something the learner drills (rather than only sees)? */
export const drilledVariant = (variant: Variant | undefined) =>
  !!variant && !variant.alternative && (variant.kind === 'line' || variant.whose === 'against-us');

export const kindOf = (variant: Variant | undefined): UnitKind => variant?.weight ?? variant?.whose ?? 'rare';

/** Lexicographic comparison of two sort keys. */
export function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}
