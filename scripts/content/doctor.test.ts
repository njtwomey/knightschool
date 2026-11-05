import { describe, expect, it } from 'vitest';
import { nameClashes, startsWithMove } from './doctor.ts';

describe('the content doctor', () => {
  it('finds one line name in two folders', () => {
    const clashes = nameClashes(['a/x.pgn', 'b/x.pgn', 'b/y.pgn']);
    expect([...clashes.keys()]).toEqual(['x']);
    expect(clashes.get('x')).toEqual(['a/x.pgn', 'b/x.pgn']);
  });
  it('spots names that start with a move, not ones that carry an opening', () => {
    for (const name of ['nf3-e6', 'd6-nf6', 'h6', 'bxc6-main', 'o-o-d5']) expect(startsWithMove(name)).toBe(true);
    for (const name of ['caro-nf3-e6', 'giuoco-d6', 'hungarian', 'legal-mate', 'danger-e5', 'bishop-f5'])
      expect(startsWithMove(name)).toBe(false);
  });
});
