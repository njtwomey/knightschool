import {
  ancestorsOf,
  compress,
  everyMove,
  openToDepth,
  pathOf,
  prefixId,
  runText,
  scopeTree,
  type CompressedTree,
  type MoveRun,
  type OpeningContent,
} from '@knightschool/core';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from 'cn';
import { StaticBoard } from '@/components/board/static-board';
import { RichText } from '@/components/rich-text';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { loadOpening } from '@/data/content';
import { useBrowse } from '@/features/browse/store';
import { lineHref } from '@/features/line/tabs';
import { navigate } from '@/router/location';
import { branchName, homeCourse, matchingLines } from './labels';
import { RunDetails } from './run-details';
import { TreeDiagram, type DiagramMode } from './tree-diagram';
import { useMoveTree } from './use-move-tree';

/** How many line colours the theme defines (`--line-0` and on, in index.css). */
const LINE_COLORS = 10;

export type TreeViewProps = {
  /** Every move a node (one course) or only branch points (many courses). Chosen from `courses` when left out. */
  mode?: DiagramMode;
  /** Draw only the lines these courses list; all lines when left out. */
  courses?: string[];
  /** A line to draw in the primary colour, opened and selected at first. */
  line?: string;
  /** A search: the lines it matches are opened and ringed. */
  query?: string;
  /** Levels of branches open at first. */
  depth?: number;
  /** The course to open lines in, where it lists them. */
  preferCourse?: string;
  /** Put the details beside the drawing on a wide screen, rather than below it. */
  beside?: boolean;
  /** The selected node, for a page that keeps it in its address. */
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  className?: string;
};

const childrenOf = (tree: CompressedTree) => (id: string) => tree.runs.get(id)?.children ?? [];

/**
 * The tree of lines (the curriculum, one course, or a course with one line picked out) with the details of the node
 * picked. The one component behind /tree, the course page's tree and a line's About tab.
 */
