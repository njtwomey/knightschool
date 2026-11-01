/**
 * make puzzles-names: gives each opening tag its moves. Every Lichess opening name (.cache/openings.tsv) is replayed;
 * `opening_names` keeps each name with its tags and final position, and `tag_positions` the positions along the
 * shortest named line of each family and variation tag ("Italian_Game_Giuoco_Piano" is 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5).
 * Seconds; run after make puzzles-index (it shares the database).
 */
import { ensureCacheDir, NAME_TABLES, openIndex, seconds } from './db.ts';
import { readOpeningNames, type Named } from './lines.ts';

const started = Date.now();
ensureCacheDir();
const { names, broken } = readOpeningNames();
const db = openIndex();
db.exec(`DROP TABLE IF EXISTS opening_names; DROP TABLE IF EXISTS tag_positions; ${NAME_TABLES}`);

// The shortest named line of each tag; on a tie, the first in the file.
const shortest = new Map<string, { kind: 'family' | 'variation'; named: Named }>();
for (const named of names) {
  for (const [kind, tag] of [
    ['family', named.family],
    ['variation', named.variation],
  ] as const) {
    const known = shortest.get(tag);
    if (!known || named.sans.length < known.named.sans.length) shortest.set(tag, { kind, named });
  }
}

const insertName = db.prepare(
  'INSERT INTO opening_names (name, eco, pgn, plies, family, variation, epd) VALUES (?, ?, ?, ?, ?, ?, ?)',
);
const insertPosition = db.prepare('INSERT INTO tag_positions (tag, kind, name, ply, epd) VALUES (?, ?, ?, ?, ?)');
db.exec('BEGIN');
for (const named of names) {
  insertName.run(
    named.name,
    named.eco,
    named.pgn,
    named.sans.length,
    named.family,
    named.variation,
    named.epds.at(-1)!,
  );
}
for (const [tag, { kind, named }] of shortest) {
  named.epds.forEach((epd, index) => insertPosition.run(tag, kind, named.name, index + 1, epd));
}
db.exec('COMMIT');

const puzzleTags = db.prepare('SELECT DISTINCT tag FROM puzzle_tags').all() as { tag: string }[];
const unnamed = puzzleTags.filter(({ tag }) => !shortest.has(tag));
const unnamedPuzzles = unnamed.length
  ? (
      db
        .prepare(`SELECT COUNT(*) AS n FROM puzzle_tags WHERE tag IN (${unnamed.map(() => '?').join(',')})`)
        .get(...unnamed.map(({ tag }) => tag)) as { n: number }
    ).n
  : 0;
db.close();
console.log(`${names.length} names (${broken} did not replay), ${shortest.size} tags with moves, ${seconds(started)}`);
console.log(
  `${puzzleTags.length - unnamed.length} of ${puzzleTags.length} puzzle tags named; ${unnamed.length} not` +
    ` (old names, as Russian_Game for Petrov), on ${unnamedPuzzles} puzzle tags`,
);
