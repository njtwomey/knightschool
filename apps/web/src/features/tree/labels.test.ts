import { describe, expect, it } from 'vitest';
import { branchName, familyOf, homeCourse, matchingLines } from './labels';
import type { TreeChapter } from './use-move-tree';

const chapter = (id: string, name: string, opening: string, courses: string[] = []): TreeChapter => ({
  id,
  name,
  opening,
  courses,
  side: 'white',
  parent: null,
  after: null,
  from: 'x',
  ply: 0,
  moves: [],
  source: `${id}.pgn`,
});

const chapters = new Map(
  [
    chapter('short-system', 'Short Variation', 'Caro-Kann Defence: Advance Variation', ['caro-kann']),
    chapter('hillbilly', 'Hillbilly Attack', 'Caro-Kann Defence', ['caro-kann', 'vs-c6']),
    chapter('alapin', 'Alapin Variation', 'Sicilian Defense: Alapin Variation', ['sicilian']),
  ].map((c) => [c.id, c]),
);

describe('familyOf and branchName', () => {
  it('names the opening without its subvariation', () => {
    expect(familyOf(chapters.get('short-system')!)).toBe('Caro-Kann Defence');
    expect(familyOf(chapter('x', 'Mieses Opening', ''))).toBe('Mieses Opening');
  });

  it('names a branch by the opening most of its lines are in', () => {
    expect(branchName(['short-system', 'hillbilly'], chapters)).toBe('Caro-Kann Defence');
    expect(branchName(['short-system', 'hillbilly', 'alapin'], chapters)).toBe('Caro-Kann Defence and more');
    expect(branchName(['unknown'], chapters)).toBe('');
  });
});

describe('homeCourse', () => {
  it('prefers the course asked for when it lists the line', () => {
    expect(homeCourse(chapters.get('hillbilly')!, 'vs-c6')).toBe('vs-c6');
    expect(homeCourse(chapters.get('hillbilly')!, 'sicilian')).toBe('caro-kann');
    expect(homeCourse(chapter('lonely', 'Lonely', ''))).toBeNull();
  });
});

describe('matchingLines', () => {
  it('finds lines by name with their opening, id or course name', () => {
    expect(matchingLines('caro short', chapters.values())).toEqual(['short-system']);
    expect(matchingLines('hillbilly', chapters.values())).toEqual(['hillbilly']);
    expect(matchingLines('the c6 course', chapters.values(), (id) => (id === 'vs-c6' ? 'The c6 course' : id))).toEqual([
      'hillbilly',
    ]);
    expect(matchingLines(' ', chapters.values())).toEqual([]);
  });
});
