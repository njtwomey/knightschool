import { describe, expect, it } from 'vitest';
import { stepKey, stepTarget, type StepAction } from './line-stepper';

const key = (name: string, extra: Partial<Parameters<typeof stepKey>[0]> = {}) => ({
  key: name,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  defaultPrevented: false,
  target: null,
  ...extra,
});

describe('stepKey', () => {
  it.each([
    ['ArrowLeft', 'prev'],
    ['ArrowRight', 'next'],
    ['Home', 'first'],
    ['End', 'last'],
    ['ArrowUp', null],
    ['a', null],
  ] as const)('%s steps %s', (name, action) => {
    expect(stepKey(key(name))).toBe(action);
  });

  it.each([
    ['alt', { altKey: true }],
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['a handled key', { defaultPrevented: true }],
  ])('ignores %s', (_, extra) => {
    expect(stepKey(key('ArrowRight', extra))).toBeNull();
  });
});

describe('stepTarget', () => {
  const cases: [StepAction, number, number, number, number][] = [
    // action, index, length, min, expected
    ['next', 0, 5, 0, 1],
    ['next', 5, 5, 0, 5],
    ['prev', 3, 5, 0, 2],
    ['prev', 0, 5, 0, 0],
    ['first', 4, 5, 0, 0],
    ['last', 1, 5, 0, 5],
    // A unit that starts part-way along: never before its first position.
    ['prev', 2, 5, 2, 2],
    ['first', 4, 5, 2, 2],
    // Off the line (a tree cursor not on the picked line): the next step is its start.
    ['next', -1, 5, 0, 0],
  ];
  it.each(cases)('%s from %i of %i (min %i) lands on %i', (action, index, length, min, expected) => {
    expect(stepTarget(action, index, length, min)).toBe(expected);
  });
});
