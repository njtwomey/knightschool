import { describe, expect, it } from 'vitest';
import { siteConfig } from '../testing/site-config';

describe('content/config.yaml', () => {
  it('parses, and its grade cut-offs rise in order', () => {
    const { best, excellent, good, inaccuracy, mistake } = siteConfig.judge.grades;
    expect([best, excellent, good, inaccuracy, mistake]).toEqual([best, excellent, good, inaccuracy, mistake].sort());
    const { equal, littleBetter, clearlyBetter } = siteConfig.judge.evalWords;
    expect(equal < littleBetter && littleBetter < clearlyBetter).toBe(true);
  });
});
