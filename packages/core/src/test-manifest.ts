import type { OpeningManifest } from './schema/content';

/** A valid course.yaml for tests. `lines` and `traps` are just file names here; each becomes a main line or for-us trap. */
export function manifestOf(
  over: Partial<Omit<OpeningManifest, 'lines' | 'traps'>> & { lines?: string[]; traps?: string[] } = {},
): OpeningManifest {
  const { lines = ['main'], traps = [], ...rest } = over;
  return {
    name: 'Test Opening',
    eco: 'C20',
    side: 'white',
    opening: 'test',
    tier: 1,
    trigger: '',
    summary: 'x',
    about: { idea: 'x', risks: 'x', suits: 'x' },
    plans: [],
    motifs: [],
    tags: [],
    ...rest,
    lines: lines.map((file) => ({ file, opponent: 'x', kind: 'main' as const, alternative: false })),
    traps: traps.map((file) => ({ file, opponent: 'x', kind: 'for-us' as const })),
  };
}
