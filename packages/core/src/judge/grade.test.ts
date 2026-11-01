import { describe, expect, it } from 'vitest';
import { siteConfig } from '../testing/site-config';
import { gradeOf } from './grade';

const cutoffs = siteConfig.judge.grades;

describe('grades', () => {
  it.each([
    [0, 'best'],
    [0.02, 'excellent'],
    [0.07, 'good'],
    [0.15, 'inaccuracy'],
    [0.25, 'mistake'],
    [0.6, 'blunder'],
  ] as const)('a drop of %f is %s', (drop, grade) => expect(gradeOf({ drop, mate: null }, cutoffs)).toBe(grade));

  it('allowing a mate is a blunder whatever the drop', () => {
    expect(gradeOf({ drop: 0, mate: 'allowed' }, cutoffs)).toBe('blunder');
  });
});
