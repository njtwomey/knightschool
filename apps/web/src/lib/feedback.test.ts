import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTimers } from './feedback';

describe('createTimers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs what was asked for later', () => {
    const timers = createTimers();
    const run = vi.fn();
    timers.later(100, run);
    vi.advanceTimersByTime(99);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledOnce();
  });

  it('cancels everything still pending when cleared, and only its own', () => {
    const one = createTimers();
    const two = createTimers();
    const first = vi.fn();
    const second = vi.fn();
    one.later(100, first);
    one.later(200, first);
    two.later(100, second);
    one.clear();
    vi.advanceTimersByTime(500);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
