import { beforeEach, describe, expect, it } from 'vitest';
import { buildOpening, continueLine, parsePgn } from '@knightschool/core';
import { testManifest } from '@/test-manifest';
import { currentEpd, useBrowse } from './store';

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

const san = () => useBrowse.getState().path.map((edge) => edge.san);

describe('browse store navigation', () => {
  beforeEach(() =>
    useBrowse.setState({ content, openingId: 't', path: [], line: continueLine(content, []), notice: null }),
  );

  it('steps forward along the main line, back, and to either end', () => {
    useBrowse.getState().stepForward();
    useBrowse.getState().stepForward();
    expect(san()).toEqual(['e4', 'e5']);
    useBrowse.getState().stepBack();
    expect(san()).toEqual(['e4']);
    useBrowse.getState().toEnd();
    expect(san()).toEqual(['e4', 'e5', 'Nf3']);
    useBrowse.getState().stepForward(); // nothing after the last move
    expect(san()).toEqual(['e4', 'e5', 'Nf3']);
    useBrowse.getState().toStart();
    expect(san()).toEqual([]);
  });

  it('accepts a move the opening has', () => {
    expect(useBrowse.getState().tryMove('e2e4')).toBe(true);
    expect(san()).toEqual(['e4']);
    expect(currentEpd(content, useBrowse.getState().path)).toContain('4P3');
  });

  it('refuses a legal move that is not in the opening, with its name', () => {
    expect(useBrowse.getState().tryMove('d2d4')).toBe(false);
    expect(useBrowse.getState().notice).toMatch(/d4 is not in this opening/);
    expect(san()).toEqual([]);
  });

  it('refuses an illegal move', () => {
    expect(useBrowse.getState().tryMove('e2e5')).toBe(false);
    expect(useBrowse.getState().notice).toMatch(/not legal/);
  });

  it('clears the notice when navigating', () => {
    useBrowse.getState().tryMove('d2d4');
    useBrowse.getState().stepForward();
    expect(useBrowse.getState().notice).toBeNull();
  });

  it('keeps the displayed line while stepping back and forth within it', () => {
    useBrowse.getState().toEnd();
    const line = useBrowse.getState().line;
    useBrowse.getState().setPath(line.slice(0, 1));
    expect(useBrowse.getState().line).toBe(line);
    useBrowse.getState().stepForward();
    expect(san()).toEqual(['e4', 'e5']);
  });

  it('switches the displayed line when a move outside it is chosen', () => {
    const { content: c } = useBrowse.getState();
    const root = c!.nodes[c!.opening.rootEpd]!;
    useBrowse.getState().setPath([root.moves[0]!]);
    expect(useBrowse.getState().line.map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3']);
  });
});