export function TreeView({
  courses,
  line,
  query = '',
  depth = 2,
  preferCourse,
  beside,
  className,
  ...rest
}: TreeViewProps) {
  const { loaded, error } = useMoveTree();
  const index = useBrowse((state) => state.index);
  const courseName = (id: string) => index.find((course) => course.id === id)?.name ?? id;
  const scopeKey = courses?.join(',');

  const scoped = useMemo(
    () => (loaded ? scopeTree(loaded.tree, courses ? { courses } : {}) : null),
    // The courses array is new on every render of the caller; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, scopeKey],
  );
  const mode: DiagramMode = rest.mode ?? (courses?.length === 1 ? 'moves' : 'branches');
  const tree = useMemo(
    () => (scoped ? (mode === 'moves' ? everyMove(scoped) : compress(scoped)) : null),
    [scoped, mode],
  );
  const content = useCourseContent(mode === 'moves' && courses?.length === 1 ? courses[0]! : null);

  // The line drawn strongly: one hovered in the key, else one clicked there, else the page's own.
  const [keyHover, setKeyHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = keyHover ?? pinned ?? line ?? null;
  const path = useMemo(() => (scoped && active ? pathOf(scoped, active) : []), [scoped, active]);
  const highlight = useMemo(() => new Set(path), [path]);
  const lineEnd = useMemo(() => (scoped && line ? (pathOf(scoped, line).at(-1) ?? null) : null), [scoped, line]);

  // Each line its own colour, in the course's teaching order.
  const order = useMemo(() => {
    const course = courses?.length === 1 ? index.find((entry) => entry.id === courses[0]) : undefined;
    const ids = course ? course.lines.map((entry) => entry.id) : [...(scoped?.paths.keys() ?? [])];
    return new Map(ids.map((id, i) => [id, i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, index, scopeKey]);
  const lineColor = (id: string) => `var(--line-${(order.get(id) ?? 0) % LINE_COLORS})`;

  const marked = useMemo(() => {
    if (!scoped || !loaded) return new Set<string>();
    const inScope = [...scoped.paths.keys()].flatMap((id) => loaded.chapters.get(id) ?? []);
    return new Set(matchingLines(query, inScope, courseName).map((id) => prefixId(scoped.paths.get(id)!.moves)));
    // courseName reads the index, which only grows once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, loaded, query, index]);

  // What is open starts again from the top levels (and the line's branches) whenever the tree drawn changes.
  const initial = useMemo(() => {
    if (!tree) return new Set<string>();
    const start = openToDepth(tree.root, childrenOf(tree), depth);
    if (lineEnd) for (const id of ancestorsOf([lineEnd], (id) => tree.runs.get(id)?.parent)) start.add(id);
    return start;
  }, [tree, depth, lineEnd]);
  const [state, setState] = useState({ base: initial, open: initial });
  const open = state.base === initial ? state.open : initial;
  const setOpen = (update: (current: Set<string>) => Set<string>) => setState({ base: initial, open: update(open) });
  const shown = useMemo(() => {
    const all = new Set(open);
    if (tree) for (const id of ancestorsOf(marked, (id) => tree.runs.get(id)?.parent)) all.add(id);
    return all;
  }, [open, marked, tree]);

  const [ownSelected, setOwnSelected] = useState<string | null>(null);
  const controlled = rest.onSelect !== undefined;
  const selectedId = (controlled ? rest.selected : ownSelected) ?? (mode === 'branches' ? lineEnd : null);
  const select = (id: string | null) => (controlled ? rest.onSelect!(id) : setOwnSelected(id));
  const selectedRun = selectedId ? tree?.runs.get(selectedId) : undefined;

  const toggle = (id: string) =>
    setOpen((current: Set<string>) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!tree || !scoped || !loaded) return <Skeleton className="h-96 w-full" />;
  if (scoped.paths.size === 0) return <p className="text-sm text-muted-foreground">No lines to draw here.</p>;

  const lineSide = (id: string) => loaded.chapters.get(id)?.side;
  const lineName = (id: string) => scoped.paths.get(id)?.name ?? id;
  const onNode = (id: string) => {
    const run = tree.runs.get(id);
    const only = run?.lines.length === 1 ? run.lines[0]! : null;
    const home = only ? homeCourse(loaded.chapters.get(only) ?? { courses: [] }, preferCourse) : null;
    // A move on one line only opens that line; a shared move shows what goes through it.
    if (mode === 'moves' && only && home && only !== line) navigate(lineHref(home, only));
    else select(id === selectedId ? null : id);
  };
  const comment = (run: MoveRun) => {
    const last = run.moves.at(-1);
    const before = last?.parent ? scoped.nodes.get(last.parent)?.epd : undefined;
    return before ? content?.nodes[before]?.moves.find((move) => move.uci === last!.uci)?.annotation?.text : undefined;
  };

  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)] gap-4',
        beside && (mode === 'branches' || selectedRun) && 'lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start',
        className,
      )}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        {mode === 'moves' && (
          <LineKey
            lines={[...scoped.paths.keys()].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))}
            name={lineName}
            color={lineColor}
            active={active}
            pinned={pinned ?? line ?? null}
            onHover={setKeyHover}
            onPick={(id) => setPinned((current) => (current === id ? null : id))}
          />
        )}
        <TreeDiagram
          mode={mode}
          colorOf={(run) => (run.lines.length === 1 ? lineColor(run.lines[0]!) : null)}
          dimmed={(run) => highlight.size > 0 && !highlight.has(run.id)}
          hoverCard={
            mode === 'moves'
              ? (run) => <MoveCard run={run} name={lineName} color={lineColor} comment={comment(run)} />
              : undefined
          }
          tree={tree}
          open={shown}
          onToggle={toggle}
          selected={selectedId}
          onSelect={onNode}
          highlight={highlight}
          marked={marked}
          focus={[...marked][0] ?? lineEnd}
          lineName={lineName}
          lineSide={lineSide}
          branchName={(run) => branchName(run.lines, loaded.chapters)}
          tools={
            <>
              <Button variant="ghost" size="sm" onClick={() => setOpen(() => new Set(tree.runs.keys()))}>
                <ChevronsUpDown aria-hidden /> Open all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(() => new Set([tree.root]))}>
                <ChevronsDownUp aria-hidden /> Fold all
              </Button>
            </>
          }
        />
        {mode === 'branches' ? (
          <Legend />
        ) : (
          <p className="text-xs text-muted-foreground">
            Each line has its colour; grey moves are shared by several lines. Point at a move to see it, click a move on
            one line to open that line, and click a name in the key to pick its line out.
          </p>
        )}
      </div>
      <div className={cn('min-w-0', beside && 'lg:sticky lg:top-20', mode === 'moves' && !selectedRun && 'hidden')}>
        {selectedRun ? (
          <RunDetails
            run={selectedRun}
            tree={scoped}
            chapters={loaded.chapters}
            courseName={courseName}
            preferCourse={preferCourse}
            open={shown.has(selectedRun.id)}
            onToggle={() => toggle(selectedRun.id)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a point in the tree to see its position and the lines through it. Double-click a branch to fold it.
          </p>
        )}
      </div>
    </div>
  );
}

