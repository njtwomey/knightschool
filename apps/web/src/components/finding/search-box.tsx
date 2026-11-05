import { Crosshair, SearchIcon, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { KIND_NAME, searchItems, type SearchItem, type SearchKind, type SearchResult } from './search';
import { RowLink } from './sortable-table';

export type SearchBoxProps = {
  /** `page`: box, filters and results; `compact`: box with a drop-down of the top eight; `filter`: box only. */
  form?: 'page' | 'compact' | 'filter';
  items: readonly SearchItem[];
  kinds?: readonly SearchKind[];
  /** Results the page has ranked and filtered itself: the box counts them and Enter opens the first; the page draws them. */
  results?: readonly SearchResult[];
  /** Filter toggles beside the box. */
  filters?: ReactNode;
  query?: string;
  onQuery?: (query: string) => void;
  /** Called with the result Enter or a click opens; without it, results are plain links. */
  onOpen?: (item: SearchItem) => void;
  /** Shows the Search by position button. */
  onSearchByPosition?: () => void;
  placeholder?: string;
  /** `/` focuses the box from anywhere on the page. */
  slashKey?: boolean;
  /** Focuses the box when it appears (the search page). */
  focusOnArrival?: boolean;
  className?: string;
};

function ResultRow({ result, active, id }: { result: SearchResult; active?: boolean; id?: string }) {
  const { item, why } = result;
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      className={cn(
        'relative grid gap-0.5 rounded-md px-3 py-2 transition-colors hover:bg-muted/60',
        active && 'bg-muted',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <RowLink href={item.href}>{item.name}</RowLink>
        <Badge variant="outline">{KIND_NAME[item.kind]}</Badge>
        {item.yours ? <Badge variant="secondary">Yours</Badge> : null}
        {item.rare ? <span className="text-xs text-muted-foreground">rare</span> : null}
      </div>
      {item.meta ? <p className="text-sm text-muted-foreground">{item.meta}</p> : null}
      <p className="text-xs text-muted-foreground">
        <span className="sr-only">Why it matched: </span>
        {why}
        {result.quote ? <span className="italic">: {result.quote}</span> : null}
      </p>
    </li>
  );
}

/**
 * A forgiving search over openings, variations, lines and ideas, ranked, each result saying why it matched
 * (docs/v2/components/search-box.md).
 */
export function SearchBox({
  form = 'page',
  items,
  kinds,
  results: ranked,
  filters,
  query: controlled,
  onQuery,
  onOpen,
  onSearchByPosition,
  placeholder = 'Search openings, lines, ideas: caro, fried liver, fork',
  slashKey = true,
  focusOnArrival,
  className,
}: SearchBoxProps) {
  const [own, setOwn] = useState('');
  const query = controlled ?? own;
  const setQuery = (next: string) => {
    setOwn(next);
    onQuery?.(next);
  };
  const [active, setActive] = useState(0);
  const [dropOpen, setDropOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(
    () =>
      ranked ??
      searchItems(kinds ? items.filter((item) => kinds.includes(item.kind)) : items, query, siteConfig.search),
    [ranked, items, kinds, query],
  );
  const shown = form === 'compact' ? results.slice(0, 8) : results;

  useEffect(() => {
    if (focusOnArrival) input.current?.focus();
  }, [focusOnArrival]);

  useEffect(() => {
    if (!slashKey) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashKey]);

  const open = (result: SearchResult | undefined) => {
    if (!result) return;
    if (onOpen) onOpen(result.item);
    else window.location.assign(result.item.href);
  };

  const box = (
    <InputGroup className={cn(form === 'page' && 'h-10')}>
      <InputGroupAddon>
        <SearchIcon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        value={query}
        placeholder={placeholder}
        aria-label="Search"
        role={form === 'compact' ? 'combobox' : undefined}
        aria-expanded={form === 'compact' ? dropOpen && query !== '' : undefined}
        aria-controls={form === 'compact' ? listId : undefined}
        aria-activedescendant={form === 'compact' && shown[active] ? `${listId}-${active}` : undefined}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setDropOpen(true);
        }}
        onFocus={() => setDropOpen(true)}
        onBlur={() => setTimeout(() => setDropOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            open(shown[form === 'compact' ? active : 0]);
          } else if (form === 'compact' && event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => Math.min(shown.length - 1, i + 1));
          } else if (form === 'compact' && event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (event.key === 'Escape') {
            if (form === 'compact' && dropOpen) setDropOpen(false);
            else setQuery('');
          }
        }}
      />
      {query ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Clear the search" onClick={() => setQuery('')}>
            <X aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      ) : slashKey ? (
        <InputGroupAddon align="inline-end">
          <Kbd>/</Kbd>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );

  const nothing = (
    <EmptyState
      kind="no-match"
      text={`Nothing matches '${query}'. Try fewer words, or search by position.`}
      action={onSearchByPosition ? { label: 'Search by position', onClick: onSearchByPosition } : undefined}
    />
  );

  if (form === 'compact') {
    return (
      <div className={cn('relative', className)}>
        {box}
        {dropOpen && query ? (
          <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {shown.length === 0 ? (
              <EmptyState kind="no-match" size="part" text={`Nothing matches '${query}'.`} className="px-3 py-2" />
            ) : (
              <ul id={listId} role="listbox" aria-label="Results" className="grid">
                {shown.map((result, i) => (
                  <ResultRow key={result.item.id} result={result} active={i === active} id={`${listId}-${i}`} />
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-64">{box}</div>
        {onSearchByPosition ? (
          <Button variant="outline" className={cn(form === 'page' && 'h-10')} onClick={onSearchByPosition}>
            <Crosshair aria-hidden />
            Search by position
          </Button>
        ) : null}
      </div>
      {filters ? <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{filters}</div> : null}
      {query ? (
        <p className="flex items-center gap-1 text-sm text-muted-foreground" aria-live="polite">
          {results.length} {results.length === 1 ? 'result' : 'results'},
          <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setQuery('')}>
            clear
          </Button>
        </p>
      ) : null}
      {form === 'page' && query && !ranked ? (
        results.length === 0 ? (
          nothing
        ) : (
          <ul role="listbox" aria-label="Results" className="grid gap-1">
            {results.map((result) => (
              <ResultRow key={result.item.id} result={result} />
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
