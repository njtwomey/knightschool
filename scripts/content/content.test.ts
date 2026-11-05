import { describe, expect, it } from 'vitest';
import { loadContent } from './load.ts';

/** The real content builds: every file checks, every line resolves, every opening builds. */
describe('content/', () => {
  const content = loadContent();

  it('builds every opening', () => {
    expect(content.openings.length).toBeGreaterThan(0);
    for (const opening of content.openings) {
      expect(opening.steps.length).toBeGreaterThan(0);
      expect(Object.keys(opening.positions).length).toBeGreaterThan(0);
    }
  });

  it('gives the Italian example its variations, a refutation and a trap', () => {
    const italian = content.openings.find((opening) => opening.id === 'italian-white')!;
    expect(italian.variations.map((variation) => variation.id)).toContain('traps');
    const refuted = Object.values(italian.positions).flatMap((position) => position.refutations ?? []);
    expect(refuted.map((refutation) => refutation.san)).toContain('Ng5');
    expect(italian.lines.find((line) => line.id === 'legal-mate')?.kind).toBe('trap');
    expect(italian.questions.map((question) => question.id)).toContain('why-nxe5-works');
  });
});
