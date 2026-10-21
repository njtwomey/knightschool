/**
 * A line has one page with five tabs, chosen at the end of the breadcrumbs: About (what the line is), Learn (play
 * through it with every move shown), Drill (play your side from memory, the computer answers), Quiz (its positions,
 * shuffled) and Tree (the course's tree of moves with this line picked out). The tab is the last part of the address:
 * /play/<course>/<line>/<tab>.
 */
export type LineTab = 'about' | 'learn' | 'drill' | 'quiz' | 'tree';

export const LINE_TABS: { tab: LineTab; name: string; blurb: string }[] = [
  {
    tab: 'about',
    name: 'About',
    blurb: 'What the line is for, where it grows from, and its moves with their reasons.',
  },
  { tab: 'learn', name: 'Learn', blurb: 'You play both sides. Every move is shown first.' },
  { tab: 'drill', name: 'Drill', blurb: 'The computer plays the other side. Recall your moves.' },
  { tab: 'quiz', name: 'Quiz', blurb: "The line's positions in random order: find the move." },
  { tab: 'tree', name: 'Tree', blurb: "The course's tree of moves, with this line picked out." },
];

/** One unit of a course's study path (its number within the line), or some of its moves (1-based, inclusive). */
export type UnitRef = { n: number; first?: number; last?: number };

/** Reads `<n>` and `<first>-<last>` after a Learn or Drill address; anything else is no unit. */
export function parseUnitRef(n: string | undefined, moves: string | undefined): UnitRef | undefined {
  if (!n || !/^[1-9]\d*$/.test(n)) return undefined;
  const range = moves?.match(/^([1-9]\d*)-([1-9]\d*)$/);
  return range ? { n: Number(n), first: Number(range[1]), last: Number(range[2]) } : { n: Number(n) };
}

/** The address of a line's tab. Learn and Drill can be scoped to a unit of the study path. */
export function lineHref(course: string, line: string, tab: LineTab = 'about', unit?: UnitRef): string {
  const base = `/play/${course}/${line}/${tab}`;
  if (!unit || (tab !== 'learn' && tab !== 'drill')) return base;
  return unit.first !== undefined && unit.last !== undefined
    ? `${base}/${unit.n}/${unit.first}-${unit.last}`
    : `${base}/${unit.n}`;
}

/** Reads the last part of a line's address; an old `practice` link is the Drill tab, and anything else is About. */
export function parseLineTab(segment: string | undefined): LineTab {
  if (segment === 'learn' || segment === 'quiz' || segment === 'drill' || segment === 'tree') return segment;
  if (segment === 'practice') return 'drill';
  return 'about';
}
