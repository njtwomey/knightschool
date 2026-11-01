import { ChevronDown, ChevronRight, Crosshair, ListTree, SearchIcon } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { MoveRun, type RunMove } from '@/components/chess/move-run';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { forgivingMatch } from '@/components/finding/text-match';
import { cn } from '@/lib/utils';
import { laneColour } from './lane-colours';

export type MapIndexLine = {
  id: string;
  name: string;
  kind: string;
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
  /** Group headings, in order; one opening shows none. */
  groups?: readonly { id: string; name: string }[];
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

const KIND_LABEL: Record<string, string> = {
  main: 'main',
  sideline: 'sideline',
  rare: 'rare',
  gambit: 'gambit',
  trap: 'trap',
  'trap-spring': 'trap',
  'trap-avoid': 'trap',
};
const KIND_TONE: Record<string, string> = {
  rare: 'border-dotted text-muted-foreground',
  sideline: 'text-muted-foreground',
  gambit: 'text-kind-gambit',
  trap: 'text-kind-trap-avoid',
  'trap-spring': 'text-kind-trap-spring',
  'trap-avoid': 'text-kind-trap-avoid',
};

/**
 * The list beside the map, shaped like the tree: each line under the line it grows out of, grouped by first moves,
 * with a box to find a line (docs/v2/components/map-index.md). Folding only tidies; it never removes a line's moves
 * from coverage or progress.
 */
export function MapIndex({
  lines,
  groups,
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
    else if (event.key === 'ArrowRight' && folded.has(id)) onFold?.(id, false);
    else if (event.key === 'ArrowLeft') {
      if (!folded.has(id) && children(id).length > 0) onFold?.(id, true);
      else if (line?.parent) entries.find((entry) => entry.dataset.entry === line.parent)?.focus();
    } else return;
    event.preventDefault();
  };

  const entry = (line: MapIndexLine, depth: number, groupName?: string) => {
    const kids = matches ? [] : children(line.id);
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
          style={{ paddingLeft: depth * 14 }}
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
          ) : (
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
                {KIND_LABEL[line.kind] ?? line.kind}
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
          <Badge variant="outline" className={cn('h-4 px-1.5 text-[0.65rem]', KIND_TONE[line.kind])}>
            {KIND_LABEL[line.kind] ?? line.kind}
          </Badge>
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
            <li className="px-2 py-3 text-sm text-muted-foreground">No line matches '{query}'.</li>
          ) : (
            matches.map((line) => entry(line, 0, groups && groups.length > 1 ? groupName(line.group) : undefined))
          )
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
      <div className="flex gap-1 border-t pt-2">
        <Button variant="ghost" size="xs" disabled={!subtree} onClick={() => onSubtree?.(null)}>
          Show all
        </Button>
        <Button variant="ghost" size="xs" disabled={folded.size === 0} onClick={onOpenAll}>
          Open all
        </Button>
      </div>
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
