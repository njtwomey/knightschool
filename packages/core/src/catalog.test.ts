import { describe, expect, it } from 'vitest';
import {
  allLines,
  courseProgress,
  filterCourses,
  inStudyOrder,
  matchReason,
  matchesText,
  nextCourses,
  relevance,
  roleOf,
  searchLines,
  type CatalogFilter,
} from './catalog';
import type { OpeningIndexEntry } from './schema/content';

const line = (id: string, name: string, over: Partial<OpeningIndexEntry['lines'][number]> = {}) => ({
  id,
  name,
  kind: 'line' as const,
  opponent: '',
  alternative: false,
  epd: '',
  epds: [],
  alsoIn: [],
  ...over,
});

const course = (over: Partial<OpeningIndexEntry>): OpeningIndexEntry => ({
  id: 'x',
  name: 'X',
  side: 'white',
  opening: 'x',
  tier: 1,
  trigger: '1. e4',
  summary: '',
  about: { idea: '', risks: '', suits: '' },
  plans: [],
  motifs: [],
  tags: [],
  order: 0,
  variants: 1,
  cards: 10,
  keyEpd: '',
  lines: [],
  ...over,
});

const courses = [
  course({
    id: 'caro-black',
    name: 'Caro-Kann Defence',
    side: 'black',
    opening: 'caro-kann',
    order: 3,
    tier: 3,
    lines: [line('classical', 'Classical Variation'), line('advance', 'Advance Variation', { opponent: '3.e5' })],
  }),
  course({
    id: 'caro-white',
    name: 'Caro-Kann: Advance Variation',
    opening: 'caro-kann',
    order: 2,
    tier: 2,
    summary: 'White pushes e5 against the Caro-Kann.',
    lines: [line('short', 'Advance, Short System')],
  }),
  course({
    id: 'italian',
    name: 'Italian Game',
    opening: 'italian',
    order: 0,
    tier: 1,
    lines: [line('gp', 'Giuoco Piano'), line('trap', 'Blackburne Shilling', { kind: 'refutation' })],
  }),
];
const openings = [
  { id: 'caro-kann', side: 'black' as const },
  { id: 'italian', side: 'white' as const },
];
const base: CatalogFilter = { query: '', side: 'all', tier: 'all', role: 'all', scope: 'all' };
const ids = (list: OpeningIndexEntry[]) => list.map((c) => c.id);

describe('study order and filters', () => {
  it('lists courses in the order of the curriculum', () => {
    expect(ids(inStudyOrder(courses))).toEqual(['italian', 'caro-white', 'caro-black']);
    expect(ids(filterCourses(courses, base, openings))).toEqual(['italian', 'caro-white', 'caro-black']);
  });

  it('filters by side, tier and role', () => {
    expect(ids(filterCourses(courses, { ...base, side: 'black' }, openings))).toEqual(['caro-black']);
    expect(ids(filterCourses(courses, { ...base, tier: 2 }, openings))).toEqual(['caro-white']);
    // Playing the Caro-Kann is the Black course; the White Advance course plays against it.
    expect(roleOf(courses[0]!, openings)).toBe('play');
    expect(roleOf(courses[1]!, openings)).toBe('against');
    expect(ids(filterCourses(courses, { ...base, role: 'against' }, openings))).toEqual(['caro-white']);
    expect(ids(filterCourses(courses, { ...base, role: 'play' }, openings))).toEqual(['italian', 'caro-black']);
  });

  it('matches every search word against the name, summary, trigger and lines', () => {
    expect(ids(filterCourses(courses, { ...base, query: 'giuoco' }, openings))).toEqual(['italian']);
    expect(ids(filterCourses(courses, { ...base, query: 'caro advance' }, openings))).toEqual([
      'caro-white',
      'caro-black',
    ]);
    expect(filterCourses(courses, { ...base, query: 'zzz' }, openings)).toEqual([]);
  });
});

