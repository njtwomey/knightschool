import { describe, expect, it } from 'vitest';
import { START_FEN } from './load';
import {
  fittingTurn,
  placementFen,
  placementOf,
  possibleCastling,
  setupFen,
  setupFromFen,
  setupProblem,
  type Placement,
} from './setup';

const kings: Placement = { e1: 'wK', e8: 'bK' };

describe('setting up a position', () => {
  it('reads and writes a placement', () => {
    expect(placementFen(placementOf(START_FEN))).toBe(START_FEN.split(' ')[0]);
    expect(placementOf(START_FEN).e1).toBe('wK');
    expect(placementOf(START_FEN).d8).toBe('bQ');
  });
  it('allows only the castling the pieces permit, whatever was asked for', () => {
    expect(possibleCastling(placementOf(START_FEN))).toBe('KQkq');
    const moved = { ...kings, a1: 'wR', h1: 'wR', a8: 'bR', h7: 'bR' };
    expect(possibleCastling(moved)).toBe('KQq');
    expect(setupFen({ placement: moved, turn: 'w', castling: 'KQkq' })).toBe('r3k3/7r/8/8/8/8/8/R3K2R w KQq - 0 1');
    expect(setupFen({ placement: moved, turn: 'b', castling: 'k' })).toBe('r3k3/7r/8/8/8/8/8/R3K2R b - - 0 1');
  });
  it('reads a FEN back as a setup', () => {
    expect(setupFromFen(START_FEN)).toMatchObject({ turn: 'w', castling: 'KQkq' });
    expect(setupFromFen('4k3/8/8/8/8/8/8/4K3 b - - 0 1')).toMatchObject({ turn: 'b', castling: '' });
  });
  it('works out whose move a check must be', () => {
    const check = { ...kings, e4: 'wR' };
    expect(fittingTurn({ placement: check, turn: 'w', castling: '' })).toBe('b');
    expect(fittingTurn({ placement: check, turn: 'b', castling: '' })).toBe('b');
    expect(fittingTurn({ placement: kings, turn: 'b', castling: '' })).toBe('b');
  });
  it('says why a position cannot be played', () => {
    expect(setupProblem({ placement: {}, turn: 'w', castling: '' })).toMatch(/White needs/);
    expect(setupProblem({ placement: { e1: 'wK' }, turn: 'w', castling: '' })).toMatch(/Black needs/);
    expect(setupProblem({ placement: { ...kings, a8: 'wP' }, turn: 'w', castling: '' })).toMatch(/pawn/);
    expect(setupProblem({ placement: { ...kings, e4: 'wR' }, turn: 'w', castling: '' })).toMatch(/Black is in check/);
    expect(setupProblem({ placement: kings, turn: 'w', castling: '' })).toBeNull();
  });
});
