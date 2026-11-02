import { describe, expect, it } from 'vitest';
import { stepState } from './states';
import { checkpointRef, finalTestRef, stepTestOutRef, testedOutSteps } from './test-out';

const opening = {
  id: 'italian',
  steps: [
    { id: 'a:1', variation: 'piano' },
    { id: 'a:2', variation: 'piano' },
    { id: 'b:1', variation: 'two-knights' },
    { id: 'b:2', variation: 'two-knights' },
  ],
};

describe('testing out', () => {
  it('knows nothing from no attempts, or from checks not passed', () => {
    expect(testedOutSteps(opening, [])).toEqual(new Set());
    const failed = [{ mode: 'checkpoint', ref: checkpointRef('italian', 'piano'), result: 'wrong' }];
    expect(testedOutSteps(opening, failed)).toEqual(new Set());
  });
  it('knows every step of a variation whose checkpoint was cleared, once is enough', () => {
    const attempts = [
      { mode: 'checkpoint', ref: checkpointRef('italian', 'piano'), result: 'right' },
      { mode: 'checkpoint', ref: checkpointRef('italian', 'piano'), result: 'wrong' },
      { mode: 'checkpoint', ref: checkpointRef('other', 'two-knights'), result: 'right' },
    ];
    expect(testedOutSteps(opening, attempts)).toEqual(new Set(['a:1', 'a:2']));
  });
  it('knows one step from its own test-out, and every step from the final test', () => {
    expect(testedOutSteps(opening, [{ mode: 'try', ref: stepTestOutRef('italian', 'b:1'), result: 'right' }])).toEqual(
      new Set(['b:1']),
    );
    expect(testedOutSteps(opening, [{ mode: 'checkpoint', ref: finalTestRef('italian'), result: 'right' }]).size).toBe(
      4,
    );
  });
  it('makes a tested-out step known, but mastered still wins', () => {
    expect(stepState(['open', 'learning'], false, true, true)).toBe('known');
    expect(stepState(['mastered', 'mastered'], true, true, true)).toBe('mastered');
    expect(stepState(['open'], false, true, false)).toBe('locked');
  });
});
