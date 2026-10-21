import {
  laneLayout,
  matchesText,
  numberedMove,
  type MoveTree,
  type OpeningContent,
  type Side,
} from '@knightschool/core';
import { BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Crosshair, Target, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadOpening } from '@/data/content';
import { lineHref } from '@/features/line/tabs';
import { to } from '@/router/location';
import { laneColour } from './colours';
import { below, indexModel, type IndexModel } from './index-model';
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
 * Lines as a tree, full width, in three columns (a course's tree, and the whole curriculum's). On the left the index,
 * shaped like the tree: in groups when `groupOf` is given (the curriculum, by its first moves), each line under the
 * line it grows out of. Pointing at a line lights its path and shows its last position; clicking picks it and scrolls
 * the tree to where it branches; the chevron folds a line's or a group's branches away, in the index and in the tree;
 * the crosshair lights a line or a group and everything under it and scrolls there, keeping the rest of the tree. In
 * the middle the tree, one column per move and the first line straight across the top. On the right a board with the
 * move last pointed at.
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
  groupOf,
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
  /** Groups for the index (lines with the same key are listed together under its label). */
  groupOf?: (id: string) => { key: string; label: string };
}) {
  const ids = useMemo(() => lines.map((line) => line.id), [lines]);
  const byId = useMemo(() => new Map(lines.map((line) => [line.id, line])), [lines]);
  const full = useMemo(() => laneLayout(tree, ids), [tree, ids]);
  const model = useMemo(() => indexModel(full, ids, groupOf), [full, ids, groupOf]);
  const groupLines = useMemo(() => new Map(model.groups.map((group) => [group.key, group.lines])), [model]);
  /** Folded lines and groups: a group's key is kept with a "group:" prefix so it cannot clash with a line id. */
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  /**
   * What the tree draws: everything (null), or a subtree chosen in the index: a line and every line under it (its
   * crosshair), or a group's lines (its name). Nothing else changes what is drawn: picking a line only picks it out,
   * and what is folded in the index only tidies the list.
   */
  const [subtree, setSubtree] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const scopeOf = (key: string) =>
    key.startsWith('group:') ? (groupLines.get(key.slice(6)) ?? []) : [key, ...below(model, key)];
  const layout = useMemo(() => {
    if (!subtree) return full;
    const scope = new Set(
      subtree.startsWith('group:') ? (groupLines.get(subtree.slice(6)) ?? []) : [subtree, ...below(model, subtree)],
    );
    // Never start deeper than the whole tree does, so a small subtree still shows its moves one by one.
    return laneLayout(
      tree,
      ids.filter((id) => scope.has(id)),
      { maxPly: full.firstPly },
    );
  }, [tree, full, ids, model, groupLines, subtree]);

  /**
   * The line being worked through and where on it: the board's buttons (and the arrow keys) step along it. Picking a
   * line in the index or a move in the tree sets both; pointing at a move only previews it.
   */
  const [picked, setPicked] = useState<string | null>(initialPicked ?? null);
  const pathOfLine = (line: string) => full.pathOf.get(line) ?? [];
  const [cursor, setCursor] = useState<string | null>(
    initialPicked ? (pathOfLine(initialPicked).at(-1) ?? null) : null,
  );
  const [pointed, setPointed] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const colourOf = (id: string) => laneColour(indexOf.get(id) ?? 0);
  const name = (line: ExplorerLine) =>
    shortNames && line.name.includes(':') ? line.name.slice(line.name.indexOf(':') + 1).trim() || line.name : line.name;
  const lit = new Set<string>([pointed ?? picked].filter((id): id is string => id !== null));
  const shownId = preview ?? cursor ?? layout.top;
  const shown = tree.nodes.get(shownId) ?? tree.nodes.get(layout.top)!;
  const parent = shown.parent ? tree.nodes.get(shown.parent) : undefined;
  const through = shown.lines.filter((id) => byId.has(id));
  const comment = useMoveComment([...new Set(through.map((id) => byId.get(id)!.course))], parent?.epd, shown.uci);
  const pickedLine = picked ? byId.get(picked) : undefined;
  // Where the cursor is on the picked line's moves (from the first shown), for the step buttons.
  const steps = picked ? pathOfLine(picked) : [];
  const at = cursor ? steps.indexOf(cursor) : -1;

  const goTo = (node: string | undefined) => {
    if (!node) return;
    setCursor(node);
    setPreview(null);
    setScrollTo(node);
  };
  /** Picking a line picks it out and puts the board on the move where it becomes itself; the tree stays as it is. */
  const pickLine = (line: string) => {
    setPicked(line);
    const branch = full.branchAt.get(line);
    const path = pathOfLine(line);
    goTo(path[Math.min(path.length - 1, (branch ? path.indexOf(branch) : 0) + 1)]);
  };
  /** Clicking a move picks its line and puts the board there. */
  const pickNode = (id: string) => {
    const ours = tree.nodes.get(id)!.lines.filter((line) => byId.has(line) && layout.laneOf.has(line));
    // The picked line if it passes here; else the line the move belongs to (its lane); else the first through it.
    const owner = layout.places.get(id)?.line;
    const line = picked && ours.includes(picked) ? picked : owner && ours.includes(owner) ? owner : ours[0];
    if (line) setPicked(line);
    setCursor(id);
    setPreview(null);
  };
  const point = (id: string | null) => {
    setPointed(id);
    setPreview(id ? (pathOfLine(id).at(-1) ?? null) : null);
  };
  const zoomInto = (key: string) => setSubtree(key === subtree ? null : key);
  const toggleFold = (key: string) =>
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const matches = query.trim() ? lines.filter((line) => matchesText(query, `${line.name} ${line.course}`)) : null;
  const grouped = model.groups.length > 1;

  // The arrow keys step along the picked line; Home and End go to its first and last move.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (!steps.length) return;
      const target =
        event.key === 'ArrowLeft'
          ? steps[Math.max(0, at - 1)]
          : event.key === 'ArrowRight'
            ? steps[Math.min(steps.length - 1, at + 1)]
            : event.key === 'Home'
              ? steps[0]
              : event.key === 'End'
                ? steps.at(-1)
                : undefined;
      if (!target) return;
      event.preventDefault();
      goTo(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const entryProps: EntryProps = {
    model,
    byId,
    picked,
    subtree,
    folded,
    colourOf,
    name,
    onPoint: point,
    onPick: pickLine,
    onZoom: zoomInto,
    onFold: toggleFold,
  };

  return (
    <div className="grid gap-3 pb-6">
      <div className="px-4 pt-4">{header}</div>
      <div className="grid gap-4 px-4 lg:grid-cols-[16rem_minmax(0,1fr)_22rem] lg:items-start">
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
              {subtree && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSubtree(null)}>
                  <X aria-hidden /> Show all
                </Button>
              )}
            </div>
          </div>
          {matches ? (
            <ul>
              {matches.length === 0 && <li className="px-2 py-1 text-sm text-muted-foreground">No line matches.</li>}
              {matches.map((line) => (
                <IndexEntry key={line.id} {...entryProps} id={line.id} depth={0} flat />
              ))}
            </ul>
          ) : grouped ? (
            <ul>
              {model.groups.map((group) => {
                const key = `group:${group.key}`;
                const open = !folded.has(key);
                return (
                  <li key={group.key}>
                    <div className="group flex items-center gap-1 rounded-md pr-1 text-sm hover:bg-accent/60">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        aria-label={open ? `Fold ${group.label}` : `Open ${group.label}`}
                        aria-expanded={open}
                        onClick={() => toggleFold(key)}
                      >
                        <ChevronRight
                          className={open ? 'rotate-90 transition-transform' : 'transition-transform'}
                          aria-hidden
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        className={`h-auto flex-1 justify-start px-1 py-1 font-mono text-xs font-semibold hover:bg-transparent ${subtree === key ? 'text-primary' : ''}`}
                        aria-pressed={subtree === key}
                        onClick={() => zoomInto(key)}
                        title={`Show the ${group.lines.length} lines that start ${group.label}`}
                      >
                        {group.label}
                        <span className="font-sans font-normal text-muted-foreground">{group.lines.length}</span>
                      </Button>
                    </div>
                    {open && (
                      <ul className="ml-3 border-l pl-1">
                        {group.roots.map((id) => (
                          <IndexEntry key={id} {...entryProps} id={id} depth={1} />
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul>
              {model.groups[0]?.roots.map((id) => (
                <IndexEntry key={id} {...entryProps} id={id} depth={0} />
              ))}
            </ul>
          )}
        </nav>

        <section aria-label="The tree" className="order-3 grid min-w-0 gap-2 lg:order-none">
          {subtree && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {subtree.startsWith('group:') ? (
                  <>
                    Showing the {scopeOf(subtree).length} lines that start{' '}
                    <span className="font-mono font-medium text-foreground">
                      {model.groups.find((group) => group.key === subtree.slice(6))?.label}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Showing <span className="font-medium text-foreground">{name(byId.get(subtree)!)}</span> and every
                    line under it ({scopeOf(subtree).length}).
                  </>
                )}
              </span>
              <Button variant="outline" size="sm" className="h-7" onClick={() => setSubtree(null)}>
                <X aria-hidden /> Show all
              </Button>
            </div>
          )}
          <LaneTree
            tree={tree}
            layout={layout}
            colourOf={colourOf}
            lit={lit}
            focus={shownId}
            onFocus={setPreview}
            scrollTo={scrollTo}
            onPick={pickNode}
            labelOf={(id) => name(byId.get(id)!)}
            zoom={zoom}
            className="max-h-[70dvh] lg:max-h-[calc(100dvh-8rem)]"
          />
          <p className="text-xs text-muted-foreground">
            One column per move; the main line runs straight across the top. Point at a move or a line to see it on the
            board. Pick a line, in the list or by clicking a move, to step through it with the arrows; the crosshair
            shows a line and every line under it; folding only tidies the list.
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {shown.san ? `After ${numberedMove(shown.ply - 1, shown.san)}` : 'The start'}
            </p>
            <div className="flex gap-1" role="group" aria-label="Step through the line">
              {(
                [
                  ['First move', ChevronsLeft, steps[0], at <= 0],
                  ['Previous move', ChevronLeft, steps[at - 1], at <= 0],
                  ['Next move', ChevronRight, steps[at + 1], at < 0 || at >= steps.length - 1],
                  ['Last move', ChevronsRight, steps.at(-1), at < 0 || at >= steps.length - 1],
                ] as const
              ).map(([label, Icon, target, off]) => (
                <Button
                  key={label}
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label={label}
                  title={picked ? label : 'Pick a line to step through it'}
                  disabled={!picked || off}
                  onClick={() => goTo(target)}
                >
                  <Icon aria-hidden />
                </Button>
              ))}
            </div>
          </div>
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

function CrosshairButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const label = active ? 'Show every line again' : 'Show only this line and every line under it';
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="icon"
      className={`size-6 shrink-0 ${active ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
    >
      <Crosshair aria-hidden />
    </Button>
  );
}

type EntryProps = {
  model: IndexModel;
  byId: ReadonlyMap<string, ExplorerLine>;
  picked: string | null;
  subtree: string | null;
  folded: ReadonlySet<string>;
  colourOf: (id: string) => string;
  name: (line: ExplorerLine) => string;
  onPoint: (id: string | null) => void;
  onPick: (id: string) => void;
  onZoom: (id: string) => void;
  onFold: (id: string) => void;
};

function IndexEntry(props: EntryProps & { id: string; depth: number; flat?: boolean }) {
  const { model, byId, id, depth, picked, subtree, folded, colourOf, name, onPoint, onPick, onZoom, onFold, flat } =
    props;
  const line = byId.get(id)!;
  const children = model.children.get(id) ?? [];
  const under = below(model, id).length;
  const open = !folded.has(id);
  const chosen = id === picked;
  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md pr-1 text-sm ${chosen ? 'bg-accent' : 'hover:bg-accent/60'}`}
        onMouseEnter={() => onPoint(id)}
        onMouseLeave={() => onPoint(null)}
      >
        {!flat && (
          <Button
            variant="ghost"
            size="icon"
            className={`size-6 shrink-0 ${children.length > 0 ? '' : 'invisible'}`}
            aria-label={open ? `Fold the ${under} branches of ${line.name}` : `Open the branches of ${line.name}`}
            aria-expanded={open}
            onClick={() => onFold(id)}
          >
            <ChevronRight className={open ? 'rotate-90 transition-transform' : 'transition-transform'} aria-hidden />
          </Button>
        )}
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: colourOf(id) }} />
        <Button
          variant="ghost"
          className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-1 py-1 text-left font-normal hover:bg-transparent"
          aria-pressed={chosen}
          onClick={() => onPick(id)}
        >
          <span className={chosen ? 'font-medium' : ''}>
            {name(line)}
            {!open && under > 0 && <span className="ml-1 text-xs text-muted-foreground">+{under}</span>}
          </span>
        </Button>
        {children.length > 0 && <CrosshairButton active={subtree === id} onClick={() => onZoom(id)} />}
      </div>
      {!flat && open && children.length > 0 && (
        <ul className={depth >= 0 ? 'ml-3 border-l pl-1' : ''}>
          {children.map((child) => (
            <IndexEntry key={child} {...props} id={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
