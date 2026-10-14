import { describe, expect, it } from 'vitest';
import { checkRichText, parseRichText, plainText, positionOf } from './rich-text';

const AFTER_NXF7 = 'r1bqkb1r/pppp1Npp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq -';

describe('rich text', () => {
  it('splits text around position links and reads the target as an EPD', () => {
    const segments = parseRichText(`White plays [Nxf7](${AFTER_NXF7} 0 5) and forks the queen.`);
    expect(segments).toEqual([
      { kind: 'text', text: 'White plays ' },
      { kind: 'position', label: 'Nxf7', epd: AFTER_NXF7 },
      { kind: 'text', text: ' and forks the queen.' },
    ]);
  });

  it('accepts a full FEN or an EPD, and several links in one comment', () => {
    const text = `[a](${AFTER_NXF7}) then [b](${AFTER_NXF7} 0 1)`;
    expect(parseRichText(text).filter((s) => s.kind === 'position')).toHaveLength(2);
  });

  it('turns links into their labels for places without a board', () => {
    expect(plainText(`Look at [f7](${AFTER_NXF7}), it is weak.`)).toBe('Look at f7, it is weak.');
    expect(plainText('No links here.')).toBe('No links here.');
  });

  it('leaves brackets that are not position links alone', () => {
    expect(plainText('A note [sic](see above) stays as typed.')).toBe('A note [sic](see above) stays as typed.');
    expect(parseRichText('[x](not a fen)')).toEqual([{ kind: 'text', text: '[x](not a fen)' }]);
  });

  it('knows a legal position from nonsense', () => {
    expect(positionOf(AFTER_NXF7)).toBe(AFTER_NXF7);
    expect(positionOf('8/8/8/8/8/8/8/8 w - -')).toBeUndefined(); // no kings
    expect(positionOf('hello')).toBeUndefined();
  });

  it('refuses a link to something that looks like a position but is not legal', () => {
    expect(() => checkRichText(`ok [f7](${AFTER_NXF7})`, 'a.pgn')).not.toThrow();
    expect(() => checkRichText('bad [f7](rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -)', 'a.pgn')).toThrow(
      /a\.pgn: "f7" links to .* not a legal FEN/,
    );
    expect(() => checkRichText('fine [sic](see above)', 'a.pgn')).not.toThrow();
  });
});
