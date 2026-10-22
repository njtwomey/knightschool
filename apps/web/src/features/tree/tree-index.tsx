import { matchesText, type Side } from '@knightschool/core';
import { ChevronRight, Crosshair, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { below, type IndexModel } from './index-model';

/** A line as the explorer lists it: its id, what to call it, the course to open it in, and its side. */
export type ExplorerLine = { id: string; name: string; course: string; side: Side };

type EntryProps = {
  model: IndexModel;
  byId: ReadonlyMap<string, ExplorerLine>;
  picked: string | null;
  subtree: string | null;
  folded: ReadonlySet<string>;
  colourOf: (id: string) => string;
  name: (line: ExplorerLine) => string;
  onPick: (id: string) => void;
  onZoom: (id: string) => void;
  onFold: (id: string) => void;
};

/**
 * The explorer's index, shaped like the tree: in groups when the model has several (the curriculum, by its first
 * moves), each line under the line it grows out of, with a box to find lines by name when `search` is set.
 */
export function TreeIndex({
  lines,
  aside,
  search,
  onOpenAll,
  onShowAll,
  ...entryProps
}: EntryProps & {
  lines: ExplorerLine[];
  aside?: ReactNode;
  search: boolean;
  onOpenAll: () => void;
  onShowAll: () => void;
}) {
  const { model, folded, subtree, onFold, onZoom } = entryProps;
  const [query, setQuery] = useState('');
  const matches = query.trim() ? lines.filter((line) => matchesText(query, `${line.name} ${line.course}`)) : null;
  const grouped = model.groups.length > 1;
  return (
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
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onOpenAll}>
              Open all
            </Button>
          )}
          {subtree && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onShowAll}>
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
                    onClick={() => onFold(key)}
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
                    onClick={() => onZoom(key)}
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

function IndexEntry(props: EntryProps & { id: string; depth: number; flat?: boolean }) {
  const { model, byId, id, depth, picked, subtree, folded, colourOf, name, onPick, onZoom, onFold, flat } = props;
  const line = byId.get(id)!;
  const children = model.children.get(id) ?? [];
  const under = below(model, id).length;
  const open = !folded.has(id);
  const chosen = id === picked;
  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md pr-1 text-sm ${chosen ? 'bg-accent' : 'hover:bg-accent/60'}`}
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
