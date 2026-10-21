import { manifestOf } from '../testing/manifest';
import { describe, expect, it } from 'vitest';
import { applyPopularity, popularityTargets, type ExplorerPosition } from './explorer';
import { parsePgn } from '../chess/pgn';
import { buildOpening } from './course-build';
import { applyNames, parseOpeningsTsv } from './openings-list';
import { START_EPD } from '../chess/epd';

const game = parsePgn(`[Event "x"]
[Opening "T"]
[Variation "main"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

1. e4 e5 2. Nf3 *`);

const content = buildOpening('t', manifestOf({ name: 'T' }), [{ id: 'main', kind: 'line', game, source: 'main.pgn' }]);

// Fixture shaped like the explorer's reply: 1. e4 is played in 60 of 100 games, 1...e5 in 30 of those 60.
const fixture: Record<string, ExplorerPosition> = {
  [START_EPD]: { white: 40, draws: 10, black: 50, moves: [{ uci: 'e2e4', san: 'e4', white: 20, draws: 5, black: 35 }] },
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': {
    white: 20,
    draws: 5,
    black: 35,
    moves: [{ uci: 'e7e5', san: 'e5', white: 10, draws: 5, black: 15 }],
  },
};

describe('applyPopularity', () => {
  it('multiplies move shares down the tree', () => {
    const withShare = applyPopularity(content, (epd) => fixture[epd]);
    const popularity = (epd: string) => withShare.nodes[epd]!.popularity;
    expect(popularity(START_EPD)).toBe(1);
    const e4 = content.nodes[START_EPD]!.moves[0]!;
    expect(popularity(e4.to)).toBeCloseTo(60 / 100, 5);
    const e5 = content.nodes[e4.to]!.moves[0]!;
    expect(popularity(e5.to)).toBeCloseTo((60 / 100) * (30 / 60), 5);
  });

  it('leaves positions the explorer has not seen without a value', () => {
    const withShare = applyPopularity(content, () => undefined);
    expect(withShare.nodes[START_EPD]!.popularity).toBe(1);
    const e4 = content.nodes[START_EPD]!.moves[0]!;
    expect(withShare.nodes[e4.to]!.popularity).toBeUndefined();
  });
});

describe('opening names', () => {
  const tsv =
    "eco\tname\tpgn\tuci\tepd\nB00\tKing's Pawn Game\t1. e4\te2e4\trnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -";
  it('indexes by epd and names matching positions', () => {
    const named = applyNames(content, parseOpeningsTsv(tsv));
    const e4 = content.nodes[START_EPD]!.moves[0]!;
    expect(named.nodes[e4.to]!.name).toBe("King's Pawn Game");
  });

  it('finds the position from the pgn when there is no epd column', () => {
    const index = parseOpeningsTsv("eco\tname\tpgn\nB00\tKing's Pawn Game\t1. e4");
    expect([...index.keys()]).toEqual(['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -']);
  });
});

describe('popularityTargets', () => {
  const header = (name: string) => `[Event "x"]
[Opening "T"]
[Variation "${name}"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

`;
  const built = (kinds: { rare?: boolean; alternative?: boolean }) => {
    const base = manifestOf({ name: 'T', lines: ['main', 'side'] });
    const manifest = {
      ...base,
      lines: base.lines.map((line) =>
        line.file === 'side'
          ? { ...line, kind: kinds.rare ? ('rare' as const) : line.kind, alternative: kinds.alternative ?? false }
          : line,
      ),
    };
    return buildOpening('t', manifest, [
      { id: 'main', kind: 'line', game: parsePgn(`${header('main')}1. e4 e5 2. Nf3 *`), source: 'main.pgn' },
      { id: 'side', kind: 'line', game: parsePgn(`${header('side')}1. e4 c5 2. Nf3 *`), source: 'side.pgn' },
    ]);
  };

  it('lists every position on the lines that count, once, including side branches', () => {
    const targets = popularityTargets([built({})]);
    expect(targets).toHaveLength(new Set(targets).size);
    expect(targets).toContain(START_EPD);
    expect(targets).toHaveLength(Object.keys(built({}).nodes).length);
  });

  it('walks each course on its own, so a position another course already listed does not hide what lies beyond it', () => {
    const first = built({});
    const second = { ...built({}), opening: { ...built({}).opening, id: 'u' } };
    expect(popularityTargets([first, second])).toEqual(popularityTargets([first]));
    const shallow = buildOpening('s', manifestOf({ name: 'S', trigger: '' }), [
      { id: 'main', kind: 'line', game: parsePgn(`${header('main')}1. e4 *`), source: 'main.pgn' },
    ]);
    expect(popularityTargets([shallow, first])).toHaveLength(Object.keys(first.nodes).length);
  });

  it('leaves out rare lines and alternatives unless asked for everything', () => {
    const all = Object.keys(built({}).nodes).length;
    expect(popularityTargets([built({ rare: true })])).toHaveLength(all - 2);
    expect(popularityTargets([built({ alternative: true })])).toHaveLength(all - 2);
    expect(popularityTargets([built({ rare: true })], true)).toHaveLength(all);
  });
});
