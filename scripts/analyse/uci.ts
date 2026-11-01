import { spawn } from 'node:child_process';

export type Line = { multipv: number; cp?: number; mate?: number; pv: string[] };

/**
 * A native Stockfish over UCI, one search at a time. Scores come back from White's point of view (UCI gives them for
 * the side to move).
 */
export function startEngine(binary: string, options: { threads: number; hash: number; multipv: number }) {
  const engine = spawn(binary, [], { stdio: ['pipe', 'pipe', 'inherit'] });
  let buffer = '';
  let waiter: ((line: string) => void) | null = null;
  engine.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    let at;
    while ((at = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, at).trim();
      buffer = buffer.slice(at + 1);
      waiter?.(line);
    }
  });
  const send = (command: string) => engine.stdin.write(`${command}\n`);
  const until = (done: (line: string) => boolean) =>
    new Promise<string[]>((resolve) => {
      const lines: string[] = [];
      waiter = (line) => {
        lines.push(line);
        if (done(line)) {
          waiter = null;
          resolve(lines);
        }
      };
    });
  const ready = (async () => {
    send('uci');
    const intro = await until((line) => line === 'uciok');
    send(`setoption name Threads value ${options.threads}`);
    send(`setoption name Hash value ${options.hash}`);
    send(`setoption name MultiPV value ${options.multipv}`);
    send('isready');
    await until((line) => line === 'readyok');
    return intro.find((line) => line.startsWith('id name '))?.slice(8) ?? 'Stockfish';
  })();

  return {
    name: ready,
    async analyse(epd: string, depth: number): Promise<{ depth: number; lines: Line[] }> {
      await ready;
      send(`position fen ${epd} 0 1`);
      send(`go depth ${depth}`);
      const output = await until((line) => line.startsWith('bestmove'));
      const sign = epd.split(' ')[1] === 'w' ? 1 : -1;
      const best = new Map<number, Line>();
      let reached = 0;
      for (const line of output) {
        const match = /\bdepth (\d+)\b.*\bmultipv (\d+)\b.*\bscore (cp|mate) (-?\d+)\b.*\bpv (.+)$/.exec(line);
        if (!match || line.includes('upperbound') || line.includes('lowerbound')) continue;
        reached = Math.max(reached, Number(match[1]));
        const score = sign * Number(match[4]);
        best.set(Number(match[2]), {
          multipv: Number(match[2]),
          ...(match[3] === 'cp' ? { cp: score } : { mate: score }),
          pv: match[5]!.split(' ').slice(0, 10),
        });
      }
      return { depth: reached, lines: [...best.values()].sort((a, b) => a.multipv - b.multipv) };
    },
    quit: () => {
      send('quit');
    },
  };
}
