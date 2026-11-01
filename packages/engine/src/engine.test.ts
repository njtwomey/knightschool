import { describe, expect, it } from 'vitest';
import { analyseCached, evaluateCached, memoryCache } from './cache';
import { createEngine, ENGINE_ID } from './engine';
import { FakeStockfish, infoLine, type ScriptedSearch } from './testing/fake-stockfish';
import type { Evaluation } from './types';
import { parseBestMove, parseInfo } from './uci';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -';
/** Fool's mate: White is checkmated, White to move. */
const MATED = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq -';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Depths 1 to `depth`, `multipv` lines each, the score falling by 10 per line, all from the side to move. */
function deepening(depth: number, multipv = 1, cp = 30) {
  return (search: ScriptedSearch) => {
    const lines: string[] = [];
    const wanted = Math.min(multipv, search.multipv);
    for (let d = 1; d <= depth; d++) {
      for (let pv = 1; pv <= wanted; pv++) lines.push(infoLine(d, pv, { cp: cp + d - (pv - 1) * 10 }, [`m${pv}`, 'x']));
    }
    return lines;
  };
}

describe('parseInfo', () => {
  it('reads depth, multipv, the score and the moves', () => {
    expect(parseInfo(infoLine(12, 2, { cp: -31 }, ['e2e4', 'e7e5']), 'white')).toEqual({
      depth: 12,
      multipv: 2,
      score: { cp: -31 },
      pv: ['e2e4', 'e7e5'],
    });
  });

  it('turns scores to White’s point of view when Black is to move', () => {
    expect(parseInfo(infoLine(10, 1, { cp: 40 }, ['e7e5']), 'black')?.score).toEqual({ cp: -40 });
    expect(parseInfo(infoLine(10, 1, { mate: 3 }, ['d8h4']), 'black')?.score).toEqual({ mate: -3 });
    expect(parseInfo(infoLine(10, 1, { mate: -2 }, ['g2g4']), 'black')?.score).toEqual({ mate: 2 });
    expect(parseInfo(infoLine(10, 1, { cp: 0 }, ['e7e5']), 'black')?.score).toEqual({ cp: 0 });
    expect(Object.is(parseInfo(infoLine(10, 1, { cp: 0 }, ['e7e5']), 'black')?.score.cp, -0)).toBe(false);
  });

  it('skips bound scores and lines without a score', () => {
    expect(parseInfo('info depth 9 multipv 1 score cp 20 lowerbound nodes 5 pv e2e4', 'white')).toBeNull();
    expect(parseInfo('info depth 9 currmove e2e4 currmovenumber 1', 'white')).toBeNull();
    expect(parseInfo('info string NNUE evaluation using nn-123.nnue', 'white')).toBeNull();
    expect(parseInfo('readyok', 'white')).toBeNull();
  });

  it('reads a position already over: mate 0 is a loss for the side to move, cp 0 with no moves a draw', () => {
    expect(parseInfo('info depth 0 score mate 0', 'white')?.score).toEqual({ over: 'black' });
    expect(parseInfo('info depth 0 score mate 0', 'black')?.score).toEqual({ over: 'white' });
    expect(parseInfo('info depth 0 score cp 0', 'white')?.score).toEqual({ over: 'draw' });
  });
});

describe('parseBestMove', () => {
  it('gives the move, null for no move, undefined for other lines', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(parseBestMove('bestmove (none)')).toBeNull();
    expect(parseBestMove('info depth 1')).toBeUndefined();
  });
});

