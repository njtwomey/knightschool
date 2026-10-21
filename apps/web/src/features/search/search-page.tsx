import { Page } from '@/components/page';
import {
  START_EPD,
  allLines,
  filterCourses,
  matchReason,
  plainText,
  relevance,
  searchAt,
  searchLines,
  type CatalogFilter,
  type LineHit,
  type OpeningIndexEntry,
  type SearchIndex,
} from '@knightschool/core';
import { Search, Swords, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Hint } from '@/components/hint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { loadSearchIndex } from '@/data/content';
import { useStorage } from '@/data/storage';
import { useCatalog } from '@/data/catalog-store';
import { isActive, movesText, queryEpd, START_QUERY, type BoardQuery } from './board-query';
import { BoardSearchDialog } from './board-search';
import { useProgress } from '@/data/progress-store';
import { readHashState, setHashState } from '@/router/location';
import { CourseCard } from './course-card';
import { ROLE_HINT, SCOPE_HINT, SIDE_HINT, TIER_HINT } from '@/components/tags/hints';
import { VariationCard } from './variation-card';
import { boardQueryFromHash, filterFromHash, hashFromState } from './hash-state';
import { useAsync } from '@/hooks/use-async';

type LineInfo = { id: string; name: string; kind: 'line' | 'refutation' };
/** The courses and lines the board search reaches, and the opening the position belongs to ("Englund Gambit"). */
type Match = { ids: Set<string>; lines: Map<string, LineInfo[]>; name?: string } | null;

/** Which courses (and which of their lines) the board search matches, or null when it is not narrowing anything. */
function boardMatch(query: BoardQuery, index: SearchIndex | null, courses: OpeningIndexEntry[]): Match {
  if (!index || !isActive(query)) return null;
  const epd = queryEpd(query);
  const found = searchAt(index, epd, query.kind);
  const name = index[epd]?.name;
  if (!found) return { ids: new Set(), lines: new Map(), name };
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
  return { ids: new Set(found.courses), lines, name };
}

const PAGE = 100;

type Item =
  | { kind: 'course'; course: OpeningIndexEntry; name: string; score: number }
  | { kind: 'line'; hit: LineHit; name: string; score: number };

/**
 * Search: courses in the order to study them, and every line in them. Courses and lines are the same kind of card, so one
 * search covers both. Filters say which side you play, whether you are playing an opening or against it, and the tier.
 */
