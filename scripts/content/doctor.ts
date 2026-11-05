/**
 * pnpm content:doctor (or: make doctor)
 *
 * Tidiness checks on the line files that a build cannot see, printed with what to do. Exits non-zero on a problem that
 * must be fixed; a warning is advice.
 * - A name clash: a line's id is its file name, wherever it lives, so two files with one name in different folders
 *   would silently be one line. An error (the build refuses it too).
 * - A line no opening lists: it builds but nobody sees it.
 * - A name that starts with a move ("nf3-e6"): names are unique across every opening, so a line named after a move
 *   carries its opening's name too ("caro-nf3-e6"), even if that is a little redundant.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { parse } from 'yaml';
import { lineFiles, root } from './load.ts';

/** Files that share a name, by the name. */
export function nameClashes(paths: readonly string[]): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  for (const path of paths) {
    const name = basename(path, '.pgn');
    byName.set(name, [...(byName.get(name) ?? []), path]);
  }
  return new Map([...byName].filter(([, found]) => found.length > 1));
}

/** Whether a line's name starts with a move: a pawn or piece move, or castling, as its first word. */
export const startsWithMove = (name: string) => /^(?:[a-h]x?[1-8]|[nbrqk]x?[a-h][1-8]|o-?o)(?:-|$)/.test(name);

function main() {
  const paths = lineFiles();
  const names = paths.map((path) => basename(path, '.pgn'));
  const listed = new Set<string>();
  const dir = join(root, 'content/openings');
  for (const file of readdirSync(dir)) {
    const opening = parse(readFileSync(join(dir, file), 'utf8')) as { variations?: { lines?: string[] }[] };
    for (const variation of opening.variations ?? []) for (const line of variation.lines ?? []) listed.add(line);
  }
  const clashes = nameClashes(paths);
  for (const [name, found] of clashes) {
    console.log(`error: "${name}" is ${found.length} files: ${found.map((path) => relative(root, path)).join(', ')}`);
  }
  const unlisted = names.filter((name) => !listed.has(name));
  for (const name of unlisted) console.log(`warning: ${name} is in no opening: list it, or remove it`);
  const moveNamed = names.filter(startsWithMove);
  for (const name of moveNamed)
    console.log(`warning: ${name} starts with a move: prefix its opening (as caro-${name} or italian-${name})`);
  console.log(
    `doctor: ${names.length} lines, ${clashes.size} name clashes, ${unlisted.length} unlisted, ${moveNamed.length} named after a move`,
  );
  if (clashes.size) process.exit(1);
}

if (process.argv[1]?.endsWith('doctor.ts')) main();
