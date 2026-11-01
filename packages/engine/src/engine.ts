import { parseBestMove, parseInfo, sideToMove, type Info } from './uci';
import type { Analysis, AnalysisOptions, Engine, Evaluation, UciTransport } from './types';

export const ENGINE_ID = 'sf19-lite-single';
export const DEFAULT_DEPTH = 12;

type Job = {
  kind: 'evaluate' | 'analyse';
  epd: string;
  multipv: number;
  go: string;
  /** The lines seen at each depth, by multipv index. */
  byDepth: Map<number, Map<number, Info>>;
  /** How many lines the engine gives: fewer than asked when there are fewer legal moves. Known after one depth. */
  given?: number;
  /** The deepest evaluation every line completed. */
  complete?: Evaluation;
  started: boolean;
  stopped: boolean;
  ended: boolean;
  onComplete?(evaluation: Evaluation): void;
  end(evaluation: Evaluation, partial: boolean): void;
};

const SHUT_DOWN = 'The engine was shut down.';

/** A queue of values read with `for await`, ended from outside. */
function channel<T>() {
  const values: T[] = [];
  let ended = false;
  let wake: (() => void) | undefined;
  return {
    push(value: T) {
      values.push(value);
      wake?.();
    },
    end() {
      ended = true;
      wake?.();
    },
    async *read(): AsyncGenerator<T> {
      for (;;) {
        if (values.length) yield values.shift()!;
        else if (ended) return;
        else await new Promise<void>((resolve) => (wake = resolve));
      }
    },
  };
}

/**
 * Stockfish over UCI (docs/v2/library/engine.md). One search at a time: a search for a different position stops the
 * running one, which ends with the depth it reached (`partial`); a continuous analysis is stopped by any new search;
 * searches for the same position wait their turn. Scores leave in White's point of view.
 */
