import type { UciTransport } from '@knightschool/engine';

/**
 * Stockfish runs in a Web Worker loaded from our own origin (public/engine, copied there by `pnpm engine:copy`), under
 * the site's base path. It is a separate GPL program: only UCI text crosses `postMessage`, and its code is never
 * imported.
 */
export const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`;

export function createWorkerTransport(url = ENGINE_URL): UciTransport {
  const worker = new Worker(url);
  return {
    post: (line) => worker.postMessage(line),
    onLine: (listener) => {
      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (typeof event.data === 'string') listener(event.data);
      };
    },
    onError: (listener) => {
      worker.onerror = (event) => {
        event.preventDefault();
        listener(new Error(event.message || `The engine could not be loaded from ${url}.`));
      };
    },
    terminate: () => worker.terminate(),
  };
}
