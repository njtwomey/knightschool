import {
  laneLayout,
  matchesText,
  numberedMove,
  subtreeOf,
  type LaneLayout,
  type MoveTree,
  type OpeningContent,
  type Side,
} from '@knightschool/core';
import { BookOpen, ChevronRight, Crosshair, Target, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadOpening } from '@/data/content';
import { lineHref } from '@/features/line/tabs';
import { to } from '@/router/location';
import { laneColour } from './colours';
import { LaneTree } from './lane-tree';

/** A line as the explorer lists it: its id, what to call it, the course to open it in, and its side. */
export type ExplorerLine = { id: string; name: string; course: string; side: Side };

const courseContent = new Map<string, Promise<OpeningContent | null>>();
/** A course's content, loaded once per page load; null if it cannot be loaded (the comment is simply not shown). */
const contentOf = (course: string) => {
  let pending = courseContent.get(course);
  if (!pending) {
    pending = loadOpening(course).catch(() => null);
    courseContent.set(course, pending);
  }
  return pending;
};

/** The comment on a move, from the first of the given courses that has one. */
function useMoveComment(courses: readonly string[], fromEpd: string | undefined, uci: string | null): string | null {
  const [comment, setComment] = useState<{ key: string; text: string | null } | null>(null);
  const key = `${courses.join(',')}|${fromEpd}|${uci}`;
  useEffect(() => {
    if (!fromEpd || !uci) return;
    let live = true;
    void (async () => {
      for (const course of courses) {
        const content = await contentOf(course);
        const text = content?.nodes[fromEpd]?.moves.find((move) => move.uci === uci)?.annotation?.text;
        if (text) {
          if (live) setComment({ key, text });
          return;
        }
      }
      if (live) setComment({ key, text: null });
    })();
    return () => {
      live = false;
    };
    // `key` stands for courses, fromEpd and uci
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return comment?.key === key ? comment.text : null;
}

/**
 * Lines as a tree, full width, in three columns (a course's tree, and the whole curriculum's). On the left the index:
 * the lines as a hierarchy shaped like the tree, each under the line it grows out of. Pointing at a line lights its
 * path and shows its last position; clicking picks it and scrolls the tree to where it branches; the chevron folds its
 * branches away, in the index and in the tree; the crosshair shows only it and its branches. In the middle the tree,
 * one column per move and the first line straight across the top. On the right a board with the move last pointed at.
 */
export function TreeExplorer({
  tree,
  lines,
  header,
  picked: initialPicked,
  orientation,
  shortNames = false,
  search = false,
  aside,
  zoom,
}: {
  tree: MoveTree;
  /** In order: the first is the main line, the rest in the order their lanes are claimed. */
  lines: ExplorerLine[];
  header: ReactNode;
  picked?: string;
  /** The board's side; by default the side of the line picked, or White. */
  orientation?: Side;
  /** Leave the opening off line names ("Evans Gambit, Morphy Attack"), for a course where every line shares it. */
  shortNames?: boolean;
  /** A box above the index to find lines by name. */
  search?: boolean;
  /** Anything else for the top of the index, such as a course picker. */
  aside?: ReactNode;
  /** The tree's starting zoom: the whole curriculum starts far out, to show its shape. */
  zoom?: number;
}) {
  const ids = useMemo(() => lines.map((line) => line.id), [lines]);
  const byId = useMemo(() => new Map(lines.map((line) => [line.id, line])), [lines]);
  const full = useMemo(() => laneLayout(tree, ids), [tree, ids]);
  const [only, setOnly] = useState<string | null>(null);
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState('');
  const hidden = useMemo(() => {
    const out = new Set<string>();
    for (const line of folded) for (const below of subtreeOf(full, line).slice(1)) out.add(below);
    return out;
  }, [full, folded]);
  const layout = useMemo(() => {
    const scope = only ? subtreeOf(full, only) : ids;
    const shown = scope.filter((id) => !hidden.has(id));
    return shown.length === ids.length ? full : laneLayout(tree, shown);
  }, [tree, full, ids, only, hidden]);

  const [picked, setPicked] = useState<string | null>(initialPicked ?? null);
  const [pointed, setPointed] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const colourOf = (id: string) => laneColour(indexOf.get(id) ?? 0);
  const name = (line: ExplorerLine) =>
    shortNames && line.name.includes(':') ? line.name.slice(line.name.indexOf(':') + 1).trim() || line.name : line.name;
  const lit = new Set([pointed ?? picked].filter((id): id is string => id !== null));
  const endOf = (id: string) => full.pathOf.get(id)?.at(-1) ?? null;
  const shownId = focus ?? (picked ? endOf(picked) : null) ?? layout.top;
  const shown = tree.nodes.get(shownId)!;
  const parent = shown.parent ? tree.nodes.get(shown.parent) : undefined;
  const through = shown.lines.filter((id) => byId.has(id));
  const comment = useMoveComment([...new Set(through.map((id) => byId.get(id)!.course))], parent?.epd, shown.uci);
  const pickedLine = picked ? byId.get(picked) : undefined;
  const foldedCounts = new Map(
    [...folded].filter((id) => !hidden.has(id)).map((id) => [id, subtreeOf(full, id).length - 1] as const),
  );

  const pick = (id: string | null) => {
    setPicked(id);
    if (id) {
      setFocus(endOf(id));
      setScrollTo(full.branchAt.get(id) ?? null);
    }
  };
  const pickNode = (id: string) => {
    setFocus(id);
    const ours = tree.nodes.get(id)!.lines.filter((line) => byId.has(line) && !hidden.has(line));
    if (ours.length === 1) setPicked(ours[0]!);
  };
  const point = (id: string | null) => {
    setPointed(id);
    if (id) setFocus(endOf(id));
  };
  const toggleFold = (id: string) =>
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const matches = query.trim() ? lines.filter((line) => matchesText(query, `${line.name} ${line.course}`)) : null;

  const entryProps = {
    layout: full,
    lines,
    picked,
    only,
    folded,
    colourOf,
    name,
    onPoint: point,
    onPick: (id: string) => pick(id === picked ? null : id),
    onOnly: (id: string) => {
      setOnly(id === only ? null : id);
      setPicked(id);
    },
    onFold: toggleFold,
  };

  return (
    <div className="grid gap-3 pb-6">
      <div className="px-4 pt-4">{header}</div>
      <div className="grid gap-4 px-4 lg:grid-cols-[17rem_minmax(0,1fr)_17rem] lg:items-start">
        <nav
          aria-label="Lines"
          className="order-2 grid max-h-[50dvh] content-start gap-1 overflow-y-auto overscroll-contain rounded-xl border bg-card p-2 lg:sticky lg:top-20 lg:order-none lg:max-h-[calc(100dvh-6rem)] lg:self-start"
        >
          {aside}
          {search && (
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a line..."
              aria-label="Find a line"
              className="h-8"
            />
          )}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Lines <span className="font-normal normal-case">({lines.length})</span>
            </p>
            <div className="flex gap-1">
              {folded.size > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setFolded(new Set())}>
                  Open all
                </Button>
              )}
              {only && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setOnly(null)}>
                  <X aria-hidden /> Show all
                </Button>
              )}
            </div>
          </div>
          {matches ? (
            <ul>
              {matches.length === 0 && <li className="px-2 py-1 text-sm text-muted-foreground">No line matches.</li>}
              {matches.map((line) => (
                <IndexEntry key={line.id} {...entryProps} line={line} depth={0} flat />
              ))}
            </ul>
          ) : (
            <LineIndex {...entryProps} parent={null} depth={0} />
          )}
        </nav>

        <section aria-label="The tree" className="order-3 grid min-w-0 gap-2 lg:order-none">
          {only && (
            <p className="text-sm text-muted-foreground">Showing {name(byId.get(only)!)} and what grows out of it.</p>
          )}
          <LaneTree
            tree={tree}
            layout={layout}
            colourOf={colourOf}
            lit={lit}
            focus={focus}
            folded={foldedCounts}
            scrollTo={scrollTo}
            onFocus={setFocus}
            onPick={pickNode}
            zoom={zoom}
            className="max-h-[70dvh] lg:max-h-[calc(100dvh-8rem)]"
          />
          <p className="text-xs text-muted-foreground">
            One column per move; the main line runs straight across the top. Point at a move or a line to see it on the
            board; fold a line in the list to tuck its branches away.
          </p>
        </section>

        <aside className="order-1 grid content-start gap-2 lg:sticky lg:top-20 lg:order-none">
          <AppBoard
            id="tree-board"
            previewable
            className="aspect-square w-full max-w-72 justify-self-center lg:max-w-none"
            epd={shown.epd}
            orientation={orientation ?? pickedLine?.side ?? 'white'}
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
              {through.length > 4
                ? `${through.length} lines pass through here.`
                : `In ${through.map((id) => name(byId.get(id)!)).join(', ')}.`}
            </p>
          )}
          {pickedLine && (
            <div className="grid gap-2 pt-1">
              <p className="text-sm">{pickedLine.name}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a href={to(lineHref(pickedLine.course, pickedLine.id, 'learn'))}>
                    <BookOpen aria-hidden /> Learn
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={to(lineHref(pickedLine.course, pickedLine.id, 'drill'))}>
                    <Target aria-hidden /> Drill
                  </a>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <a href={to(lineHref(pickedLine.course, pickedLine.id, 'about'))}>About</a>
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

type EntryProps = {
  layout: LaneLayout;
  lines: ExplorerLine[];
  picked: string | null;
  only: string | null;
  folded: ReadonlySet<string>;
  colourOf: (id: string) => string;
  name: (line: ExplorerLine) => string;
  onPoint: (id: string | null) => void;
  onPick: (id: string) => void;
  onOnly: (id: string) => void;
  onFold: (id: string) => void;
};

/** The lines that grow out of `parent`, each with its own children under it unless folded. */
function LineIndex({ parent, depth, ...props }: EntryProps & { parent: string | null; depth: number }) {
  const children = props.lines.filter((line) => (props.layout.parentOf.get(line.id) ?? null) === parent);
  if (children.length === 0) return null;
  return (
    <ul className={depth > 0 ? 'ml-3 border-l pl-1' : ''}>
      {children.map((line) => (
        <IndexEntry key={line.id} {...props} line={line} depth={depth} />
      ))}
    </ul>
  );
}

function IndexEntry(props: EntryProps & { line: ExplorerLine; depth: number; flat?: boolean }) {
  const { layout, lines, line, depth, picked, only, folded, colourOf, name, onPoint, onPick, onOnly, onFold, flat } =
    props;
  const branches = lines.filter((candidate) => layout.parentOf.get(candidate.id) === line.id).length;
  const open = !folded.has(line.id);
  const chosen = line.id === picked;
  const alone = only === line.id;
  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md pr-1 text-sm ${chosen ? 'bg-accent' : 'hover:bg-accent/60'}`}
        onMouseEnter={() => onPoint(line.id)}
        onMouseLeave={() => onPoint(null)}
      >
        {!flat && (
          <Button
            variant="ghost"
            size="icon"
            className={`size-6 shrink-0 ${branches > 0 ? '' : 'invisible'}`}
            aria-label={open ? `Fold the ${branches} branches of ${line.name}` : `Open the branches of ${line.name}`}
            aria-expanded={open}
            onClick={() => onFold(line.id)}
          >
            <ChevronRight className={open ? 'rotate-90 transition-transform' : 'transition-transform'} aria-hidden />
          </Button>
        )}
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: colourOf(line.id) }} />
        <Button
          variant="ghost"
          className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-1 py-1 text-left font-normal hover:bg-transparent"
          aria-pressed={chosen}
          onClick={() => onPick(line.id)}
        >
          <span className={chosen ? 'font-medium' : ''}>
            {name(line)}
            {!open && branches > 0 && <span className="ml-1 text-xs text-muted-foreground">+{branches}</span>}
          </span>
        </Button>
        {branches > 0 && (
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
      {!flat && open && <LineIndex {...props} parent={line.id} depth={depth + 1} />}
    </li>
  );
}
