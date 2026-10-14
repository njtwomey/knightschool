import { describe, expect, it } from 'vitest';
import { familyProgress, filterFamilies, groupFamilies, matchReason, relevance, roleOf, searchLines } from './catalog';
import type { Family, OpeningIndexEntry } from './schema/content';

const course = (over: Partial<OpeningIndexEntry>): OpeningIndexEntry => ({
  id: 'x',
  name: 'X',
  eco: 'A00',
  side: 'white',
  level: 'beginner',
  summary: '',
  tags: [],
  variants: 1,
  cards: 10,
  keyEpd: '',
  lines: [],
  ...over,
});

const courses = [
  course({
    id: 'caro',
    name: 'Caro-Kann Defence',
    side: 'black',
    family: 'caro-kann',
    eco: 'B12',
    lines: [
      { id: 'classical', name: 'Classical Variation', kind: 'line', epd: '', epds: [] },
      { id: 'advance', name: 'Advance Variation', kind: 'line', epd: '', epds: [] },
    ],
  }),
  course({
    id: 'caro-2k',
    name: 'Caro-Kann: Two Knights Attack',
    side: 'white',
    family: 'caro-kann',
    against: 'Caro-Kann Defence',
    eco: 'B11',
    lines: [{ id: 'bg4', name: 'Two Knights, 3...Bg4', kind: 'line', epd: '', epds: [] }],
  }),
  course({
    id: 'caro-adv',
    name: 'Caro-Kann: Advance Variation',
    side: 'white',
    family: 'caro-kann',
    against: 'Caro-Kann Defence',
    eco: 'B12',
    lines: [{ id: 'short', name: 'Advance, Short System', kind: 'line', epd: '', epds: [] }],
  }),
  course({
    id: 'italian',
    name: 'Italian Game',
    side: 'white',
    family: 'italian',
    eco: 'C50',
    summary: 'Aims at f7.',
    lines: [
      { id: 'gp', name: 'Giuoco Pianissimo', kind: 'line', epd: '', epds: [] },
      { id: 'bs', name: 'Blackburne Shilling Gambit', kind: 'refutation', epd: '', epds: [] },
    ],
  }),
];

const families: Family[] = [
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defence',
    eco: 'B10-B19',
    summary: '1.e4 c6, solid.',
    moves: '1. e4 c6',
    epd: 'x',
    courses: ['caro-2k', 'caro-adv', 'caro'],
  },
  {
    id: 'italian',
    name: 'Italian Game',
    summary: 'Quiet and classical.',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    epd: 'y',
    courses: ['italian'],
  },
];

const views = groupFamilies(courses, families);
const ids = (filter: Partial<Parameters<typeof filterFamilies>[1]>) =>
  filterFamilies(views, { query: '', role: 'all', side: 'all', scope: 'all', ...filter }).map((view) => [
    view.family.id,
    view.courses.map((c) => c.id),
  ]);

describe('catalog', () => {
  it('groups courses under their opening, playing it first and then the systems against it', () => {
    expect(views[0]!.courses.map((c) => c.id)).toEqual(['caro', 'caro-adv', 'caro-2k']);
    expect(roleOf(courses[0]!)).toBe('play');
    expect(roleOf(courses[1]!)).toBe('against');
  });

  it('filters by whether you play the opening or play against it', () => {
    expect(ids({ role: 'against' })).toEqual([['caro-kann', ['caro-adv', 'caro-2k']]]);
    expect(ids({ role: 'play' })).toEqual([
      ['caro-kann', ['caro']],
      ['italian', ['italian']],
    ]);
  });

  it('filters by side, and drops openings with nothing left', () => {
    expect(ids({ side: 'black' })).toEqual([['caro-kann', ['caro']]]);
    expect(ids({ side: 'black', role: 'against' })).toEqual([]);
  });

  it('searches an opening by its own text or any of its courses', () => {
    expect(ids({ query: 'caro' }).map(([id]) => id)).toEqual(['caro-kann']);
    expect(ids({ query: 'f7' }).map(([id]) => id)).toEqual(['italian']);
    expect(ids({ query: 'two knights' }).map(([id]) => id)).toEqual(['caro-kann']);
    expect(ids({ query: 'caro italian' })).toEqual([]);
  });

  it('finds variations in their own right, labelled by their course and opening', () => {
    const hits = searchLines(views, 'advance');
    expect(hits.map((hit) => [hit.course.id, hit.line.id])).toEqual([
      ['caro', 'advance'],
      ['caro-adv', 'short'],
    ]);
    expect(searchLines(views, 'bg4').map((hit) => hit.line.name)).toEqual(['Two Knights, 3...Bg4']);
    expect(searchLines(views, 'blackburne')[0]!.line.kind).toBe('refutation');
  });

  it('puts a name match before a looser match, and finds nothing for an empty search', () => {
    expect(searchLines(views, 'advance variation')[0]!.line.name).toBe('Advance Variation');
    expect(searchLines(views, '  ')).toEqual([]);
    expect(searchLines(views, 'zzz')).toEqual([]);
  });

  it('respects the filters when searching variations', () => {
    const against = filterFamilies(views, { query: '', role: 'against', side: 'all', scope: 'all' });
    expect(searchLines(against, 'advance').map((hit) => hit.course.id)).toEqual(['caro-adv']);
  });

  it('adds up progress across the courses of an opening', () => {
    expect(familyProgress(courses.slice(0, 3), { caro: 4, 'caro-2k': 2 })).toEqual({ learned: 6, total: 30 });
  });
});

describe('relevance', () => {
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

  it('finds every word, in any order, in the name', () => {
    expect(relevance('Two Knights Defence', '', 'defence knights')).toBe(60);
  });
});

describe('matchReason', () => {
  const [view] = groupFamilies(courses, families);
  it('says whether the name, a line inside, or only the text matched', () => {
    expect(matchReason(view!, '')).toBeUndefined();
    expect(matchReason(view!, 'classical')).toEqual({ kind: 'lines', names: ['Classical Variation'] });
    expect(matchReason(view!, view!.family.name.split(' ')[0]!)).toEqual({ kind: 'name' });
    expect(matchReason(view!, 'zzz')).toEqual({ kind: 'text' });
  });
});