describe('evaluate', () => {
  it('starts the engine once and sends the options, the position and the search', async () => {
    const fake = new FakeStockfish(deepening(3));
    const engine = createEngine(fake);
    const result = await engine.evaluate(START, { depth: 3 });
    await engine.evaluate(START, { depth: 3 });
    expect(fake.sent.filter((line) => line === 'uci')).toHaveLength(1);
    expect(fake.sent.slice(2, 5)).toEqual([
      'setoption name MultiPV value 1',
      `position fen ${START} 0 1`,
      'go depth 3',
    ]);
    expect(result).toEqual({
      epd: START,
      depth: 3,
      multipv: 1,
      lines: [{ score: { cp: 33 }, pv: ['m1', 'x'] }],
      engine: ENGINE_ID,
    });
  });

  it('gives several lines, best first, in White’s view when Black is to move', async () => {
    const engine = createEngine(new FakeStockfish(deepening(4, 3)));
    const result = await engine.evaluate(AFTER_E4, { depth: 4, multipv: 3 });
    expect(result.depth).toBe(4);
    expect(result.lines.map((line) => line.score)).toEqual([{ cp: -34 }, { cp: -24 }, { cp: -14 }]);
    expect(result.lines.map((line) => line.pv[0])).toEqual(['m1', 'm2', 'm3']);
  });

  it('accepts fewer lines than asked where there are fewer legal moves', async () => {
    const engine = createEngine(new FakeStockfish(deepening(3, 2)));
    const result = await engine.evaluate(START, { depth: 3, multipv: 3 });
    expect(result.depth).toBe(3);
    expect(result.lines).toHaveLength(2);
    expect(result.partial).toBeUndefined();
  });

  it('reports mates with their sign', async () => {
    const engine = createEngine(new FakeStockfish(() => [infoLine(5, 1, { mate: 2 }, ['d8h4'])]));
    const result = await engine.evaluate(AFTER_E4, { depth: 5 });
    expect(result.lines[0]?.score).toEqual({ mate: -2 });
  });

  it('scores a position already checkmated as over', async () => {
    const engine = createEngine(new FakeStockfish(() => ['info depth 0 score mate 0']));
    const result = await engine.evaluate(MATED, { depth: 10, multipv: 3 });
    expect(result.lines).toEqual([{ score: { over: 'black' }, pv: [] }]);
    expect(result.depth).toBe(0);
  });

  it('stops the search for a different position, which resolves partial at the depth it completed', async () => {
    const fake = new FakeStockfish(deepening(5, 2));
    fake.hold = true;
    const engine = createEngine(fake);
    const first = engine.evaluate(START, { depth: 20, multipv: 2 });
    await flush();
    fake.hold = false;
    const second = engine.evaluate(AFTER_E4, { depth: 5, multipv: 2 });
    const [a, b] = await Promise.all([first, second]);
    expect(fake.sent).toContain('stop');
    expect(a).toMatchObject({ epd: START, depth: 5, partial: true });
    expect(a.lines).toHaveLength(2);
    expect(b).toMatchObject({ epd: AFTER_E4, depth: 5 });
    expect(b.partial).toBeUndefined();
    // The second search starts only after the first one's bestmove.
    expect(fake.goes).toEqual(['go depth 20', 'go depth 5']);
  });

  it('gives a partial result from the deepest lines when no depth completed', async () => {
    const fake = new FakeStockfish(() => [infoLine(1, 1, { cp: 10 }, ['e2e4'])]);
    fake.hold = true;
    const engine = createEngine(fake);
    const first = engine.evaluate(START, { depth: 20, multipv: 3 });
    await flush();
    engine.stop();
    const result = await first;
    expect(result).toMatchObject({ depth: 1, partial: true, lines: [{ score: { cp: 10 }, pv: ['e2e4'] }] });
  });

  it('runs searches for the same position one after another', async () => {
    const fake = new FakeStockfish(deepening(2));
    const engine = createEngine(fake);
    const [a, b] = await Promise.all([engine.evaluate(START, { depth: 2 }), engine.evaluate(START, { depth: 2 })]);
    expect(a.partial).toBeUndefined();
    expect(b.partial).toBeUndefined();
    expect(fake.goes).toHaveLength(2);
    expect(fake.sent).not.toContain('stop');
  });

  it('drops a waiting search for another position, resolved partial and empty', async () => {
    const fake = new FakeStockfish(deepening(2));
    fake.hold = true;
    const engine = createEngine(fake);
    const running = engine.evaluate(START, { depth: 2 });
    const waiting = engine.evaluate(START, { depth: 2 });
    await flush();
    fake.hold = false;
    const other = engine.evaluate(AFTER_E4, { depth: 2 });
    const [, w, o] = await Promise.all([running, waiting, other]);
    expect(w).toMatchObject({ partial: true, depth: 0, lines: [] });
    expect(o.partial).toBeUndefined();
  });

  it('stops when the signal aborts', async () => {
    const fake = new FakeStockfish(deepening(3));
    fake.hold = true;
    const engine = createEngine(fake);
    const controller = new AbortController();
    const result = engine.evaluate(START, { depth: 30 }, controller.signal);
    await flush();
    controller.abort();
    expect(await result).toMatchObject({ depth: 3, partial: true });
  });

  it('fails to start when the transport fails', async () => {
    const fake = new FakeStockfish();
    fake.post = (line) => fake.sent.push(line);
    const engine = createEngine(fake);
    const ready = engine.ready();
    fake.fail('Could not load the engine');
    await expect(ready).rejects.toThrow('Could not load the engine');
  });
});

async function collect(source: AsyncIterable<Evaluation>, out: Evaluation[]) {
  for await (const evaluation of source) out.push(evaluation);
}

