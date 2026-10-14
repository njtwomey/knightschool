import type { OpeningManifest } from '@knightschool/core';

/** A valid course.yaml for tests: name, side and the file names of lines and traps are the usual things to vary. */
export function testManifest(
  over: Partial<Omit<OpeningManifest, 'lines' | 'traps'>> & { lines?: string[]; traps?: string[] } = {},
): OpeningManifest {
  const { lines = ['main'], traps = [], ...rest } = over;
  return {
    name: 'T',
    eco: 'C20',
    side: 'white',
    opening: 't',
    tier: 1,
    trigger: '',
    summary: 'x',
    plans: [],
    motifs: [],
    tags: [],
    ...rest,
    lines: lines.map((file) => ({ file, opponent: 'x', kind: 'main' as const, alternative: false })),
    traps: traps.map((file) => ({ file, opponent: 'x', kind: 'for-us' as const })),
  };
}
