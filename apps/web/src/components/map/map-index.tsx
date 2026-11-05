import { ChevronDown, ChevronRight, Crosshair, ListTree, SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { KIND_INFO, KindBadge, shownKind, type LineKind } from '@/components/chess/kind-badge';
import { MoveRun, type RunMove } from '@/components/chess/move-run';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { forgivingMatch } from '@/components/finding/text-match';
import { cn } from '@/lib/utils';
import { laneColour } from './lane-colours';
import { alphabetical } from '@/components/finding/sort';

/** How far each level of a line's branching is drawn in, and the deepest it goes, so names stay readable. */
const INDENT = 18;
const MAX_DEPTH = 6;

export type MapIndexLine = {
  id: string;
  name: string;
  kind: LineKind;
  /** The side the line is written for; a trap for the other side shows flipped. */
  writtenFor?: 'white' | 'black';
  /** The line it grows out of (the lane layout's parent), or null. */
  parent: string | null;
  /** Its lane on the map, for the colour dot. */
  lane: number;
  /** The first two moves' group ("1.e4 e5"), when the map holds several openings. */
  group?: string;
  /** The opening it is seen in, for searching. */
  opening?: string;
  /** Share of its moves known, 0 to 1, with the Progress overlay on. */
  known?: number;
  /** Its moves, for the hover card. */
  moves?: RunMove[];
  rare?: boolean;
};

export type MapIndexProps = {
  lines: readonly MapIndexLine[];
  /** Group headings, in order; one opening shows none. `colour` is the line palette slot of its lines. */
  groups?: readonly { id: string; name: string; colour?: number }[];
  /**
   * The lines in view: the list is flat under each group, each group's heading opens the rest of its lines, and a
   * search still finds every line. Without it, lines nest under the line they grow from.
   */
  visible?: ReadonlySet<string>;
  /** The groups opened, and the heading's click. */
  expanded?: ReadonlySet<string>;
  onGroup?: (id: string) => void;
  picked?: string | null;
  subtree?: string | null;
  folded?: ReadonlySet<string>;
  onPick?: (line: string) => void;
  /** Draw only this line's subtree (the crosshair, a group's name), or null for all. */
  onSubtree?: (line: string | null) => void;
  onFold?: (line: string, folded: boolean) => void;
  onOpenAll?: () => void;
  search?: boolean;
  showProgress?: boolean;
  /** `level.includeRare`: rare lines listed greyed, or hidden. */
  rare?: 'grey' | 'hide';
  side?: 'white' | 'black';
  className?: string;
};

/**
 * The list beside the map, shaped like the tree: each line under the line it grows out of, grouped by first moves,
 * with a box to find a line (docs/v2/components/map-index.md). Folding only tidies; it never removes a line's moves
 * from coverage or progress.
 */
export function MapIndex({
  lines,
  groups,
  visible,
  expanded,
  onGroup,
  picked,
  subtree,
  folded = new Set<string>(),
  onPick,
  onSubtree,
  onFold,
  onOpenAll,
  search = true,
  showProgress = false,
  rare = 'grey',
  side,
  className,
}: MapIndexProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(true);
  const list = useRef<HTMLUListElement>(null);
  // The picked line stays in view in a long list.
  useEffect(() => {
    list.current?.querySelector(`[data-entry="${picked}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [picked]);
  const shown = lines.filter((line) => !(rare === 'hide' && line.rare));
  const byId = new Map(shown.map((line) => [line.id, line]));
  // A line whose parent is in another group starts its own branch there.
  const parentIn = (line: MapIndexLine) => {
    const parent = line.parent ? byId.get(line.parent) : undefined;
    return parent && parent.group === line.group ? parent.id : null;
  };
  const children = (id: string | null, group?: string) =>
    shown.filter((line) => parentIn(line) === id && (id !== null || line.group === group));
  const matches = query.trim()
    ? shown
        .map((line) => ({
          line,
          match: forgivingMatch(query, `${line.name} ${line.opening ?? ''} ${line.group ?? ''}`),
        }))
        .filter((m) => m.match)
        .sort((a, b) => b.match!.score - a.match!.score)
        .map((m) => m.line)
    : null;

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const entries = [...(list.current?.querySelectorAll<HTMLElement>('[data-entry]') ?? [])];
    const at = entries.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    const id = entries[at]!.dataset.entry!;
    const line = byId.get(id);
    if (event.key === 'ArrowDown') entries[Math.min(entries.length - 1, at + 1)]?.focus();
    else if (event.key === 'ArrowUp') entries[Math.max(0, at - 1)]?.focus();
    // In the flat list nothing folds: left and right belong to the board.
    else if (visible) return;
    else if (event.key === 'ArrowRight' && folded.has(id)) onFold?.(id, false);
    else if (event.key === 'ArrowLeft') {
      if (!folded.has(id) && children(id).length > 0) onFold?.(id, true);
      else if (line?.parent) entries.find((entry) => entry.dataset.entry === line.parent)?.focus();
    } else return;
    event.preventDefault();
  };

  const entry = (line: MapIndexLine, depth: number, groupName?: string) => {
    const kids = matches || visible ? [] : children(line.id);
    const isFolded = folded.has(line.id);
    return (
      <li
        key={line.id}
        role="treeitem"
        aria-expanded={kids.length ? !isFolded : undefined}
        aria-selected={picked === line.id}
      >
        <div
          className={cn(
            'group flex items-center gap-1 rounded-md pr-1 hover:bg-muted/60',
            picked === line.id && 'bg-muted',
            subtree === line.id && 'ring-1 ring-ring',
            line.rare && 'opacity-60',
          )}
          style={{ paddingLeft: depth * INDENT }}
        >
          {kids.length > 0 ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={isFolded ? `Unfold what grows from ${line.name}` : `Fold what grows from ${line.name}`}
              onClick={() => onFold?.(line.id, !isFolded)}
            >
              {isFolded ? <ChevronRight aria-hidden /> : <ChevronDown aria-hidden />}
            </Button>
          ) : visible ? null : (
            <span className="size-6 shrink-0" />
          )}
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: laneColour(line.lane) }}
            aria-hidden
          />
          <HoverCard openDelay={400} closeDelay={150}>
            <HoverCardTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                data-entry={line.id}
                onClick={() => onPick?.(line.id)}
                className="h-7 min-w-0 flex-1 shrink justify-start truncate px-1 font-normal hover:bg-transparent"
              >
                <span className="truncate">{line.name}</span>
                {groupName ? <span className="truncate text-muted-foreground">, {groupName}</span> : null}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent side="right" className="grid w-80 gap-1.5">
              <p className="font-medium">{line.name}</p>
              <p className="text-xs text-muted-foreground">
                {KIND_INFO[shownKind(line.kind, line.writtenFor, side)].name}
                {line.opening ? `, in the ${line.opening}` : ''}
                {line.known !== undefined ? `, ${Math.round(line.known * 100)}% known` : ''}
              </p>
              {line.moves ? (
                <div className="text-sm">
                  <MoveRun moves={line.moves} side={side} orientation={side} />
                </div>
              ) : null}
            </HoverCardContent>
          </HoverCard>
          <KindBadge kind={line.kind} writtenFor={line.writtenFor} learner={side} size="sm" />
          {showProgress && line.known !== undefined ? (
            <span
              className="h-1 w-8 overflow-hidden rounded-full bg-muted"
              aria-label={`${Math.round(line.known * 100)}% known`}
            >
              <span className="block h-full bg-state-known" style={{ width: `${line.known * 100}%` }} />
            </span>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Draw only ${line.name} and what grows from it`}
                onClick={() => onSubtree?.(line.id)}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Crosshair aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Draw only this line and what grows from it</TooltipContent>
          </Tooltip>
        </div>
        {kids.length > 0 && !isFolded ? (
          <ul role="group" className="grid grid-cols-[minmax(0,1fr)]">
            {kids.map((kid) => entry(kid, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  const groupName = (id?: string) => groups?.find((g) => g.id === id)?.name;
  const body = (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {search ? (
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            placeholder="Find a line"
            aria-label="Find a line"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches?.[0]) onPick?.(matches[0].id);
              if (event.key === 'Escape') setQuery('');
              event.stopPropagation();
            }}
          />
        </InputGroup>
      ) : null}
      <ul
        ref={list}
        role="tree"
        aria-label="Lines"
        onKeyDown={onKeyDown}
        className="grid grid-cols-[minmax(0,1fr)] gap-px text-sm"
      >
        {matches ? (
          matches.length === 0 ? (
            <li className="px-2 py-3">
              <EmptyState
                kind="no-match"
                size="part"
                text={`No line matches '${query}'.`}
                action={{ label: 'Clear the search', onClick: () => setQuery('') }}
              />
            </li>
          ) : (
            matches.map((line) => entry(line, 0, groups && groups.length > 1 ? groupName(line.group) : undefined))
          )
        ) : visible && groups ? (
          groups.map((group) => {
            const all = shown.filter((line) => line.group === group.id);
            if (all.length === 0) return null;
            const open = expanded?.has(group.id);
            const inView = all.filter((line) => visible.has(line.id)).sort((a, b) => alphabetical(a.name, b.name));
            // Each line right under the one it grows from, indented by how deep it sits in this variation.
            const here = new Set(inView.map((line) => line.id));
            const tree: { line: MapIndexLine; depth: number }[] = [];
            const walk = (line: MapIndexLine, depth: number) => {
              tree.push({ line, depth });
              for (const child of inView) if (child.parent === line.id) walk(child, depth + 1);
            };
            for (const line of inView) if (!line.parent || !here.has(line.parent)) walk(line, 1);
            return (
              <li key={group.id} role="none" className="grid grid-cols-[minmax(0,1fr)] gap-px pt-1">
                <Button
                  variant="ghost"
                  size="xs"
                  aria-expanded={Boolean(open)}
                  onClick={() => onGroup?.(group.id)}
                  className="h-7 justify-start gap-1.5 px-1 font-medium"
                >
                  {open ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: laneColour(group.colour ?? 0) }}
                    aria-hidden
                  />
                  <span className="truncate">{group.name}</span>
                  <span className="ml-auto font-normal text-muted-foreground tabular-nums">{all.length}</span>
                </Button>
                <ul role="group" className="grid grid-cols-[minmax(0,1fr)]">
                  {tree.map(({ line, depth }) => entry(line, Math.min(depth, MAX_DEPTH)))}
                </ul>
              </li>
            );
          })
        ) : groups && groups.length > 1 ? (
          groups.map((group) => {
            const roots = children(null, group.id);
            if (roots.length === 0) return null;
            return (
              <li key={group.id} role="none" className="grid grid-cols-[minmax(0,1fr)] gap-px pt-1">
                <Button
                  variant="ghost"
                  size="xs"
                  className="justify-start px-1 font-mono text-xs font-semibold text-muted-foreground"
                  onClick={() => onSubtree?.(roots[0]!.id)}
                  title="Draw only this group"
                >
                  {group.name}
                  <span className="font-sans font-normal">{shown.filter((l) => l.group === group.id).length}</span>
                </Button>
                <ul role="group" className="grid grid-cols-[minmax(0,1fr)]">
                  {roots.map((root) => entry(root, 0))}
                </ul>
              </li>
            );
          })
        ) : (
          children(null, shown[0]?.group).map((root) => entry(root, 0))
        )}
      </ul>
      {visible ? null : (
        <div className="flex gap-1 border-t pt-2">
          <Button variant="ghost" size="xs" disabled={!subtree} onClick={() => onSubtree?.(null)}>
            Show all
          </Button>
          <Button variant="ghost" size="xs" disabled={folded.size === 0} onClick={onOpenAll}>
            Open all
          </Button>
        </div>
      )}
    </div>
  );

  // On a phone the index is a collapsible list under the board; from md it is always open.
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2', className)}
    >
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="justify-between md:hidden">
          <span className="inline-flex items-center gap-1.5">
            <ListTree aria-hidden />
            Lines ({shown.length})
          </span>
          <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        forceMount
        className="max-h-[50vh] overflow-y-auto data-[state=closed]:hidden md:max-h-none md:data-[state=closed]:block"
      >
        {body}
      </CollapsibleContent>
    </Collapsible>
  );
}
