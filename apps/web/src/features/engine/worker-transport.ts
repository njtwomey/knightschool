import type { UciTransport } from '@knightschool/engine';

/**
 * Stockfish runs in a Web Worker loaded from our own origin (public/engine, copied by `pnpm engine:copy`). It is a
 * separate GPL program: we only exchange UCI text with it and never import its code.
 */
export const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`;

export function createWorkerTransport(url = ENGINE_URL): UciTransport {
  const worker = new Worker(url);
  return {
    send: (line) => worker.postMessage(line),
    onLine: (listener) => {
      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (typeof event.data === 'string') listener(event.data);
      };
    },
    terminate: () => worker.terminate(),
  };
}
