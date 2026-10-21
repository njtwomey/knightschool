import { describe, expect, it } from 'vitest';
import { parsePgn, writePgn } from './pgn';

const SAMPLE = `[Event "Knight School"]
[Opening "Italian Game"]

1. e4 { King's pawn [%cal Ge2e4,Rd1h5] [%csl Ge4] } 1... e5 $1 2. Nf3 ( 2. Bc4 { Also good. } 2... Nf6 ( 2... Bc5 ) ) 2... Nc6
3. Bc4 $2 { Not best. } 3... Bc5 *`;

describe('PGN round trip', () => {
  it('keeps moves, comments, NAGs, variations and shapes', () => {
    const first = parsePgn(SAMPLE);
    const again = parsePgn(writePgn(first));
    expect(again).toEqual(first);
  });

  it('reads comments, NAGs, arrows and circles', () => {
    const { moves } = parsePgn(SAMPLE);
    expect(moves[0]).toMatchObject({
      san: 'e4',
      comment: "King's pawn",
      arrows: ['Ge2e4', 'Rd1h5'],
      circles: ['Ge4'],
    });
    expect(moves[1]!.nags).toEqual([1]);
    expect(moves[2]!.variations).toHaveLength(1);
    expect(moves[2]!.variations[0]![0]!.san).toBe('Bc4');
    expect(moves[2]!.variations[0]![1]!.variations[0]![0]!.san).toBe('Bc5');
  });

  it('does not report parser bookkeeping as header tags', () => {
    expect(Object.keys(parsePgn(SAMPLE).tags)).toEqual(['Event', 'Opening']);
  });

  it('names the file when the PGN is malformed', () => {
    expect(() => parsePgn('1. e4 e5 2. (', 'content/openings/x/lines/y.pgn')).toThrow(
      /content\/openings\/x\/lines\/y\.pgn/,
    );
  });
});
