import { laneLayout, numberedMove, subtreeOf, type LaneLayout, type OpeningContent } from '@knightschool/core';
import { BookOpen, ChevronRight, Crosshair, Target, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { RichText } from '@/components/rich-text';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { loadOpening } from '@/data/content';
import { CourseBreadcrumbs, PlayBreadcrumbs } from '@/features/browse/breadcrumbs';
import { useBrowse } from '@/features/browse/store';
import { lineHref } from '@/features/line/tabs';
import { to } from '@/router/location';
import { laneColour } from './colours';
import { LaneTree } from './lane-tree';
import { useMoveTree } from './use-move-tree';

/** A line's name without the opening the course is about: "Evans Gambit, Morphy Attack". */
const shortName = (name: string) => (name.includes(':') ? name.slice(name.indexOf(':') + 1).trim() || name : name);

type Line = { id: string; name: string };

/**
 * A course as a tree, on a full-width page of its own (/course/<id>/tree, and a line's Tree tab with that line picked).
 * Three columns: on the left the index, the lines as a hierarchy shaped like the tree (each under the line it grows
 * out of, foldable), where pointing at a line lights its path and shows its last position, clicking picks it and
 * scrolls the tree to where it branches, and the crosshair shows only it and what grows out of it; in the middle the
 * tree, one column per move and the main line straight across the top, scrolling sideways; on the right a small board
 * with the move last pointed at and its comment.
 */
export function CourseTreePage({ course, line }: { course: string; line?: string }) {
  const { loaded, error } = useMoveTree();
  const index = useBrowse((state) => state.index);
  const entry = index.find((candidate) => candidate.id === course);
  const [content, setContent] = useState<OpeningContent | null>(null);
  useEffect(() => {
    let live = true;
    loadOpening(course)
      .then((opened) => live && setContent(opened))
      .catch(() => undefined); // comments are a bonus; the tree works without them
    return () => {
      live = false;
    };
  }, [course]);

  const all = useMemo(() => (entry?.lines ?? []).map((candidate) => candidate.id), [entry]);
  const full = useMemo(() => (loaded && all.length ? laneLayout(loaded.tree, all) : null), [loaded, all]);
  const [only, setOnly] = useState<string | null>(null);
  const layout = useMemo(
    () => (loaded && full && only ? laneLayout(loaded.tree, subtreeOf(full, only)) : full),
    [loaded, full, only],
  );
  const [picked, setPicked] = useState<string | null>(line ?? null);
  const [pointed, setPointed] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  const header = (
    <div className="px-4 pt-4">
      {line !== undefined ? (
        <PlayBreadcrumbs course={course} line={line} tab="tree" />
      ) : (
        <CourseBreadcrumbs course={course} tab="tree" />
      )}
    </div>
  );
  if (error)
    return (
      <div>
        {header}
        <Alert variant="destructive" className="m-4 w-auto">
          <AlertTitle>Could not draw the tree</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  if (!loaded || !layout || !full || !entry)
    return (
      <div>
        {header}
        <Skeleton className="m-4 h-[32rem]" />
      </div>
    );

  const { tree } = loaded;
  const lines: Line[] = entry.lines;
  const indexOf = new Map(all.map((id, i) => [id, i]));
  const colourOf = (id: string) => laneColour(indexOf.get(id) ?? 0);
  const lit = new Set([pointed ?? picked].filter((id): id is string => id !== null));
  const endOf = (id: string) => full.pathOf.get(id)?.at(-1) ?? null;
  const shownId = focus ?? (picked ? endOf(picked) : null) ?? layout.top;
  const shown = tree.nodes.get(shownId)!;
  const parent = shown.parent ? tree.nodes.get(shown.parent) : undefined;
  const comment =
    parent && content
      ? content.nodes[parent.epd]?.moves.find((move) => move.uci === shown.uci)?.annotation?.text
      : undefined;
  const through = lines.filter((candidate) => shown.lines.includes(candidate.id));

  const pick = (id: string | null) => {
    setPicked(id);
    if (id) {
      setFocus(endOf(id));
      setScrollTo(full.branchAt.get(id) ?? null);
    }
  };
  const pickNode = (id: string) => {
    setFocus(id);
    const ours = lines.filter((candidate) => tree.nodes.get(id)!.lines.includes(candidate.id));
    if (ours.length === 1) setPicked(ours[0]!.id);
  };
  const point = (id: string | null) => {
    setPointed(id);
    if (id) setFocus(endOf(id));
  };

  return (
    <div className="grid gap-3 pb-6">
      {header}
      <div className="grid gap-4 px-4 lg:grid-cols-[17rem_minmax(0,1fr)_17rem] lg:items-start">
        <nav
          aria-label="Lines in this course"
          className="order-2 grid max-h-[50dvh] content-start gap-1 overflow-y-auto overscroll-contain rounded-xl border bg-card p-2 lg:sticky lg:top-20 lg:order-none lg:max-h-[calc(100dvh-6rem)] lg:self-start"
        >
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lines</p>
            {only && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setOnly(null)}>
                <X aria-hidden /> Show all
              </Button>
            )}
          </div>
          <LineIndex
            layout={full}
            lines={lines}
            parent={null}
            depth={0}
            picked={picked}
            only={only}
            colourOf={colourOf}
            onPoint={point}
            onPick={(id) => pick(id === picked ? null : id)}
            onOnly={(id) => {
              setOnly(id === only ? null : id);
              setPicked(id);
            }}
          />
        </nav>

        <section aria-label="The tree" className="order-3 grid min-w-0 gap-2 lg:order-none">
          {only && (
            <p className="text-sm text-muted-foreground">
              Showing {shortName(lines.find((candidate) => candidate.id === only)?.name ?? only)} and what grows out of
              it.
            </p>
          )}
          <LaneTree
            tree={tree}
            layout={layout}
            colourOf={colourOf}
            lit={lit}
            focus={focus}
            scrollTo={scrollTo}
            onFocus={setFocus}
            onPick={pickNode}
            className="max-h-[70dvh] lg:max-h-[calc(100dvh-8rem)]"
          />
          <p className="text-xs text-muted-foreground">
            One column per move; the main line runs straight across the top. Point at a move or a line to see it on the
            board.
          </p>
        </section>

        <aside className="order-1 grid content-start gap-2 lg:sticky lg:top-20 lg:order-none">
          <AppBoard
            id="course-tree"
            previewable
            className="aspect-square w-full max-w-72 justify-self-center lg:max-w-none"
            epd={shown.epd}
            orientation={entry.side}
            interactive={false}
            lastMove={shown.uci ?? undefined}
          />
          <p className="text-sm font-medium">
            {shown.san ? `After ${numberedMove(shown.ply - 1, shown.san)}` : 'The start'}
          </p>
          {comment && (
            <p className="text-sm text-muted-foreground">
              <RichText text={comment} />
            </p>
          )}
          {through.length > 0 && through.length < lines.length && (
            <p className="text-xs text-muted-foreground">
              In {through.map((candidate) => shortName(candidate.name)).join(', ')}.
            </p>
          )}
          {picked && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm">
                <a href={to(lineHref(course, picked, 'learn'))}>
                  <BookOpen aria-hidden /> Learn
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={to(lineHref(course, picked, 'drill'))}>
                  <Target aria-hidden /> Drill
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={to(lineHref(course, picked, 'about'))}>About</a>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

type IndexProps = {
  layout: LaneLayout;
  lines: Line[];
  depth: number;
  picked: string | null;
  only: string | null;
  colourOf: (id: string) => string;
  onPoint: (id: string | null) => void;
  onPick: (id: string) => void;
  onOnly: (id: string) => void;
};

/** The lines that grow out of `parent`, each with its own children folded under it. */
function LineIndex({ parent, ...props }: IndexProps & { parent: string | null }) {
  const children = props.lines.filter((candidate) => (props.layout.parentOf.get(candidate.id) ?? null) === parent);
  if (children.length === 0) return null;
  return (
    <ul className={props.depth > 0 ? 'ml-3 border-l pl-1' : ''}>
      {children.map((candidate) => (
        <IndexEntry key={candidate.id} {...props} line={candidate} />
      ))}
    </ul>
  );
}

function IndexEntry(props: IndexProps & { line: Line }) {
  const { layout, lines, line, depth, picked, only, colourOf, onPoint, onPick, onOnly } = props;
  const [open, setOpen] = useState(true);
  const hasChildren = lines.some((candidate) => layout.parentOf.get(candidate.id) === line.id);
  const chosen = line.id === picked;
  const alone = only === line.id;
  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md pr-1 text-sm ${chosen ? 'bg-accent' : 'hover:bg-accent/60'}`}
        onMouseEnter={() => onPoint(line.id)}
        onMouseLeave={() => onPoint(null)}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`size-6 shrink-0 ${hasChildren ? '' : 'invisible'}`}
          aria-label={open ? 'Fold' : 'Open'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <ChevronRight className={open ? 'rotate-90 transition-transform' : 'transition-transform'} aria-hidden />
        </Button>
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: colourOf(line.id) }} />
        <Button
          variant="ghost"
          className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-1 py-1 text-left font-normal hover:bg-transparent"
          aria-pressed={chosen}
          onClick={() => onPick(line.id)}
        >
          <span className={chosen ? 'font-medium' : ''}>{shortName(line.name)}</span>
        </Button>
        {hasChildren && (
          <Button
            variant={alone ? 'secondary' : 'ghost'}
            size="icon"
            className={`size-6 shrink-0 ${alone ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
            aria-label={alone ? 'Show every line' : 'Show only this line and its branches'}
            title={alone ? 'Show every line' : 'Show only this line and its branches'}
            onClick={() => onOnly(line.id)}
          >
            <Crosshair aria-hidden />
          </Button>
        )}
      </div>
      {open && <LineIndex {...props} parent={line.id} depth={depth + 1} />}
    </li>
  );
}
