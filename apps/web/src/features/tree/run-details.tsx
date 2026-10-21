import { numberedLine, type MoveRun, type MoveTree } from '@knightschool/core';
import { BookOpen, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { StaticBoard } from '@/components/board/static-board';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { lineHref } from '@/features/line/tabs';
import { to } from '@/router/location';
import { homeCourse } from './labels';
import type { TreeChapter } from './use-move-tree';

const SHOWN = 8;

type Props = {
  run: MoveRun;
  tree: MoveTree;
  chapters: ReadonlyMap<string, TreeChapter>;
  courseName: (id: string) => string;
  /** The course to open lines in when it lists them (the course page's own). */
  preferCourse?: string;
  open: boolean;
  onToggle: () => void;
};

/** The SAN moves from the start to a node of the tree. */
function movesTo(tree: MoveTree, id: string): string[] {
  const sans: string[] = [];
  for (let node = tree.nodes.get(id); node?.san; node = node.parent ? tree.nodes.get(node.parent) : undefined) {
    sans.unshift(node.san);
  }
  return sans;
}

/**
 * What one node of the tree is: its position, the moves to it, the lines that end there (with the courses that teach
 * them), and how many lines carry on below.
 */
export function RunDetails({ run, tree, chapters, courseName, preferCourse, open, onToggle }: Props) {
  const sans = movesTo(tree, run.id);
  const own = run.moves.length;
  const through = run.lines.filter((line) => !run.ends.includes(line));
  return (
    <div className="grid content-start gap-3 text-sm">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold leading-tight">
          {run.ends.length
            ? run.ends.map((line) => tree.paths.get(line)?.name ?? line).join(' / ')
            : run.parent === null
              ? 'The start'
              : 'A branch point'}
        </h2>
        <p className="font-mono text-xs leading-relaxed">
          <span className="text-muted-foreground">{numberedLine(sans.slice(0, sans.length - own))}</span>{' '}
          <span className="font-semibold">{numberedLine(sans.slice(sans.length - own), sans.length - own)}</span>
        </p>
      </div>
      <div className="w-full max-w-56">
        <StaticBoard id="tree-detail" source={{ epd: run.epd }} />
      </div>
      <p className="text-muted-foreground">
        {run.lines.length === 1 ? 'One line goes' : `${run.lines.length} lines go`} through here
        {run.children.length > 1 && `, and it splits ${run.children.length} ways`}.
      </p>
      {run.children.length > 0 && (
        <Button variant="outline" size="sm" className="justify-self-start" onClick={onToggle}>
          {open ? <ChevronsDownUp aria-hidden /> : <ChevronsUpDown aria-hidden />}
          {open ? 'Fold this branch' : 'Open this branch'}
        </Button>
      )}
      {run.ends.length > 0 && (
        <section className="grid gap-2" aria-label="Lines that end here">
          {run.ends.map((line) => (
            <LineEntry
              key={line}
              chapter={chapters.get(line)}
              line={line}
              name={tree.paths.get(line)?.name ?? line}
              courseName={courseName}
              preferCourse={preferCourse}
            />
          ))}
        </section>
      )}
      {through.length > 0 && (
        <section className="grid gap-1" aria-label="Lines that carry on">
          <h3 className="font-medium">{run.ends.length ? 'Carrying on from here' : 'Lines through here'}</h3>
          <ul className="grid gap-0.5">
            {through.slice(0, SHOWN).map((line) => {
              const chapter = chapters.get(line);
              const home = chapter ? homeCourse(chapter, preferCourse) : null;
              const name = tree.paths.get(line)?.name ?? line;
              return (
                <li key={line}>
                  {home ? (
                    <a className="underline-offset-4 hover:underline" href={to(lineHref(home, line))}>
                      {name}
                    </a>
                  ) : (
                    name
                  )}
                </li>
              );
            })}
          </ul>
          {through.length > SHOWN && <p className="text-muted-foreground">and {through.length - SHOWN} more below.</p>}
        </section>
      )}
    </div>
  );
}

/** A line that ends at the node: its side, and each course that lists it with links to read and learn it there. */
function LineEntry({
  chapter,
  line,
  name,
  courseName,
  preferCourse,
}: {
  chapter: TreeChapter | undefined;
  line: string;
  name: string;
  courseName: (id: string) => string;
  preferCourse?: string;
}) {
  const courses = chapter
    ? [...chapter.courses].sort((a, b) => Number(b === preferCourse) - Number(a === preferCourse))
    : [];
  return (
    <div className="grid gap-1.5 rounded-lg border p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{name}</span>
        {chapter && <Badge variant={chapter.side === 'white' ? 'outline' : 'secondary'}>for {chapter.side}</Badge>}
      </div>
      {courses.length === 0 && <p className="text-muted-foreground">No course lists this line yet.</p>}
      {courses.map((course) => (
        <div key={course} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <a className="underline-offset-4 hover:underline" href={to(lineHref(course, line))}>
            In {courseName(course)}
          </a>
          <Button asChild variant="ghost" size="xs">
            <a href={to(lineHref(course, line, 'learn'))}>
              <BookOpen aria-hidden /> Learn
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}
