/**
 * The Lichess opening names (lichess-org/chess-openings, CC0) for Name it: downloaded once into .cache/openings.tsv,
 * then read from there; the build needs no network once it is cached. Without a copy and without a network, Name it
 * ships no names and the build says so.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { namedPositions, parseOpeningNames, type LichessName } from '../../packages/core/src/names/names.ts';
import { root } from './load.ts';

const file = join(root, '.cache/openings.tsv');

async function download(): Promise<void> {
  const parts = await Promise.all(
    ['a', 'b', 'c', 'd', 'e'].map(async (letter) => {
      const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/master/${letter}.tsv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      const [header, ...rows] = (await response.text()).trim().split('\n');
      return { header: header!, rows };
    }),
  );
  mkdirSync(join(root, '.cache'), { recursive: true });
  writeFileSync(file, [parts[0]!.header, ...parts.flatMap((part) => part.rows)].join('\n'));
}

/** Every named position, and every name (for Name it's suggestions); undefined when there are none to be had. */
export async function lichessNames(): Promise<{ positions: Map<string, LichessName>; all: string[] } | undefined> {
  if (!existsSync(file)) {
    try {
      await download();
    } catch (error) {
      console.warn(`content: no opening names for Name it (${error instanceof Error ? error.message : error})`);
      return undefined;
    }
  }
  const rows = parseOpeningNames(readFileSync(file, 'utf8'));
  return { positions: namedPositions(rows), all: [...new Set(rows.map((row) => row.name))].sort() };
}