export function SearchPage() {
  const { index, openings, indexStatus, indexError } = useCatalog();
  const learned = useProgress((state) => state.learned);
  const storage = useStorage((state) => state.storage);
  // The search, filters and board-search moves live in the URL hash, so a refresh or a shared link shows the same list.
  const [filter, setFilter] = useState<CatalogFilter>(() => filterFromHash(readHashState()));
  const [query, setQuery] = useState<BoardQuery>(() => boardQueryFromHash(readHashState()));
  const { data: searchIndex = null, error: searchFailed } = useAsync(loadSearchIndex, []);
  const [boardOpen, setBoardOpen] = useState(false);

  useEffect(() => {
    void useProgress.getState().refresh();
  }, [storage]);

  useEffect(() => {
    setHashState(hashFromState(filter, query));
  }, [filter, query]);

  const match = useMemo(() => boardMatch(query, searchIndex, index), [query, searchIndex, index]);
  const courses = useMemo(() => {
    const filtered = filterCourses(index, filter, openings);
    return match ? filtered.filter((course) => match.ids.has(course.id)) : filtered;
  }, [index, openings, filter, match]);
  // Lines are found by name, or (with the board search on) are the lines through the position. With nothing typed, "All"
  // and "Lines" list every one, so the page always shows courses and lines together.
  const hits: LineHit[] = useMemo(() => {
    if (filter.scope === 'courses') return [];
    const limit = filter.query.trim() ? 60 : 400;
    if (filter.query.trim()) return searchLines(courses, filter.query, limit);
    if (match) {
      return allLines(courses)
        .filter((hit) => match.lines.get(hit.course.id)?.some((line) => line.id === hit.line.id))
        .slice(0, limit);
    }
    return allLines(courses).slice(0, limit);
  }, [courses, filter.query, filter.scope, match]);
  const matching = match ? courses.length : index.length;

  // One list. Searching ranks by relevance (a name match counts most, a match in the text around it less); with nothing
  // typed the courses come in study order, then the lines.
  const all: Item[] = useMemo(() => {
    const items: Item[] =
      filter.scope === 'lines'
        ? []
        : courses.map((course) => ({
            kind: 'course',
            course,
            name: course.name,
            score: relevance(
              course.name,
              [
                plainText(course.summary),
                course.trigger,
                ...course.lines.flatMap((line) => [line.name, line.opponent]),
              ].join(' '),
              filter.query,
            ),
          }));
    const lines: Item[] = hits.map((hit) => ({
      kind: 'line',
      hit,
      name: hit.line.name,
      score: relevance(
        hit.line.name,
        `${hit.course.name} ${hit.line.opponent} ${plainText(hit.course.summary)}`,
        filter.query,
      ),
    }));
    const typed = filter.query.trim() !== '';
    const ranked = [...items, ...lines].filter((item) => item.score > 0);
    // Stable sort: with a search the best match is first, without one study order is kept.
    return typed ? ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)) : ranked;
  }, [courses, hits, filter.query, filter.scope]);

  // Only the first hundred are drawn; "Show more" adds another hundred. Changing the search or a filter starts again.
  const signature = JSON.stringify([filter, query.played.length, query.kind]);
  const [more, setMore] = useState({ signature, extra: 0 });
  const shown = PAGE + (more.signature === signature ? more.extra : 0);
  const items = all.slice(0, shown);

  return (
    <Page>
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">Search</h2>
        <p className="text-muted-foreground">
          Courses are listed in the order to study them. Find a course or a single line, or play moves on a board to
          find what covers them.
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
            placeholder="Search courses and lines…"
            aria-label="Search courses and lines"
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
          <Hint text={SCOPE_HINT.all}>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </Hint>
          <Hint text={SCOPE_HINT.courses}>
            <ToggleGroupItem value="courses">Courses</ToggleGroupItem>
          </Hint>
          <Hint text={SCOPE_HINT.lines}>
            <ToggleGroupItem value="lines">Lines</ToggleGroupItem>
          </Hint>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          value={filter.role}
          onValueChange={(role) => setFilter({ ...filter, role: (role || 'all') as CatalogFilter['role'] })}
          aria-label="Playing it or against it"
        >
          <Hint text={'Show courses whether you play the opening or meet it.'}>
            <ToggleGroupItem value="all">Any</ToggleGroupItem>
          </Hint>
          <Hint text={ROLE_HINT.play}>
            <ToggleGroupItem value="play">Play it</ToggleGroupItem>
          </Hint>
          <Hint text={ROLE_HINT.against}>
            <ToggleGroupItem value="against">Play against it</ToggleGroupItem>
          </Hint>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          value={String(filter.tier)}
          onValueChange={(tier) =>
            setFilter({ ...filter, tier: (tier ? Number(tier) : 'all') as CatalogFilter['tier'] })
          }
          aria-label="Tier"
        >
          <Hint text={TIER_HINT[1]}>
            <ToggleGroupItem value="1">Tier 1</ToggleGroupItem>
          </Hint>
          <Hint text={TIER_HINT[2]}>
            <ToggleGroupItem value="2">Tier 2</ToggleGroupItem>
          </Hint>
          <Hint text={TIER_HINT[3]}>
            <ToggleGroupItem value="3">Tier 3</ToggleGroupItem>
          </Hint>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          value={filter.side}
          onValueChange={(side) => setFilter({ ...filter, side: (side || 'all') as CatalogFilter['side'] })}
          aria-label="Side"
        >
          <Hint text={'Show courses for White and for Black.'}>
            <ToggleGroupItem value="all">Both</ToggleGroupItem>
          </Hint>
          <Hint text={SIDE_HINT.white}>
            <ToggleGroupItem value="white">White</ToggleGroupItem>
          </Hint>
          <Hint text={SIDE_HINT.black}>
            <ToggleGroupItem value="black">Black</ToggleGroupItem>
          </Hint>
        </ToggleGroup>
        <div className="flex">
          <Button
            variant="outline"
            className={isActive(query) ? 'rounded-r-none' : ''}
            onClick={() => setBoardOpen(true)}
          >
            <Swords aria-hidden />
            {isActive(query) ? (
              <span>
                <span className="font-mono">{movesText(query.played) || 'Any position'}</span>
                {match?.name && <span className="ml-2 font-medium">{match.name}</span>}
              </span>
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
            item.kind === 'course' ? (
              <li key={`course/${item.course.id}`} className="contents">
                <CourseCard
                  course={item.course}
                  openings={openings}
                  learned={learned}
                  matches={match?.lines.get(item.course.id)}
                  here={match?.name}
                  reason={matchReason(item.course, filter.query)}
                />
              </li>
            ) : (
              <VariationCard key={`${item.hit.course.id}/${item.hit.line.id}`} hit={item.hit} openings={openings} />
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
