import { Page } from '@/components/page';
import {
  START_EPD,
  filterFamilies,
  groupFamilies,
  searchAt,
  searchLines,
  allLines,
  isMotifFamily,
  matchReason,
  relevance,
  type LineHit,
  type CatalogFilter,
  type FamilyView,
  type OpeningIndexEntry,
  type SearchIndex,
} from '@knightschool/core';
import { Search, Swords, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { loadSearchIndex } from '@/data/content';
import { useStorage } from '@/data/storage';
import { useBrowse } from '@/features/browse/store';
import { isActive, movesText, queryEpd, START_QUERY, type BoardQuery } from '@/features/courses/board-query';
import { BoardSearchDialog } from '@/features/courses/board-search';
import { useProgress } from '@/features/courses/progress';
import { readHashState, setHashState } from '@/router/location';
import { FamilyCard } from './family-card';
import { VariationCard } from './variation-card';
import { boardQueryFromHash, filterFromHash, hashFromState } from './hash-state';

type LineInfo = { id: string; name: string; kind: 'line' | 'refutation' };
type Match = { ids: Set<string>; lines: Map<string, LineInfo[]> } | null;

/** Which courses (and which of their lines) the board search matches, or null when it is not narrowing anything. */
function boardMatch(query: BoardQuery, index: SearchIndex | null, courses: OpeningIndexEntry[]): Match {
  if (!index || !isActive(query)) return null;
  const epd = queryEpd(query);
  const found = searchAt(index, epd, query.kind);
  if (!found) return { ids: new Set(), lines: new Map() };
  const lines = new Map<string, LineInfo[]>();
  if (epd !== START_EPD) {
    for (const line of found.lines) {
      const info = courses
        .find((course) => course.id === line.course)
        ?.lines.find((candidate) => candidate.id === line.line);
      const list = lines.get(line.course) ?? [];
      if (info && !list.some((existing) => existing.id === info.id)) list.push(info);
      lines.set(line.course, list);
    }
  }
  return { ids: new Set(found.courses), lines };
}

const PAGE = 100;

type Item =
  | { kind: 'opening'; view: FamilyView; name: string; score: number }
  | { kind: 'line'; hit: LineHit; name: string; score: number };

/** The long list of openings. Search finds openings and, separately, variations; filters say whether you play it or against it. */
export function OpeningsPage() {
  const { index, families, indexStatus, indexError } = useBrowse();
  const learned = useProgress((state) => state.learned);
  const storage = useStorage((state) => state.storage);
  // The search, filters and board-search moves live in the URL hash, so a refresh or a shared link shows the same list.
  const [filter, setFilter] = useState<CatalogFilter>(() => filterFromHash(readHashState()));
  const [query, setQuery] = useState<BoardQuery>(() => boardQueryFromHash(readHashState()));
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [searchFailed, setSearchFailed] = useState<string | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);

  useEffect(() => {
    void useProgress.getState().refresh();
  }, [storage]);

  useEffect(() => {
    let cancelled = false;
    loadSearchIndex()
      .then((loaded) => !cancelled && setSearchIndex(loaded))
      .catch((error: unknown) => !cancelled && setSearchFailed(error instanceof Error ? error.message : String(error)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setHashState(hashFromState(filter, query));
  }, [filter, query]);

  const match = useMemo(() => boardMatch(query, searchIndex, index), [query, searchIndex, index]);
  const views: FamilyView[] = useMemo(() => {
    const filtered = filterFamilies(groupFamilies(index, families), filter);
    if (!match) return filtered;
    return filtered.flatMap(({ family, courses }) => {
      const kept = courses.filter((course) => match.ids.has(course.id));
      return kept.length ? [{ family, courses: kept }] : [];
    });
  }, [index, families, filter, match]);
  // Lines are found by name, or (with the board search on) are the lines through the position. With nothing typed, "All"
  // and "Lines" list every one, so the page always shows openings, motifs and lines together.
  const hits: LineHit[] = useMemo(() => {
    if (filter.scope === 'openings' || filter.scope === 'motifs') return [];
    const limit = filter.query.trim() ? 60 : 300;
    if (filter.query.trim()) return searchLines(views, filter.query, limit);
    if (match) {
      return allLines(views)
        .filter((hit) => match.lines.get(hit.course.id)?.some((line) => line.id === hit.line.id))
        .slice(0, limit);
    }
    return allLines(views).slice(0, limit);
  }, [views, filter.query, filter.scope, match]);
  const matching = match
    ? new Set(views.flatMap((view) => view.courses.map((course) => course.id))).size
    : index.length;

  // Openings you have started come first, then the rest in the order they are listed.
  const ordered = useMemo(() => {
    const fraction = (view: FamilyView) => {
      const total = view.courses.reduce((sum, course) => sum + course.cards, 0);
      return total === 0 ? 0 : view.courses.reduce((sum, course) => sum + (learned[course.id] ?? 0), 0) / total;
    };
    return [...views].sort((a, b) => fraction(b) - fraction(a));
  }, [views, learned]);

  // One list. Searching ranks by relevance (a name match counts most, a match in the text around it less); with nothing
  // typed it is alphabetical. An opening, a motif and a named line are the same kind of card, so they share the list.
  const all: Item[] = useMemo(() => {
    const wanted = (motif: boolean) => filter.scope === 'all' || filter.scope === (motif ? 'motifs' : 'openings');
    const openings: Item[] = ordered
      .filter((view) => wanted(isMotifFamily(view.courses)))
      .map((view) => ({
        kind: 'opening',
        view,
        name: view.family.name,
        score: relevance(
          view.family.name,
          [
            view.family.summary,
            ...view.courses.flatMap((course) => [course.name, ...course.lines.map((l) => l.name)]),
          ].join(' '),
          filter.query,
        ),
      }));
    const lines: Item[] = hits.map((hit) => ({
      kind: 'line',
      hit,
      name: hit.line.name,
      score: relevance(hit.line.name, `${hit.course.name} ${hit.family.name} ${hit.course.summary}`, filter.query),
    }));
    return [...openings, ...lines]
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [ordered, hits, filter.query, filter.scope]);

  // Only the first hundred are drawn; "Show more" adds another hundred. Changing the search or a filter starts again.
  const signature = JSON.stringify([filter, query.played.length, query.kind]);
  const [more, setMore] = useState({ signature, extra: 0 });
  const shown = PAGE + (more.signature === signature ? more.extra : 0);
  const items = all.slice(0, shown);

  return (
    <Page>
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">Browse</h2>
        <p className="text-muted-foreground">
          Find an opening, a motif or a named line, or play moves on a board to find what covers them.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={filter.query}
            onChange={(event) => setFilter({ ...filter, query: event.target.value })}
            placeholder="Search openings, motifs and lines…"
            aria-label="Search openings, motifs and lines"
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={filter.scope}
          onValueChange={(scope) => setFilter({ ...filter, scope: (scope || 'all') as CatalogFilter['scope'] })}
          aria-label="Show"
        >
          <ToggleGroupItem value="openings">Openings</ToggleGroupItem>
          <ToggleGroupItem value="lines">Lines</ToggleGroupItem>
          <ToggleGroupItem value="motifs">Motifs</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          value={filter.role}
          onValueChange={(role) => setFilter({ ...filter, role: (role || 'all') as CatalogFilter['role'] })}
          aria-label="Playing it or against it"
        >
          <ToggleGroupItem value="all">Any</ToggleGroupItem>
          <ToggleGroupItem value="play">Play it</ToggleGroupItem>
          <ToggleGroupItem value="against">Play against it</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          value={filter.side}
          onValueChange={(side) => setFilter({ ...filter, side: (side || 'all') as CatalogFilter['side'] })}
          aria-label="Side"
        >
          <ToggleGroupItem value="all">Both</ToggleGroupItem>
          <ToggleGroupItem value="white">White</ToggleGroupItem>
          <ToggleGroupItem value="black">Black</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex">
          <Button
            variant="outline"
            className={isActive(query) ? 'rounded-r-none' : ''}
            onClick={() => setBoardOpen(true)}
          >
            <Swords aria-hidden />
            {isActive(query) ? (
              <span className="font-mono">{movesText(query.played) || 'Any position'}</span>
            ) : (
              'Search by moves'
            )}
          </Button>
          {isActive(query) && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-l-none border-l-0"
              aria-label="Clear the board search"
              onClick={() => setQuery(START_QUERY)}
            >
              <X aria-hidden />
            </Button>
          )}
        </div>
      </div>

      <BoardSearchDialog
        open={boardOpen}
        onOpenChange={setBoardOpen}
        query={query}
        onQueryChange={setQuery}
        index={searchIndex}
        courses={index}
        matches={matching}
        failed={searchFailed}
      />

      {indexStatus === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Could not load the openings</AlertTitle>
          <AlertDescription>{indexError}</AlertDescription>
        </Alert>
      )}
      {(indexStatus === 'idle' || indexStatus === 'loading') && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}
      {indexStatus === 'ready' && items.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          {match
            ? 'Nothing covers that. Open the board search to undo a move, or clear it.'
            : 'Nothing matches. Try fewer words or clear a filter.'}
        </p>
      )}
      {indexStatus === 'ready' && items.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) =>
            item.kind === 'opening' ? (
              <li key={`opening/${item.view.family.id}`} className="contents">
                <FamilyCard
                  view={item.view}
                  learned={learned}
                  matches={match?.lines}
                  reason={matchReason(item.view, filter.query)}
                />
              </li>
            ) : (
              <VariationCard key={`${item.hit.course.id}/${item.hit.line.id}`} hit={item.hit} />
            ),
          )}
        </ul>
      )}
      {indexStatus === 'ready' && all.length > items.length && (
        <div className="grid justify-items-center gap-1">
          <Button
            variant="outline"
            onClick={() => setMore({ signature, extra: (more.signature === signature ? more.extra : 0) + PAGE })}
          >
            Show {Math.min(PAGE, all.length - items.length)} more
          </Button>
          <p className="text-xs text-muted-foreground">
            Showing {items.length} of {all.length}
          </p>
        </div>
      )}
    </Page>
  );
}
