import { beforeEach, describe, expect, it } from 'vitest';
import { buildOpening, continueLine, parsePgn } from '@knightschool/core';
import { testManifest } from '@/test-manifest';
import { currentEpd, useCatalog } from './catalog-store';

const game = parsePgn(`[Event "x"]
[Opening "T"]
[Variation "main"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

1. e4 e5 2. Nf3 *`);

const content = buildOpening('t', testManifest(), [{ id: 'main', kind: 'line', game, source: 'main.pgn' }]);

const san = () => useCatalog.getState().path.map((edge) => edge.san);

describe('browse store navigation', () => {
  beforeEach(() =>
    useCatalog.setState({ content, openingId: 't', path: [], line: continueLine(content, []), notice: null }),
  );

  it('steps forward along the main line, back, and to either end', () => {
    useCatalog.getState().stepForward();
    useCatalog.getState().stepForward();
    expect(san()).toEqual(['e4', 'e5']);
    useCatalog.getState().stepBack();
    expect(san()).toEqual(['e4']);
    useCatalog.getState().toEnd();
    expect(san()).toEqual(['e4', 'e5', 'Nf3']);
    useCatalog.getState().stepForward(); // nothing after the last move
    expect(san()).toEqual(['e4', 'e5', 'Nf3']);
    useCatalog.getState().toStart();
    expect(san()).toEqual([]);
  });

  it('accepts a move the opening has', () => {
    expect(useCatalog.getState().tryMove('e2e4')).toBe(true);
    expect(san()).toEqual(['e4']);
    expect(currentEpd(content, useCatalog.getState().path)).toContain('4P3');
  });

  it('refuses a legal move that is not in the opening, with its name', () => {
    expect(useCatalog.getState().tryMove('d2d4')).toBe(false);
    expect(useCatalog.getState().notice).toMatch(/d4 is not in this opening/);
    expect(san()).toEqual([]);
  });

  it('refuses an illegal move', () => {
    expect(useCatalog.getState().tryMove('e2e5')).toBe(false);
    expect(useCatalog.getState().notice).toMatch(/not legal/);
  });

  it('clears the notice when navigating', () => {
    useCatalog.getState().tryMove('d2d4');
    useCatalog.getState().stepForward();
    expect(useCatalog.getState().notice).toBeNull();
  });

  it('keeps the displayed line while stepping back and forth within it', () => {
    useCatalog.getState().toEnd();
    const line = useCatalog.getState().line;
    useCatalog.getState().setPath(line.slice(0, 1));
    expect(useCatalog.getState().line).toBe(line);
    useCatalog.getState().stepForward();
    expect(san()).toEqual(['e4', 'e5']);
  });

  it('switches the displayed line when a move outside it is chosen', () => {
    const { content: c } = useCatalog.getState();
    const root = c!.nodes[c!.opening.rootEpd]!;
    useCatalog.getState().setPath([root.moves[0]!]);
    expect(useCatalog.getState().line.map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3']);
  });
});
