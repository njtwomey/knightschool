import { laneLayout, pathOf, type MoveTree, type Side } from '@knightschool/core';
import { X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useLineStepper } from '@/components/board/line-stepper';
import { Button } from '@/components/ui/button';
import { laneColour } from './colours';
import { below, indexModel } from './index-model';
import { LaneTree } from './lane-tree';
import { TreeBoard } from './tree-board';
import { TreeIndex, type ExplorerLine } from './tree-index';

export type { ExplorerLine } from './tree-index';

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
  // The main line is picked to begin with, so the tree opens calm: one line bright, the rest muted.
  const [picked, setPicked] = useState<string | null>(initialPicked ?? lines[0]?.id ?? null);
  /** A line's whole path from the starting position, through every line it grows out of: what the steps walk. */
  const pathOfLine = (line: string) => pathOf(tree, line);
  const [cursor, setCursor] = useState<string | null>(
    initialPicked ? (pathOfLine(initialPicked).at(-1) ?? null) : null,
  );
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const colourOf = (id: string) => laneColour(indexOf.get(id) ?? 0);
  const name = (line: ExplorerLine) =>
    shortNames && line.name.includes(':') ? line.name.slice(line.name.indexOf(':') + 1).trim() || line.name : line.name;
  // Only a click changes anything: pointing at a line or a move does nothing, so the board stays where you put it.
  const lit = new Set<string>(picked ? [picked] : []);
  const shownId = cursor ?? layout.top;
  const shown = tree.nodes.get(shownId) ?? tree.nodes.get(layout.top)!;
  const parent = shown.parent ? tree.nodes.get(shown.parent) : undefined;
  const through = shown.lines.filter((id) => byId.has(id));
  const pickedLine = picked ? byId.get(picked) : undefined;
  // Where the board is on the picked line's whole path (from the starting position), for the steps: before any click, the
  // first pill (the moves every line shares).
  const steps = picked ? pathOfLine(picked) : [];
  const at = steps.indexOf(shownId);

  /**
   * The pill that stands for a move: the move itself if it is drawn, else the nearest drawn move before it (the first
   * pill stands for the moves every line shares, and a subtree's first pill for the moves above it).
   */
  const drawn = (id: string) => {
    let node = tree.nodes.get(id);
    while (node && !layout.places.has(node.id)) node = node.parent ? tree.nodes.get(node.parent) : undefined;
    return node && layout.places.has(node.id) ? node.id : layout.top;
  };
  const goTo = (node: string | undefined) => {
    if (!node) return;
    setCursor(node);
    setScrollTo(drawn(node));
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
  };
  const zoomInto = (key: string) => setSubtree(key === subtree ? null : key);
  const toggleFold = (key: string) =>
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  // The steps and the arrow keys go along the picked line; Home and End go to its first and last move.
  const stepper = useLineStepper({
    length: steps.length - 1,
    index: at,
    setIndex: (index) => goTo(steps[index]),
    atStart: !picked || at <= 0,
    atEnd: !picked || at < 0 || at >= steps.length - 1,
    disabledTitle: 'Pick a line to step through it',
  });

  return (
    <div className="grid gap-3 pb-6">
      <div className="px-4 pt-4">{header}</div>
      <div className="grid gap-4 px-4 lg:grid-cols-[16rem_minmax(0,1fr)_22rem] lg:items-start">
        <TreeIndex
          lines={lines}
          aside={aside}
          search={search}
          model={model}
          byId={byId}
          picked={picked}
          subtree={subtree}
          folded={folded}
          colourOf={colourOf}
          name={name}
          onPick={pickLine}
          onZoom={zoomInto}
          onFold={toggleFold}
          onOpenAll={() => setFolded(new Set())}
          onShowAll={() => setSubtree(null)}
        />

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
            focus={drawn(shownId)}
            scrollTo={scrollTo}
            onPick={pickNode}
            labelOf={(id) => name(byId.get(id)!)}
            zoom={zoom}
            className="max-h-[70dvh] lg:max-h-[calc(100dvh-8rem)]"
          />
          <p className="text-xs text-muted-foreground">
            One column per move; the main line runs straight across the top. Click a move, or a line in the list, to put
            it on the board and step through it with the arrows; the crosshair shows a line and every line under it;
            folding only tidies the list.
          </p>
        </section>

        <TreeBoard
          shown={shown}
          parentEpd={parent?.epd}
          through={through}
          total={lines.length}
          byId={byId}
          name={name}
          pickedLine={pickedLine}
          orientation={orientation ?? pickedLine?.side ?? 'white'}
          stepper={stepper}
        />
      </div>
    </div>
  );
}
