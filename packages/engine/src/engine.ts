import { parseBestMove, parseInfo, sideToMove, type Info } from './uci';
import type { Engine, EngineLine, Evaluation, SearchOptions, UciTransport } from './types';

export const ENGINE_ID = 'sf19-lite-single';
export const DEFAULT_DEPTH = 12;

type Search = {
  epd: string;
  opts: Required<Pick<SearchOptions, 'multipv'>> & SearchOptions;
  /** Latest line per multipv index, for the deepest depth seen. */
  best: Map<number, Info>;
  stopped: boolean;
  resolve(evaluation: Evaluation): void;
  reject(error: Error): void;
};

/**
 * Stockfish over UCI. One search at a time; requests queue. A request for a different position while one is running
 * sends `stop` and resolves the running one with whatever depth it reached, flagged partial.
 */
export function createEngine(transport: UciTransport): Engine {
  let readyPromise: Promise<void> | undefined;
  let waiting: ((line: string) => boolean) | undefined;
  let running: Search | undefined;
  let disposed = false;
  const queue: Search[] = [];

  transport.onLine((line) => {
    if (waiting?.(line)) waiting = undefined;
    if (running) onSearchLine(running, line);
  });

  const waitFor = (send: string, done: (line: string) => boolean) =>
    new Promise<void>((resolve) => {
      waiting = (line) => (done(line) ? (resolve(), true) : false);
      transport.send(send);
    });

  function onSearchLine(search: Search, line: string) {
    const best = parseBestMove(line);
    if (best !== null) {
      finish(search);
      return;
    }
    const info = parseInfo(line, sideToMove(search.epd));
    if (!info) return;
    const previous = search.best.get(info.multipv);
    if (!previous || info.depth >= previous.depth) search.best.set(info.multipv, info);
  }

  function finish(search: Search) {
    const infos = [...search.best.entries()].sort(([a], [b]) => a - b).map(([, info]) => info);
    const depth = infos.length ? Math.min(...infos.map((info) => info.depth)) : 0;
    const lines: EngineLine[] = infos.map((info) => info.line);
    running = undefined;
    search.resolve({
      epd: search.epd,
      depth,
      lines,
      engine: ENGINE_ID,
      ...(search.stopped ? { partial: true } : {}),
    });
    next();
  }

  function next() {
    if (running || disposed) return;
    const search = queue.shift();
    if (!search) return;
    running = search;
    const { opts } = search;
    transport.send(`setoption name MultiPV value ${opts.multipv}`);
    transport.send(`position fen ${search.epd} 0 1`);
    transport.send(opts.movetimeMs ? `go movetime ${opts.movetimeMs}` : `go depth ${opts.depth ?? DEFAULT_DEPTH}`);
  }

  function stopRunning() {
    if (running && !running.stopped) {
      running.stopped = true;
      transport.send('stop');
    }
  }

  const engine: Engine = {
    ready() {
      readyPromise ??= (async () => {
        await waitFor('uci', (line) => line.trim() === 'uciok');
        await waitFor('isready', (line) => line.trim() === 'readyok');
      })();
      return readyPromise;
    },

    async evaluate(epd, opts = {}, signal) {
      await engine.ready();
      if (disposed) throw new Error('The engine was shut down.');
      signal?.throwIfAborted();
      return new Promise<Evaluation>((resolve, reject) => {
        const search: Search = {
          epd,
          opts: { multipv: 1, ...opts },
          best: new Map(),
          stopped: false,
          resolve,
          reject,
        };
        // A different position replaces what is running and anything waiting.
        if (running && running.epd !== epd) stopRunning();
        for (const waitingSearch of queue.splice(0)) {
          if (waitingSearch.epd !== epd)
            waitingSearch.resolve({ epd: waitingSearch.epd, depth: 0, lines: [], engine: ENGINE_ID, partial: true });
          else queue.push(waitingSearch);
        }
        queue.push(search);
        signal?.addEventListener('abort', () => {
          if (running === search) stopRunning();
        });
        next();
      });
    },

    async *measureLine(epds, opts, signal) {
      for (const epd of epds) {
        signal?.throwIfAborted();
        const evaluation = await engine.evaluate(epd, opts, signal);
        yield evaluation;
        if (evaluation.partial) return;
      }
    },

    stop: stopRunning,

    dispose() {
      disposed = true;
      for (const search of queue.splice(0)) search.reject(new Error('The engine was shut down.'));
      running?.reject(new Error('The engine was shut down.'));
      running = undefined;
      transport.terminate();
    },
  };
  return engine;
}
