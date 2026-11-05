import { START_EPD, replay, type Played } from '@knightschool/core';
import { X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { keyTaken } from '@/components/board/key-owner';
import { PositionCard } from '@/components/chess/position-card';
import { BoardSearch } from '@/components/finding/board-search';
import { FilterToggle } from '@/components/finding/filter-toggle';
import { KIND_OPTIONS, ROLE_OPTIONS, SCOPE_OPTIONS, SIDE_OPTIONS } from '@/components/finding/filter-options';
import {
  indexLines,
  linesAt,
  nearestName,
  passesKind,
  passesScope,
  passesWho,
  searchItems,
  throughPosition,
  type PositionHit,
  type SearchItem,
  type SearchResult,
  type SearchScope,
} from '@/components/finding/search';
import { SearchBox } from '@/components/finding/search-box';
import { normalise } from '@/components/finding/text-match';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { PageShell } from '@/components/shared/page-shell';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
import { EMPTY_VIEW, writeBoardHash } from '@/pages/board/board-hash';
import { navigate, to } from '@/router/location';
import { ResultCard } from './result-cards';
import { loadPositionNames, loadSearchData, type SearchData } from './search-data';
import { EMPTY_SEARCH, readSearchHash, writeSearchHash, type SearchView } from './search-hash';

/** The search page's own address: `/search` and `/browse` show the same page and settle here. */
const ADDRESS = '/explore/search';
/** Moves shown on the position's card, the last ones. */
const POSITION_MOVES = 8;

const boardHref = (ucis: readonly string[]) =>
  to('/board') + writeBoardHash({ ...EMPTY_VIEW, moves: [...ucis], ply: ucis.length });

const isLineScope = (scope: SearchScope) => scope === 'all' || scope === 'lines';

/** Why a result is here with nothing typed: the board search put it there. */
function positionReason(item: SearchItem, hits: readonly PositionHit[]) {
  if (item.kind === 'line') {
    const hit = hits.find((candidate) => candidate.line.id === item.id);
    return hit?.transposed ? 'Reached by another move order' : 'Through this position';
  }
  const through = hits.filter((hit) => item.lines?.includes(hit.line.id)).length;
  return `${through} ${through === 1 ? 'line' : 'lines'} through this position`;
}

function Why({ result }: { result: SearchResult }) {
  if (!result.why) return null;
  return (
    <>
      <span className="sr-only">Why it matched: </span>
      {result.why}
      {result.quote ? <span className="italic">: {result.quote}</span> : null}
    </>
  );
}

/** A heading, the first results and Show more. Keyed by the search, so a new search starts again. */
function ResultList({
  title,
  results,
  size,
  data,
  hits,
}: {
  title?: string;
  results: readonly SearchResult[];
  size: number;
  data: SearchData;
  hits: ReadonlyMap<string, PositionHit> | null;
}) {
  const [shown, setShown] = useState(size);
  if (results.length === 0) return null;
  const left = results.length - shown;
  return (
    <section className="grid gap-3">
      {title ? (
        <h2 className="flex items-baseline gap-2 text-lg font-semibold">
          {title}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">{results.length}</span>
        </h2>
      ) : null}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,24rem),1fr))] gap-3">
        {results.slice(0, shown).map((result) => {
          const view = data.views.get(result.item.id);
          const hit = hits?.get(result.item.id);
          return view ? (
            <li key={result.item.id} className="min-w-0">
              <ResultCard view={view} match={<Why result={result} />} href={hit?.line.href(hit.ply)} />
            </li>
          ) : null;
        })}
      </ul>
      {left > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShown(shown + siteConfig.search.pageSize)}>
            Show {Math.min(siteConfig.search.pageSize, left)} more
          </Button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Showing {shown} of {results.length}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** The position the board search is on: it opens on the board, and clearing it brings the whole list back. */
function PositionResult({
  played,
  name,
  hits,
  onClear,
}: {
  played: readonly Played[];
  name?: string;
  hits: readonly PositionHit[];
  onClear: () => void;
}) {
  const last = played.at(-1)!;
  const firstPly = Math.max(0, played.length - POSITION_MOVES);
  const run = played.slice(firstPly).map((move) => ({ san: move.san, uci: move.uci, after: move.epd }));
  const openings = [...new Set(hits.map((hit) => hit.line.opening))].map((opening) => ({ name: opening }));
  const count = `${hits.length} ${hits.length === 1 ? 'line passes' : 'lines pass'} through this position`;
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1 basis-80">
        <PositionCard
          layout="row"
          epd={last.epd}
          lastMove={{ from: last.from, to: last.to }}
          {...(name ? { name: { name } } : {})}
          moves={{ run, firstPly, cut: firstPly > 0 }}
          openings={openings}
          reason={`${count}. Open it on the board.`}
          href={boardHref(played.map((move) => move.uci))}
        />
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        <X aria-hidden /> Clear the position
      </Button>
    </div>
  );
}

