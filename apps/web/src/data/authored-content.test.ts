import { describe, expect, it, vi } from 'vitest';

const pgn = (id: string, moves: string, extra = '') => `[Event "Knight School"]
[Opening "Italian Game"]
[Variation "${id}"]
[ECO "C50"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]
[For "white"]
[Kind "main"]
[Opponent "1...e5"]
${extra}

${moves} *
`;

const shippedIndex = [
  {
    id: 'italian-game',
    name: 'Italian',
    side: 'white',
    opening: 'italian-game',
    tier: 1,
    trigger: '',
    summary: 'x',
    about: { idea: 'x', risks: 'x', suits: 'x' },
    plans: [],
    motifs: [],
    tags: [],
    order: 3,
    variants: 1,
    cards: 3,
    keyEpd: 'x',
    lines: [{ id: 'italian', name: 'Italian', kind: 'line', opponent: 'x', alternative: false, epd: 'x', epds: [] }],
  },
];
const files: Record<string, unknown> = {
  'index.json': shippedIndex,
  'chapters.json': [{ id: 'italian', source: 'tree/italian.pgn', pgn: pgn('Italian', '1. e4 e5 2. Nf3 Nc6 3. Bc4') }],
};
vi.stubGlobal('fetch', (url: string) => {
  const file = url.split('/').at(-1)!;
  return Promise.resolve({
    ok: file in files,
    status: 404,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(files[file]),
  });
});

const course = {
  name: 'Mine',
  side: 'white',
  opening: 'italian-game',
  tier: 1,
  trigger: '',
  summary: 'x',
  about: { idea: 'x', risks: 'x', suits: 'x' },
  lines: ['italian', 'my-line'],
};
const rows = {
  chapters: [
    {
      id: 'my-line',
      pgn: pgn('My line', '3... Bc5 4. c3', '[Start "italian 3.Bc4"]'),
      at: '2026-10-21T10:00:00.000Z',
      deletedAt: null,
    },
    { id: 'gone', pgn: 'not even pgn', at: '2026-10-21T10:00:00.000Z', deletedAt: '2026-10-21T11:00:00.000Z' },
  ],
  courses: [{ id: 'mine', manifest: JSON.stringify(course), at: '2026-10-21T10:00:00.000Z', deletedAt: null }],
};
vi.mock('./storage', () => ({
  whenStorageReady: () =>
    Promise.resolve({
      storage: {
        authoring: { chapters: () => Promise.resolve(rows.chapters), courses: () => Promise.resolve(rows.courses) },
      },
    }),
}));

const { loadIndex, loadOpening, loadTreeGraph } = await import('./content');

describe('authored courses in the app', () => {
  it('come after the shipped courses in the index, as ordinary courses', async () => {
    const index = await loadIndex();
    expect(index.map((entry) => [entry.id, entry.order])).toEqual([
      ['italian-game', 3],
      ['mine', 4],
    ]);
    const mine = index[1]!;
    expect(mine.lines.map((line) => line.id)).toEqual(['italian', 'my-line']);
    expect(mine.lines[1]!.branch).toEqual({ parent: 'italian', after: '3.Bc4' });
    expect(mine.lines[0]!.alsoIn).toEqual(['italian-game']);
  });

  it('load as courses, and the tree to draw holds their chapters (deleted ones left out)', async () => {
    const content = await loadOpening('mine');
    expect(content.opening.variants.map((variant) => variant.id)).toEqual(['italian', 'my-line']);
    const graph = await loadTreeGraph();
    expect(graph.chapters.map((chapter) => chapter.id).sort()).toEqual(['italian', 'my-line']);
    expect(graph.chapters.find((chapter) => chapter.id === 'italian')!.courses).toEqual(['italian-game', 'mine']);
  });

  it('load once while nothing authored changes, and again after an edit', async () => {
    const first = await loadOpening('mine');
    expect(await loadOpening('mine')).toBe(first);
    const before = rows.courses[0]!.manifest;
    rows.courses[0]!.manifest = JSON.stringify({ ...course, name: 'Mine, renamed' });
    try {
      const edited = await loadOpening('mine');
      expect(edited).not.toBe(first);
      expect(edited.opening.name).toBe('Mine, renamed');
    } finally {
      rows.courses[0]!.manifest = before;
    }
  });
});
