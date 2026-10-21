import { matchesText } from '@knightschool/core';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { glossary } from './use-glossary';
import { useCatalog } from '@/data/catalog-store';
import { to } from '@/router/location';
import { courseHref } from '@/router/hrefs';
import { useAsync } from '@/hooks/use-async';

/** The tactical and structural ideas the courses use, in plain words, with the courses where each turns up. */
export function GlossaryPage() {
  const index = useCatalog((state) => state.index);
  const { data: entries, error: failure } = useAsync(glossary, []);

  // A link such as /glossary#fork scrolls to that entry once the list is there.
  useEffect(() => {
    if (entries && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [entries]);

  const names = new Map(index.map((course) => [course.id, course.name]));
  const [query, setQuery] = useState('');
  const shown = useMemo(
    () =>
      (entries ?? [])
        .filter((entry) => matchesText(query, `${entry.name} ${entry.summary}`))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [entries, query],
  );
  return (
    <Page>
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">Glossary</h2>
        <p className="text-muted-foreground">The ideas that keep coming up in the courses, in plain words.</p>
      </header>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      {!entries && !failure && <Skeleton className="h-64" />}
      {entries && (
        <>
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the glossary…"
              aria-label="Search the glossary"
              className="pl-9"
            />
          </div>
          {shown.length === 0 && <p className="text-sm text-muted-foreground">Nothing in the glossary matches that.</p>}
          <dl className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((entry) => (
              <div
                key={entry.id}
                id={entry.id}
                className="grid scroll-mt-20 content-start gap-1 rounded-xl border bg-card p-3"
              >
                <dt className="flex items-center gap-2 font-semibold">
                  {entry.name}
                  <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                    {entry.group === 'tactical' ? 'tactic' : 'structure'}
                  </Badge>
                </dt>
                <dd className="text-sm text-muted-foreground">{entry.summary}</dd>
                {entry.courses.length > 0 && (
                  <dd className="flex flex-wrap gap-1 pt-1">
                    {entry.courses.map((course) => (
                      <a key={course} href={to(courseHref(course))}>
                        <Badge variant="outline" className="font-normal hover:bg-accent">
                          {names.get(course) ?? course}
                        </Badge>
                      </a>
                    ))}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </>
      )}
    </Page>
  );
}