export function createEngine(transport: UciTransport): Engine {
  let readyPromise: Promise<void> | undefined;
  let waiting: { done: (line: string) => boolean; resolve: () => void } | undefined;
  let failReady: ((error: Error) => void) | undefined;
  let failure: Error | undefined;
  let running: Job | undefined;
  let disposed = false;
  const queue: Job[] = [];

  transport.onLine((line) => {
    if (waiting?.done(line)) {
      const { resolve } = waiting;
      waiting = undefined;
      resolve();
    }
    if (running) onSearchLine(running, line);
  });
  transport.onError?.((error) => {
    failure = error;
    failReady?.(error);
    for (const job of [...queue.splice(0), ...(running ? [running] : [])]) end(job, true);
    running = undefined;
  });

  const snapshot = (job: Job, depth: number, infos: Iterable<Info>): Evaluation => ({
    epd: job.epd,
    depth,
    multipv: job.multipv,
    lines: [...infos].sort((a, b) => a.multipv - b.multipv).map(({ score, pv }) => ({ score, pv })),
    engine: ENGINE_ID,
  });

  /** Every line has reached this depth: record it, and tell an analysis. */
  function completed(job: Job, depth: number) {
    const lines = job.byDepth.get(depth);
    if (!lines || (job.complete && job.complete.depth >= depth)) return;
    job.complete = snapshot(job, depth, lines.values());
    job.onComplete?.(job.complete);
  }

  function onSearchLine(job: Job, line: string) {
    if (parseBestMove(line) !== undefined) {
      finish(job);
      return;
    }
    const info = parseInfo(line, sideToMove(job.epd));
    if (!info || info.multipv < 1 || info.multipv > job.multipv) return;
    const deepest = Math.max(0, ...job.byDepth.keys());
    // The first line of a new depth: the depth before is as complete as it will get, which tells how many lines
    // the engine gives here.
    if (info.multipv === 1 && info.depth > deepest && deepest > 0 && job.given === undefined) {
      job.given = job.byDepth.get(deepest)!.size;
      completed(job, deepest);
    }
    let lines = job.byDepth.get(info.depth);
    if (!lines) job.byDepth.set(info.depth, (lines = new Map()));
    lines.set(info.multipv, info);
    // Depth 0 is a position already over: one line, and nothing more will come.
    if (info.depth === 0) job.given = lines.size;
    if (lines.size >= (job.given ?? job.multipv)) completed(job, info.depth);
  }

  function end(job: Job, partial: boolean) {
    if (job.ended) return;
    job.ended = true;
    if (!partial && job.byDepth.size && !job.complete) {
      // A finished search whose last depth gave fewer lines than asked (few legal moves): that depth is complete.
      completed(job, Math.max(...job.byDepth.keys()));
    }
    const fallback = (): Evaluation => {
      // Nothing completed: the deepest line seen for each index, at the shallowest of their depths.
      const latest = new Map<number, Info>();
      for (const lines of job.byDepth.values()) {
        for (const info of lines.values()) {
          if ((latest.get(info.multipv)?.depth ?? -1) <= info.depth) latest.set(info.multipv, info);
        }
      }
      const depths = [...latest.values()].map((info) => info.depth);
      return snapshot(job, depths.length ? Math.min(...depths) : 0, latest.values());
    };
    const result = job.complete ?? fallback();
    job.end(partial ? { ...result, partial: true } : result, partial);
  }

  function finish(job: Job) {
    running = undefined;
    end(job, job.stopped);
    next();
  }

  function next() {
    if (running || disposed || failure) return;
    const job = queue.shift();
    if (!job) return;
    running = job;
    job.started = true;
    transport.post(`setoption name MultiPV value ${job.multipv}`);
    transport.post(`position fen ${job.epd} 0 1`);
    transport.post(job.go);
  }

  /** Stops a job: sends `stop` if it is running (it ends at `bestmove`), or drops it from the queue. */
  function stopJob(job: Job) {
    if (job.ended || job.stopped) return;
    job.stopped = true;
    if (running === job) {
      transport.post('stop');
      return;
    }
    const at = queue.indexOf(job);
    if (at >= 0) queue.splice(at, 1);
    end(job, true);
  }

  function submit(job: Job) {
    if (job.stopped) {
      end(job, true);
      return;
    }
    if (disposed || failure) {
      end(job, true);
      return;
    }
    if (running && (running.epd !== job.epd || running.kind === 'analyse')) stopJob(running);
    for (const waitingJob of [...queue]) {
      const keep = waitingJob.epd === job.epd && !(job.kind === 'analyse' && waitingJob.kind === 'analyse');
      if (!keep) stopJob(waitingJob);
    }
    // A search with an end goes before a waiting analysis of the same position, which would never let it run.
    const analysisAt = job.kind === 'evaluate' ? queue.findIndex((queued) => queued.kind === 'analyse') : -1;
    if (analysisAt >= 0) queue.splice(analysisAt, 0, job);
    else queue.push(job);
    next();
  }

  const newJob = (
    kind: Job['kind'],
    epd: string,
    multipv: number,
    go: string,
    end: Job['end'],
    onComplete?: Job['onComplete'],
  ): Job => ({
    kind,
    epd,
    multipv: Math.max(1, Math.floor(multipv)),
    go,
    byDepth: new Map(),
    started: false,
    stopped: false,
    ended: false,
    end,
    onComplete,
  });

  const engine: Engine = {
    ready() {
      readyPromise ??= new Promise<void>((resolve, reject) => {
        if (failure) {
          reject(failure);
          return;
        }
        failReady = reject;
        const send = (line: string, done: (text: string) => boolean) =>
          new Promise<void>((answered) => {
            waiting = { done, resolve: answered };
            transport.post(line);
          });
        send('uci', (text) => text.trim() === 'uciok')
          .then(() => send('isready', (text) => text.trim() === 'readyok'))
          .then(() => {
            failReady = undefined;
            resolve();
          });
      });
      return readyPromise;
    },

    async evaluate(epd, opts = {}, signal) {
      await engine.ready();
      if (disposed) throw new Error(SHUT_DOWN);
      signal?.throwIfAborted();
      return new Promise<Evaluation>((resolve) => {
        const go = opts.movetimeMs ? `go movetime ${opts.movetimeMs}` : `go depth ${opts.depth ?? DEFAULT_DEPTH}`;
        const job = newJob('evaluate', epd, opts.multipv ?? 1, go, (evaluation) => resolve(evaluation));
        signal?.addEventListener('abort', () => stopJob(job), { once: true });
        submit(job);
      });
    },

    analyse(epd, opts: AnalysisOptions = {}, signal) {
      const values = channel<Evaluation>();
      let settle: (evaluation: Evaluation | undefined) => void = () => {};
      const done = new Promise<Evaluation | undefined>((resolve) => (settle = resolve));
      const go = opts.maxDepth ? `go depth ${opts.maxDepth}` : 'go infinite';
      const job = newJob(
        'analyse',
        epd,
        opts.multipv ?? 1,
        go,
        () => {
          values.end();
          settle(job.complete);
        },
        (evaluation) => values.push(evaluation),
      );
      signal?.addEventListener('abort', () => stopJob(job), { once: true });
      if (signal?.aborted) job.stopped = true;
      engine.ready().then(
        () => submit(job),
        () => end(job, true),
      );
      const analysis: Analysis = {
        stop: () => stopJob(job),
        done,
        [Symbol.asyncIterator]: () => values.read(),
      };
      return analysis;
    },

    stop() {
      if (running) stopJob(running);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const job of queue.splice(0)) end(job, true);
      if (running) end(running, true);
      running = undefined;
      transport.terminate?.();
    },
  };
  return engine;
}
