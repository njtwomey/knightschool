import type { UciTransport } from './types';

/**
 * A stand-in for Stockfish that answers UCI the way the real one does: info lines, then `bestmove`.
 * `hold` keeps a search running until `finish()` or `stop`, so stopping and queueing can be tested.
 */
export class FakeStockfish implements UciTransport {
  readonly sent: string[] = [];
  hold = false;
  private listener: (line: string) => void = () => {};
  private current: { fen: string; depth: number; multipv: number } | undefined;
  private multipv = 1;
  private fen = '';
  /** Score in centipawns for the side to move, per multipv line. */
  score = (multipv: number) => 30 - (multipv - 1) * 25;

  get goCount() {
    return this.sent.filter((line) => line.startsWith('go ')).length;
  }

  onLine(listener: (line: string) => void) {
    this.listener = listener;
  }

  terminate() {
    this.sent.push('terminate');
  }

  send(line: string) {
    this.sent.push(line);
    queueMicrotask(() => this.handle(line));
  }

  private emit(line: string) {
    this.listener(line);
  }

  private handle(line: string) {
    if (line === 'uci') this.emit('uciok');
    else if (line === 'isready') this.emit('readyok');
    else if (line.startsWith('setoption name MultiPV value ')) this.multipv = Number(line.split(' ').pop());
    else if (line.startsWith('position fen ')) this.fen = line.slice('position fen '.length);
    else if (line.startsWith('go ')) {
      const depth = Number(/depth (\d+)/.exec(line)?.[1] ?? 10);
      this.current = { fen: this.fen, depth, multipv: this.multipv };
      this.report(Math.max(1, depth - 2)); // an earlier, shallower result first
      if (!this.hold) this.finish();
    } else if (line === 'stop') this.finish();
  }

  private report(depth: number) {
    const search = this.current;
    if (!search) return;
    for (let pv = 1; pv <= search.multipv; pv++) {
      this.emit(
        `info depth ${depth} seldepth ${depth + 3} multipv ${pv} score cp ${this.score(pv)} nodes 1000 pv e2e4 e7e5`,
      );
    }
  }

  finish() {
    const search = this.current;
    if (!search) return;
    if (!this.hold) this.report(search.depth);
    this.current = undefined;
    this.emit('bestmove e2e4 ponder e7e5');
  }
}