/** What the marks mean. */
function Legend() {
  const mark = (className: string, r = 5) => (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <circle cx="7" cy="7" r={r} className={className} strokeWidth={2} />
    </svg>
  );
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">{mark('fill-background stroke-foreground')} A line for White ends</li>
      <li className="flex items-center gap-1.5">{mark('fill-foreground stroke-foreground')} A line for Black ends</li>
      <li className="flex items-center gap-1.5">{mark('fill-muted-foreground', 3.5)} The lines part</li>
      <li className="flex items-center gap-1.5">
        <span className="rounded-full border bg-secondary px-1.5 text-[10px] text-secondary-foreground">+5</span> A
        folded branch and its lines
      </li>
    </ul>
  );
}

/** A course's content (for the comments on moves), or null while it loads or when there is no one course. */
function useCourseContent(course: string | null): OpeningContent | null {
  const [content, setContent] = useState<{ course: string; content: OpeningContent } | null>(null);
  useEffect(() => {
    if (!course) return;
    let live = true;
    loadOpening(course)
      .then((loaded) => live && setContent({ course, content: loaded }))
      .catch(() => undefined); // the tree still draws; it only lacks the comments
    return () => {
      live = false;
    };
  }, [course]);
  return content && content.course === course ? content.content : null;
}

/** The key: each line of the course in its colour. Pointing at one picks its path out; clicking keeps it picked. */
function LineKey({
  lines,
  name,
  color,
  active,
  pinned,
  onHover,
  onPick,
}: {
  lines: string[];
  name: (id: string) => string;
  color: (id: string) => string;
  active: string | null;
  pinned: string | null;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
}) {
  return (
    <ul
      className="flex gap-1 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"
      aria-label="Lines in this tree"
    >
      {lines.map((id) => (
        <li key={id} className="shrink-0 md:shrink">
          <Button
            variant={pinned === id ? 'secondary' : 'ghost'}
            size="xs"
            aria-pressed={pinned === id}
            className={cn(
              'h-auto min-h-6 max-w-64 justify-start py-0.5 text-left',
              active && active !== id && 'opacity-60',
            )}
            onPointerEnter={() => onHover(id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(id)}
            onBlur={() => onHover(null)}
            onClick={() => onPick(id)}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: color(id) }} aria-hidden />
            <span className="truncate">{name(id)}</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** What a hovered move is: the move, the position after it, its comment, and the lines that go through it. */
function MoveCard({
  run,
  name,
  color,
  comment,
}: {
  run: MoveRun;
  name: (id: string) => string;
  color: (id: string) => string;
  comment: string | undefined;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 text-xs">
      <p className="text-sm font-semibold">{run.moves.length ? runText(run) : 'The start'}</p>
      <div className="w-40">
        <StaticBoard id="tree-move-card" source={{ epd: run.epd }} coordinates={false} />
      </div>
      {comment && (
        <p className="leading-snug">
          <RichText text={comment} />
        </p>
      )}
      <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5">
        {run.lines.slice(0, 6).map((id) => (
          <li key={id} className="flex min-w-0 items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ background: color(id) }} aria-hidden />
            <span className="min-w-0 truncate">{name(id)}</span>
          </li>
        ))}
        {run.lines.length > 6 && <li className="text-muted-foreground">and {run.lines.length - 6} more</li>}
      </ul>
    </div>
  );
}