function Search({ data }: { data: SearchData }) {
  const [view, setView] = useState<SearchView>(() => readSearchHash(window.location.hash));
  const update = (change: Partial<SearchView>) => setView((current) => ({ ...current, ...change }));
  const [boardOpen, setBoardOpen] = useState(false);
  // Typing stays quick: the box follows every key and the list catches up.
  const query = useDeferredValue(view.q);
  const typed = normalise(query) !== '';
  const { pageSize, browseSize } = siteConfig.search;

  useEffect(() => {
    const { search } = window.location;
    window.history.replaceState(window.history.state, '', `${to(ADDRESS)}${search}${writeSearchHash(view)}`);
  }, [view]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'b' || keyTaken(event) || document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      setBoardOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const names = useLoad(
    () => (boardOpen || view.bm.length > 0 ? loadPositionNames() : Promise.resolve(null)),
    [boardOpen || view.bm.length > 0],
  );
  const positionName = (epd: string) => names.data?.get(epd);

  const played = useMemo(() => replay(START_EPD, view.bm), [view.bm]);
  const index = useMemo(() => indexLines(data.lines), [data.lines]);
  const hits = useMemo(
    () => (played.length > 0 ? linesAt(index, played.at(-1)?.epd ?? START_EPD, played, view.bk) : null),
    [index, played, view.bk],
  );
  const hitById = useMemo(() => (hits ? new Map(hits.map((hit) => [hit.line.id, hit])) : null), [hits]);

  const { side, role } = view;
  // Scope and line kind only cut what is ranked here, so the toggles can count what each would show.
  const ranked = useMemo(() => {
    const who = data.items.filter((item) => passesWho(item, { side, role }));
    const pool = hits ? throughPosition(who, hits) : who;
    if (typed) return searchItems(pool, query, siteConfig.search);
    return pool.map((item) => ({ item, score: 0, why: hits ? positionReason(item, hits) : '' }));
  }, [data.items, side, role, hits, typed, query]);

  const visible = useMemo(
    () => ranked.filter(({ item }) => passesScope(item, view.scope) && passesKind(item, view.kind)),
    [ranked, view.scope, view.kind],
  );

  const roleOptions = useMemo(
    () =>
      ROLE_OPTIONS.map((option) => {
        const none =
          option.value !== 'all' &&
          option.value !== view.role &&
          !data.items.some((item) => item.roles?.includes(option.value as 'play' | 'against'));
        return none ? { ...option, disabled: true, hint: `No opening is ${option.label.toLowerCase()} yet` } : option;
      }),
    [data.items, view.role],
  );
  const lineResults = ranked.filter(({ item }) => item.kind === 'line');
  const kindOptions = KIND_OPTIONS.map((option) => {
    const count = lineResults.filter(({ item }) => passesKind(item, option.value)).length;
    return { ...option, count, disabled: count === 0 && option.value !== view.kind };
  });
  const shownLines = lineResults.filter(({ item }) => passesKind(item, view.kind)).length;
  const scopeOptions = SCOPE_OPTIONS.map((option) => {
    const count =
      option.value === 'lines'
        ? shownLines
        : option.value === 'all'
          ? view.kind === 'all'
            ? ranked.length
            : shownLines
          : ranked.filter(({ item }) => passesScope(item, option.value)).length;
    return { ...option, count, disabled: count === 0 && option.value !== view.scope };
  });

  const filtered = view.side !== 'all' || view.role !== 'all' || view.scope !== 'all' || view.kind !== 'all';
  const clearFilters = () => update({ side: 'all', role: 'all', scope: 'all', kind: 'all' });
  const searchByPosition = () => setBoardOpen(true);

  const nothing = () => {
    if (filtered) {
      return (
        <EmptyState
          kind="no-match"
          text={typed ? `Nothing matches '${query}' with these filters.` : 'Nothing here with these filters.'}
          action={{ label: 'Clear the filters', onClick: clearFilters }}
        />
      );
    }
    if (hits) {
      return (
        <EmptyState
          kind="not-covered"
          text={typed ? `Nothing through this position matches '${query}'.` : 'No line passes through this position.'}
          action={{ label: 'Change the position', onClick: searchByPosition }}
        />
      );
    }
    const near = nearestName(data.items, query);
    return near ? (
      <EmptyState
        kind="no-match"
        text={`Nothing matches '${query}'. Did you mean ${near}?`}
        action={{ label: `Search for ${near}`, onClick: () => update({ q: near }) }}
        secondary={{ label: 'Search by position', onClick: searchByPosition }}
      />
    ) : (
      <EmptyState
        kind="no-match"
        text={`Nothing matches '${query}'. Try fewer words, or search by position.`}
        action={{ label: 'Search by position', onClick: searchByPosition }}
      />
    );
  };

  // A new search or filter starts each list again.
  const signature = JSON.stringify([query, view.side, view.role, view.scope, view.kind, view.bm, view.bk]);
  const section = (title: string, scope: SearchScope) => (
    <ResultList
      key={`${scope}/${signature}`}
      title={title}
      results={visible.filter(({ item }) => passesScope(item, scope))}
      size={view.scope === 'all' ? browseSize : pageSize}
      data={data}
      hits={hitById}
    />
  );

  return (
    <div className="grid gap-5">
      <SearchBox
        form="page"
        items={data.items}
        results={visible}
        query={view.q}
        onQuery={(q) => update({ q })}
        onOpen={(item) => navigate(item.href.slice(to('').length))}
        onSearchByPosition={searchByPosition}
        focusOnArrival
        filters={
          <>
            <FilterToggle
              label="Show"
              size="sm"
              value={view.scope}
              options={scopeOptions}
              allValue="all"
              onChange={(scope) => update({ scope, ...(isLineScope(scope) ? {} : { kind: 'all' }) })}
            />
            <FilterToggle
              label="Line kind"
              size="sm"
              value={view.kind}
              options={kindOptions}
              allValue="all"
              onChange={(kind) =>
                update({ kind, ...(kind !== 'all' && !isLineScope(view.scope) ? { scope: 'all' } : {}) })
              }
            />
            <FilterToggle
              label="Side"
              size="sm"
              value={view.side}
              options={SIDE_OPTIONS}
              allValue="all"
              onChange={(side) => update({ side })}
            />
            <FilterToggle
              label="Who plays it"
              size="sm"
              value={view.role}
              options={roleOptions}
              allValue="all"
              onChange={(role) => update({ role })}
            />
          </>
        }
      />

      {played.length > 0 ? (
        <PositionResult
          played={played}
          name={positionName(played.at(-1)!.epd)}
          hits={hits ?? []}
          onClear={() => update({ bm: EMPTY_SEARCH.bm, bk: EMPTY_SEARCH.bk })}
        />
      ) : null}

      {visible.length === 0 ? (
        nothing()
      ) : typed ? (
        <ResultList key={signature} results={visible} size={pageSize} data={data} hits={hitById} />
      ) : view.scope === 'all' && view.kind === 'all' ? (
        <>
          {section('Openings', 'openings')}
          {section('Lines, main lines first', 'lines')}
          {section('Variations', 'variations')}
          {section('Ideas', 'ideas')}
        </>
      ) : (
        <ResultList key={signature} results={visible} size={pageSize} data={data} hits={hitById} />
      )}

      <BoardSearch
        form="dialog"
        lines={data.lines}
        open={boardOpen}
        onOpenChange={setBoardOpen}
        start={view.bm}
        kind={view.bk}
        onKind={(bk) => update({ bk })}
        onMoves={(_, bm) => update({ bm })}
        boardHref={(_, ucis) => boardHref(ucis)}
        positionName={positionName}
        pageSize={pageSize}
      />
    </div>
  );
}

/**
 * One search over openings, variations, lines and ideas, and search by playing an opening's moves on a board
 * (docs/v2/pages/search.md). Everything it needs loads when the page opens, so no other page pays for it.
 */
export function SearchPage() {
  const data = useLoad(loadSearchData, []);
  return (
    <PageShell
      title="Search"
      showTitle
      trail={<Breadcrumbs root={{ label: 'Explore', href: to(ADDRESS) }} crumbs={[{ label: 'Search' }]} />}
      gate={data.error ? { state: 'blocked', text: data.error } : data.data ? { state: 'ready' } : { state: 'loading' }}
    >
      {data.data ? <Search data={data.data} /> : null}
    </PageShell>
  );
}
