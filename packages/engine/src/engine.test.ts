import { describe, expect, it } from 'vitest';
import { evaluateCached, fromRows, measureLineCached, toRows, type EvalStore } from './cache';
import { createEngine } from './engine';
import { FakeStockfish } from './testing/fake-stockfish';
import type { Evaluation } from './types';
import { formatScore, parseBestMove, parseInfo, whiteShare } from './uci';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -';
const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -';

describe('parseInfo', () => {
  it('reads depth, score and line, and keeps White-positive scores for White to move', () => {
    expect(parseInfo('info depth 12 seldepth 16 multipv 1 score cp 31 nodes 99 pv e2e4 e7e5 g1f3', 'white')).toEqual({
      depth: 12,
      multipv: 1,
      line: { cp: 31, pv: ['e2e4', 'e7e5', 'g1f3'] },
    });
  });

  it('flips scores to White point of view when Black is to move', () => {
    expect(parseInfo('info depth 8 multipv 2 score cp 40 pv e7e5', 'black')?.line.cp).toBe(-40);
    expect(parseInfo('info depth 8 score mate 3 pv d8h4', 'black')).toMatchObject({ multipv: 1, line: { mate: -3 } });
    expect(parseInfo('info depth 8 score mate -2 pv d8h4', 'white')?.line.mate).toBe(-2);
  });

  it.each([
    ['not an info line', 'readyok'],
    ['no score', 'info depth 5 currmove e2e4 currmovenumber 1'],
    ['no pv', 'info depth 5 score cp 20'],
    ['a bound', 'info depth 5 score cp 20 lowerbound pv e2e4'],
    ['a string line', 'info string NNUE evaluation using nn-xyz.nnue'],
  ])('ignores %s', (_name, line) => {
    expect(parseInfo(line, 'white')).toBeNull();
  });

  it('reads bestmove', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(parseBestMove('info depth 1')).toBeNull();
  });
});

