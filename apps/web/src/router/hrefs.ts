import { RESERVED_LINE_ID } from '@knightschool/core';

/**
 * The site's addresses: each page's tabs (their names and what they are for, shown at the end of the breadcrumbs), the
 * functions that build an address and the ones that read the parts of one. Build every link with these, never by hand.
 */

/** Profile's tabs: what is due and how far through your courses you are, how you are doing, and your settings. */
export const PROFILE_TABS = [
  { tab: 'overview', name: 'Overview', blurb: 'What is due today and how far through your courses you are.' },
  { tab: 'stats', name: 'Stats', blurb: 'How you are doing: your answers, Name That Opening and Speed.' },
  { tab: 'settings', name: 'Settings', blurb: 'Appearance, the board, training, the explorer and your data.' },
] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number]['tab'];

/** `/profile` (the overview) or `/profile/<tab>`. */
export const profileHref = (tab: ProfileTab = 'overview') => (tab === 'overview' ? '/profile' : `/profile/${tab}`);

/** The quiz, starting the scheduled session at once (`#start=due`), for links that say "start the quiz". */
export const dueQuizHref = () => '/quiz#start=due';

/** A course page's views: the overview (introduction, board and lines), the study path in units, and its tree. */
export const COURSE_TABS = [
  { tab: 'overview', name: 'Overview', blurb: 'What the course is for, its plans and its lines.' },
  { tab: 'path', name: 'Path', blurb: 'The course in small units, in the order to study them, with your progress.' },
  { tab: 'tree', name: 'Tree', blurb: 'Every line of the course as one tree of moves.' },
] as const;
export type CourseTab = (typeof COURSE_TABS)[number]['tab'];

/** `/course/<course>` (its overview) or `/course/<course>/<tab>`. */
export const courseHref = (course: string, tab: CourseTab = 'overview') =>
  tab === 'overview' ? `/course/${course}` : `/course/${course}/${tab}`;

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

/** `/play/<course>/all/branches`: the every-branch drill of a whole course. */
export const branchesHref = (course: string) => `/play/${course}/${RESERVED_LINE_ID}/branches`;

/** Reads the last part of a line's address; an old `practice` link is the Drill tab, and anything else is About. */
export function parseLineTab(segment: string | undefined): LineTab {
  if (segment === 'learn' || segment === 'quiz' || segment === 'drill' || segment === 'tree') return segment;
  if (segment === 'practice') return 'drill';
  return 'about';
}

/** An authored course's pages in Create: its details, its lines, its path and publishing. */
export const CREATE_TABS = [
  { tab: 'details', name: 'Details', blurb: 'Name, side, introduction, plans, motifs and groups.' },
  { tab: 'lines', name: 'Lines', blurb: 'Every line of the course: add, rename, copy, delete, open to edit.' },
  { tab: 'path', name: 'Path', blurb: 'The order to study the lines in, and what is a bonus.' },
  { tab: 'publish', name: 'Publish', blurb: 'Propose the course for the app.' },
] as const;
export type CreateTab = (typeof CREATE_TABS)[number]['tab'];

const CREATE_TAB_NAMES: readonly string[] = CREATE_TABS.map((item) => item.tab);
/** Is this the last part of a course's address in Create a tab (rather than a line)? */
export const isCreateTab = (segment: string): segment is CreateTab => CREATE_TAB_NAMES.includes(segment);

/** `/create/<course>` (its details) or `/create/<course>/<tab>`. */
export const createHref = (course: string, tab: CreateTab = 'details') =>
  tab === 'details' ? `/create/${course}` : `/create/${course}/${tab}`;

/** `/create/<course>/<line>`: the line editor. */
export const lineEditHref = (course: string, line: string) => `/create/${course}/${line}`;
