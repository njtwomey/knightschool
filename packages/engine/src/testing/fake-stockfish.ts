import type { UciTransport } from '../types';

/** What a scripted search is given: the position and the options set before `go`. */
export type ScriptedSearch = { fen: string; multipv: number; go: string };

/** One `info` line as Stockfish writes it. The score is the side to move's, as UCI has it. */
export function infoLine(depth: number, multipv: number, score: { cp: number } | { mate: number }, pv: string[]) {
  const scored = 'cp' in score ? `cp ${score.cp}` : `mate ${score.mate}`;
  return `info depth ${depth} seldepth ${depth + 2} multipv ${multipv} score ${scored} nodes ${depth * 1000} nps 100000 time ${depth * 10} pv ${pv.join(' ')}`;
}

/**
 * A stand-in for Stockfish that replays scripted UCI output. `uci` and `isready` are answered; each `go` writes the
 * lines `script` gives for it, then `bestmove`. A held search (`hold`, or any `go infinite`) writes its lines and waits
 * for `stop` (or `release()`) before `bestmove`, as Stockfish does.
 */
export class FakeStockfish implements UciTransport {
  readonly sent: string[] = [];
  hold = false;
  private listener: (line: string) => void = () => {};
  private errorListener: (error: Error) => void = () => {};
  private multipv = 1;
  private fen = '';
  private searching: { bestmove: string } | undefined;

  constructor(
    public script: (search: ScriptedSearch) => string[] = () => [
      infoLine(1, 1, { cp: 20 }, ['e2e4']),
      infoLine(2, 1, { cp: 30 }, ['e2e4', 'e7e5']),
    ],
  ) {}

  get goes(): string[] {
    return this.sent.filter((line) => line.startsWith('go'));
  }

  get searchingNow(): boolean {
    return this.searching !== undefined;
  }

  onLine(listener: (line: string) => void) {
    this.listener = listener;
  }

  onError(listener: (error: Error) => void) {
    this.errorListener = listener;
  }

  terminate() {
    this.sent.push('terminate');
  }

  post(line: string) {
    this.sent.push(line);
    queueMicrotask(() => this.handle(line));
  }

  /** Writes a line as if the engine had, for scripting mid-search output. */
  emit(line: string) {
    this.listener(line);
  }

  fail(message: string) {
    this.errorListener(new Error(message));
  }

  /** Ends a held search with its `bestmove`. */
  release() {
    const search = this.searching;
    if (!search) return;
    this.searching = undefined;
    this.emit(`bestmove ${search.bestmove}`);
  }

  private handle(line: string) {
    if (line === 'uci') {
      this.emit('id name Fake Stockfish');
      this.emit('uciok');
    } else if (line === 'isready') this.emit('readyok');
    else if (line.startsWith('setoption name MultiPV value ')) this.multipv = Number(line.split(' ').pop());
    else if (line.startsWith('position fen ')) this.fen = line.slice('position fen '.length);
    else if (line.startsWith('go')) {
      const lines = this.script({ fen: this.fen, multipv: this.multipv, go: line });
      for (const output of lines) this.emit(output);
      const best = [...lines].reverse().find((output) => / multipv 1 /.test(output) || !/multipv/.test(output));
      const bestmove = best?.match(/ pv (\S+)/)?.[1] ?? '(none)';
      this.searching = { bestmove };
      if (!this.hold && !line.includes('infinite')) this.release();
    } else if (line === 'stop') this.release();
  }
}