describe('engine', () => {
  it('starts only after uciok and readyok', async () => {
    const fake = new FakeStockfish();
    const engine = createEngine(fake);
    await engine.ready();
    expect(fake.sent.slice(0, 2)).toEqual(['uci', 'isready']);
    await engine.ready(); // already ready: nothing more is sent
    expect(fake.sent.filter((line) => line === 'uci')).toHaveLength(1);
  });

  it('evaluates a position to the depth asked and returns the lines best first', async () => {
    const fake = new FakeStockfish();
    const engine = createEngine(fake);
    const result = await engine.evaluate(START, { depth: 14, multipv: 3 });
    expect(result).toMatchObject({ epd: START, depth: 14, engine: 'sf19-lite-single' });
    expect(result.partial).toBeUndefined();
    expect(result.lines.map((line) => line.cp)).toEqual([30, 5, -20]);
    expect(fake.sent).toContain('setoption name MultiPV value 3');
    expect(fake.sent).toContain(`position fen ${START} 0 1`);
    expect(fake.sent).toContain('go depth 14');
  });

  it('reports scores from White point of view whoever is to move', async () => {
    const engine = createEngine(new FakeStockfish());
    expect((await engine.evaluate(AFTER_E4, { depth: 10 })).lines[0]!.cp).toBe(-30);
  });

  it('can search for a time instead of a depth', async () => {
    const fake = new FakeStockfish();
    await createEngine(fake).evaluate(START, { movetimeMs: 250 });
    expect(fake.sent).toContain('go movetime 250');
  });

  it('stops a running search for a different position and resolves it as partial', async () => {
    const fake = new FakeStockfish();
    fake.hold = true;
    const engine = createEngine(fake);
    const first = engine.evaluate(START, { depth: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = engine.evaluate(AFTER_E4, { depth: 20 });
    const stopped = await first;
    expect(stopped.partial).toBe(true);
    expect(stopped.depth).toBeLessThan(20);
    expect(fake.sent).toContain('stop');
    fake.hold = false;
    fake.finish();
    expect((await second).partial).toBeUndefined();
  });

  it('queues searches for the same position instead of stopping them', async () => {
    const fake = new FakeStockfish();
    const engine = createEngine(fake);
    const [a, b] = await Promise.all([engine.evaluate(START, { depth: 8 }), engine.evaluate(START, { depth: 8 })]);
    expect(a.partial).toBeUndefined();
    expect(b.partial).toBeUndefined();
    expect(fake.goCount).toBe(2);
  });

  it('stops when the signal aborts', async () => {
    const fake = new FakeStockfish();
    fake.hold = true;
    const engine = createEngine(fake);
    const controller = new AbortController();
    const pending = engine.evaluate(START, { depth: 20 }, controller.signal);
    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.abort();
    expect((await pending).partial).toBe(true);
  });

  it('refuses work after dispose', async () => {
    const fake = new FakeStockfish();
    const engine = createEngine(fake);
    await engine.ready();
    engine.dispose();
    await expect(engine.evaluate(START)).rejects.toThrow(/shut down/);
    expect(fake.sent).toContain('terminate');
  });

  it('measures a line position by position', async () => {
    const engine = createEngine(new FakeStockfish());
    const seen: string[] = [];
    for await (const evaluation of engine.measureLine([START, AFTER_E4, AFTER_E4_E5], { depth: 8 }))
      seen.push(evaluation.epd);
    expect(seen).toEqual([START, AFTER_E4, AFTER_E4_E5]);
  });
});

function memoryStore(): EvalStore & { size(): number } {
  const map = new Map<string, Evaluation>();
  const key = (epd: string, depth: number, engine: string) => `${epd}|${depth}|${engine}`;
  return {
    get: async (epd, depth, engine) => map.get(key(epd, depth, engine)),
    put: async (evaluation) => void map.set(key(evaluation.epd, evaluation.depth, evaluation.engine), evaluation),
    size: () => map.size,
  };
}

describe('cache', () => {
  it('measuring a line twice makes no engine calls the second time', async () => {
    const fake = new FakeStockfish();
    const engine = createEngine(fake);
    const store = memoryStore();
    const line = [START, AFTER_E4, AFTER_E4_E5];
    const run = async () => {
      const results = [];
      for await (const result of measureLineCached(engine, store, line, { depth: 10, multipv: 3 }))
        results.push(result);
      return results;
    };
    const first = await run();
    expect(fake.goCount).toBe(3);
    expect(first.every((result) => !result.cached)).toBe(true);
    const second = await run();
    expect(fake.goCount).toBe(3);
    expect(second.every((result) => result.cached)).toBe(true);
    expect(second.map((result) => result.lines)).toEqual(first.map((result) => result.lines));
  });

  it('asks again when the cache has fewer lines than wanted', async () => {
    const fake = new FakeStockfish();
    const engine = createEngine(fake);
    const store = memoryStore();
    await evaluateCached(engine, store, START, { depth: 10, multipv: 1 });
    const again = await evaluateCached(engine, store, START, { depth: 10, multipv: 3 });
    expect(again.cached).toBe(false);
    expect(again.lines).toHaveLength(3);
    expect((await evaluateCached(engine, store, START, { depth: 10, multipv: 2 })).cached).toBe(true);
  });

  it('does not keep a search that was stopped early', async () => {
    const fake = new FakeStockfish();
    fake.hold = true;
    const engine = createEngine(fake);
    const store = memoryStore();
    const pending = evaluateCached(engine, store, START, { depth: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    engine.stop();
    expect((await pending).partial).toBe(true);
    expect(store.size()).toBe(0);
  });

  it('turns an evaluation into EvalCache rows and back', () => {
    const evaluation: Evaluation = {
      epd: START,
      depth: 16,
      engine: 'sf19-lite-single',
      lines: [
        { cp: 31, pv: ['e2e4', 'e7e5'] },
        { mate: -3, pv: ['f2f3'] },
        { cp: -5, pv: [] },
      ],
    };
    const rows = toRows(evaluation, '2026-10-13T10:00:00.000Z');
    expect(rows.map((row) => [row.multipv, row.cp, row.mate, row.pv])).toEqual([
      [1, 31, null, 'e2e4 e7e5'],
      [2, null, -3, 'f2f3'],
      [3, -5, null, ''],
    ]);
    expect(fromRows([...rows].reverse())).toEqual(evaluation);
    expect(fromRows([])).toBeUndefined();
  });
});

describe('score display', () => {
  it.each([
    [{ cp: 31 }, '+0.31'],
    [{ cp: -120 }, '-1.20'],
    [{ cp: 0 }, '0.00'],
    [{ mate: 3 }, 'M3'],
    [{ mate: -2 }, '-M2'],
  ])('%j is %s', (line, text) => {
    expect(formatScore(line)).toBe(text);
  });

  it('puts the bar at half when level and at the ends for mate', () => {
    expect(whiteShare({ cp: 0 })).toBe(0.5);
    expect(whiteShare({ cp: 300 })).toBeGreaterThan(0.6);
    expect(whiteShare({ cp: -300 })).toBeLessThan(0.4);
    expect(whiteShare({ cp: 5000 })).toBeLessThan(1);
    expect(whiteShare({ mate: 4 })).toBe(1);
    expect(whiteShare({ mate: -1 })).toBe(0);
  });
});
