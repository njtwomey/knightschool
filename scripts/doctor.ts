/**
 * make doctor: a report on the shape of content/, so overlaps can be tidied case by case instead of audited by hand.
 * It never fails; `pnpm content:build` is what enforces the rules.
 *
 *   - moves written out in more than one chapter (write them once: start the later chapter after them)
 *   - chapters that no course lists
 *   - lines listed by more than one course ("also in")
 *   - positions where two courses for the same side play different moves (often intended, as with gambits)
 */
import { rewrittenMoves, type OpeningContent } from '../packages/core/src/index.ts';
import { consistencyWarnings, loadCourses, loadTree } from './content-lib.ts';

const tree = loadTree();
const courses: OpeningContent[] = loadCourses();
const section = (title: string, rows: string[]) => {
  console.log(`\n${title} (${rows.length})`);
  for (const row of rows.slice(0, 40)) console.log(`  ${row}`);
  if (rows.length > 40) console.log(`  ... and ${rows.length - 40} more`);
};

// Moves written twice, grouped by the chapters involved.
const pairs = new Map<string, string[]>();
for (const edge of rewrittenMoves(tree)) {
  const key = edge.writtenIn.join(' + ');
  pairs.set(key, [...(pairs.get(key) ?? []), edge.san]);
}
section(
  'Moves written in more than one chapter',
  [...pairs].sort((a, b) => b[1].length - a[1].length).map(([key, sans]) => `${key}: ${sans.join(' ')}`),
);

const listedBy = new Map<string, string[]>();
for (const content of courses)
  for (const variant of content.opening.variants)
    listedBy.set(variant.id, [...(listedBy.get(variant.id) ?? []), content.opening.id]);
section(
  'Chapters no course lists',
  [...tree.lines.values()].filter((line) => !listedBy.has(line.id)).map((line) => line.source),
);
section(
  'Lines in more than one course',
  [...listedBy].filter(([, ids]) => ids.length > 1).map(([line, ids]) => `${line}: ${ids.join(', ')}`),
);
section(
  'Courses for the same side that play different moves',
  consistencyWarnings(courses).filter((warning) => !warning.includes('has the opponent play')),
);

const depth = new Map([...tree.lines.values()].map((line) => [line.id, line.parents.length]));
const roots = [...tree.lines.values()].filter((line) => line.parents.length === 0);
console.log(
  `\n${tree.lines.size} chapters, ${tree.edges.size} moves, ${roots.length} chapters from the initial position, ` +
    `deepest branching ${Math.max(...depth.values())} chapters`,
);