describe('forgiving search', () => {
  const gambit = course({
    id: 'qgd',
    name: "Queen's Gambit Declined",
    lines: [line('orthodox', "Queen's Gambit, Orthodox")],
  });
  const caro = course({ id: 'caro', name: 'Caro-Kann Defence', lines: [line('exchange', 'Exchange Variation')] });
  const both = [gambit, caro];

  it("finds Queen's Gambit however the apostrophe and plural are typed", () => {
    for (const query of ["queen's", 'queens', 'Queens Gambit', 'queen', "QUEEN'S gambit", 'queens’ gambit']) {
      expect(ids(filterCourses(both, { ...base, query }, openings)), query).toEqual(['qgd']);
    }
    expect(searchLines(both, 'queens gambit').map((hit) => hit.line.id)).toEqual(['orthodox']);
  });

  it('reads hyphens, spaces and accents alike', () => {
    for (const query of ['caro-kann', 'caro kann', 'Caro Kann', 'cäro']) {
      expect(ids(filterCourses(both, { ...base, query }, openings)), query).toEqual(['caro']);
    }
  });

  it('ranks a plural or apostrophe-free name as a whole-word match', () => {
    expect(relevance("Queen's Gambit Declined", '', 'queens')).toBeGreaterThanOrEqual(60);
    expect(relevance("Queen's Gambit Declined", '', 'queens gambit')).toBeGreaterThan(0);
    expect(matchReason(gambit, 'queens gambit')).toEqual({ kind: 'name' });
  });

  it('does not match unrelated words', () => {
    expect(filterCourses(both, { ...base, query: 'queens rook' }, openings)).toEqual([]);
  });
});

describe('searching lines', () => {
  it('finds lines by name or by what the opponent plays, and nothing for an empty search', () => {
    expect(
      searchLines(courses, 'advance')
        .map((hit) => hit.line.id)
        .sort(),
    ).toEqual(['advance', 'short']);
    expect(searchLines(courses, '3.e5').map((hit) => hit.line.id)).toEqual(['advance']);
    expect(searchLines(courses, '  ')).toEqual([]);
    expect(searchLines(courses, 'blackburne')[0]!.line.kind).toBe('refutation');
  });

  it('lists every line in study order', () => {
    expect(allLines(courses).map((hit) => hit.line.id)).toEqual(['gp', 'trap', 'short', 'classical', 'advance']);
  });
});

describe('progress and what to take next', () => {
  it('sums learned cards over courses', () => {
    expect(courseProgress(courses, { italian: 4, 'caro-white': 1 })).toEqual({ learned: 5, total: 30 });
  });

  it('suggests unstarted courses whose prerequisites are started, in study order', () => {
    const prerequisites = { 'caro-white': ['italian'], 'caro-black': [] };
    expect(ids(nextCourses(courses, prerequisites, {}))).toEqual(['italian', 'caro-black']);
    expect(ids(nextCourses(courses, prerequisites, { italian: 3 }))).toEqual(['caro-white', 'caro-black']);
  });
});

describe('relevance and why a course matched', () => {
  it('ranks a name match above a content match, and the whole name highest', () => {
    const scores = [
      relevance('Advance Variation', '', 'advance variation'),
      relevance('Advance Variation, Short', '', 'advance'),
      relevance('Caro-Kann Defence', 'the advance variation', 'advance'),
    ];
    expect(scores[0]).toBeGreaterThan(scores[1]!);
    expect(scores[1]).toBeGreaterThan(scores[2]!);
    expect(scores[2]).toBeGreaterThan(0);
  });

  it('is zero for no match and equal for an empty search', () => {
    expect(relevance('Scotch Game', 'opens the centre', 'zzz')).toBe(0);
    expect(relevance('Scotch Game', '', '  ')).toBe(relevance('Italian Game', '', ''));
  });

  it('says whether the name, a line inside, or only the text matched', () => {
    const [black] = courses;
    expect(matchReason(black!, '')).toBeUndefined();
    expect(matchReason(black!, 'classical')).toEqual({ kind: 'lines', names: ['Classical Variation'] });
    expect(matchReason(black!, 'caro')).toEqual({ kind: 'name' });
    expect(matchReason(black!, 'zzz')).toEqual({ kind: 'text' });
  });
});

describe('matchesText', () => {
  it('needs every word, ignoring case, apostrophes and a plural s', () => {
    expect(matchesText('queens gambit', "The Queen's Gambit")).toBe(true);
    expect(matchesText('FORKS', 'A fork attacks two pieces')).toBe(true);
    expect(matchesText('fork rook', 'A fork attacks two pieces')).toBe(false);
    expect(matchesText('', 'anything')).toBe(true);
  });
});
