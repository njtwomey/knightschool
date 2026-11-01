import { describe, expect, it } from 'vitest';
import { readJsonl, writeJsonl } from './jsonl';

describe('JSON Lines', () => {
  it('writes a meta line then one record per line, and reads them back', () => {
    const text = writeJsonl({ kind: 'analysis', date: '2026-11-01' }, [
      { epd: 'a', depth: 20 },
      { epd: 'b', depth: 18 },
    ]);
    expect(text.split('\n')).toHaveLength(4);
    expect(text.startsWith('{"meta":{"kind":"analysis"')).toBe(true);
    expect(readJsonl(text)).toEqual({
      meta: { kind: 'analysis', date: '2026-11-01' },
      rows: [
        { epd: 'a', depth: 20 },
        { epd: 'b', depth: 18 },
      ],
    });
  });

  it('says what is wrong with a file', () => {
    expect(() => readJsonl('{"epd":"a"}\n', 'x.jsonl')).toThrow(/first line/);
    expect(() => readJsonl('{"meta":{}}\nnot json\n', 'x.jsonl')).toThrow(/line 2/);
  });
});