describe('analyse', () => {
  it('streams each depth every line completed, and keeps going until stopped', async () => {
    const fake = new FakeStockfish((search) => [
      ...deepening(3, 2)(search),
      // Depth 4 has only its first line when the analysis is stopped: never yielded.
      infoLine(4, 1, { cp: 99 }, ['m1']),
    ]);
    const engine = createEngine(fake);
    const analysis = engine.analyse(AFTER_E4, { multipv: 2 });
    const seen: Evaluation[] = [];
    const reading = collect(analysis, seen);
    await flush();
    expect(fake.goes).toEqual(['go infinite']);
    expect(fake.searchingNow).toBe(true);
    expect(seen.map((evaluation) => evaluation.depth)).toEqual([1, 2, 3]);
    expect(seen[2]?.lines.map((line) => line.score)).toEqual([{ cp: -33 }, { cp: -23 }]);
    analysis.stop();
    await reading;
    expect(await analysis.done).toMatchObject({ depth: 3 });
  });

  it('ends when another position is searched', async () => {
    const fake = new FakeStockfish(deepening(2));
    const engine = createEngine(fake);
    const analysis = engine.analyse(START);
    const seen: Evaluation[] = [];
    const reading = collect(analysis, seen);
    await flush();
    const other = await engine.evaluate(AFTER_E4, { depth: 2 });
    await reading;
    expect(seen.map((evaluation) => evaluation.depth)).toEqual([1, 2]);
    expect(other).toMatchObject({ epd: AFTER_E4, depth: 2 });
    expect(fake.goes).toEqual(['go infinite', 'go depth 2']);
  });

  it('is pre-empted by a search for the same position, which then runs to the end', async () => {
    const fake = new FakeStockfish(deepening(2));
    const engine = createEngine(fake);
    const analysis = engine.analyse(START);
    await flush();
    const result = await engine.evaluate(START, { depth: 2 });
    expect(result.partial).toBeUndefined();
    expect(await analysis.done).toMatchObject({ depth: 2 });
  });

  it('ends by itself at maxDepth', async () => {
    const fake = new FakeStockfish(deepening(4));
    const engine = createEngine(fake);
    const seen: Evaluation[] = [];
    await collect(engine.analyse(START, { maxDepth: 4 }), seen);
    expect(fake.goes).toEqual(['go depth 4']);
    expect(seen.map((evaluation) => evaluation.depth)).toEqual([1, 2, 3, 4]);
  });

  it('a new analysis replaces the old one', async () => {
    const fake = new FakeStockfish(deepening(1));
    const engine = createEngine(fake);
    const first = engine.analyse(START);
    await flush();
    const second = engine.analyse(AFTER_E4);
    await flush();
    expect(await first.done).toMatchObject({ epd: START });
    expect(fake.goes).toEqual(['go infinite', 'go infinite']);
    second.stop();
    expect(await second.done).toMatchObject({ epd: AFTER_E4, depth: 1 });
  });

  it('ends at once when stopped before it starts', async () => {
    const fake = new FakeStockfish(deepening(1));
    const engine = createEngine(fake);
    const analysis = engine.analyse(START);
    analysis.stop();
    expect(await analysis.done).toBeUndefined();
    await flush();
    expect(fake.goes).toEqual([]);
  });
});

describe('cache', () => {
  it('a hit skips the engine; a shallower or narrower entry is searched again', async () => {
    const fake = new FakeStockfish(deepening(6, 3));
    const engine = createEngine(fake);
    const cache = memoryCache();
    await evaluateCached(engine, cache, START, { depth: 6, multipv: 2 });
    expect(await evaluateCached(engine, cache, START, { depth: 4, multipv: 1 })).toMatchObject({ cached: true });
    expect(fake.goes).toHaveLength(1);
    await evaluateCached(engine, cache, START, { depth: 8, multipv: 2 });
    await evaluateCached(engine, cache, START, { depth: 6, multipv: 3 });
    expect(fake.goes).toHaveLength(3);
  });

  it('never stores a partial result', async () => {
    const fake = new FakeStockfish(deepening(3));
    fake.hold = true;
    const engine = createEngine(fake);
    const cache = memoryCache();
    const result = evaluateCached(engine, cache, START, { depth: 20 });
    await flush();
    engine.stop();
    expect((await result).partial).toBe(true);
    expect(await cache.get(START, 1)).toBeUndefined();
  });

  it('an analysis yields what is stored first, then only deeper results, and stores its deepest', async () => {
    const fake = new FakeStockfish(deepening(5));
    const engine = createEngine(fake);
    const cache = memoryCache();
    await cache.set({ epd: START, depth: 3, multipv: 1, lines: [{ score: { cp: 1 }, pv: ['e2e4'] }], engine: 'x' });
    const seen: Evaluation[] = [];
    await collect(analyseCached(engine, cache, START, { maxDepth: 5 }), seen);
    expect(seen.map((evaluation) => [evaluation.depth, evaluation.cached ?? false])).toEqual([
      [3, true],
      [4, false],
      [5, false],
    ]);
    expect(await cache.get(START, 5)).toMatchObject({ depth: 5 });
  });

  it('an analysis already stored at maxDepth does not search', async () => {
    const fake = new FakeStockfish(deepening(5));
    const engine = createEngine(fake);
    const cache = memoryCache();
    await cache.set({ epd: START, depth: 8, multipv: 1, lines: [{ score: { cp: 1 }, pv: ['e2e4'] }], engine: 'x' });
    const seen: Evaluation[] = [];
    await collect(analyseCached(engine, cache, START, { maxDepth: 5 }), seen);
    expect(seen).toHaveLength(1);
    expect(fake.goes).toEqual([]);
  });

  it('leaving an analysis early stops the search and stores what completed', async () => {
    const fake = new FakeStockfish(deepening(4));
    const engine = createEngine(fake);
    const cache = memoryCache();
    for await (const evaluation of analyseCached(engine, cache, START)) {
      if (evaluation.depth === 4) break;
    }
    expect(fake.sent).toContain('stop');
    expect(await cache.get(START, 4)).toMatchObject({ depth: 4 });
  });
});
