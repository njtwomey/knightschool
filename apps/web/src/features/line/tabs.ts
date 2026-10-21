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

/** The address of a line's tab. */
export const lineHref = (course: string, line: string, tab: LineTab = 'about') => `/play/${course}/${line}/${tab}`;

/** Reads the last part of a line's address; an old `practice` link is the Drill tab, and anything else is About. */
export function parseLineTab(segment: string | undefined): LineTab {
  if (segment === 'learn' || segment === 'quiz' || segment === 'drill' || segment === 'tree') return segment;
  if (segment === 'practice') return 'drill';
  return 'about';
}
