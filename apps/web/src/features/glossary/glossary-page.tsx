import type { GlossaryEntry } from '@knightschool/core';
import { useEffect, useState } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { loadGlossary } from '@/data/content';
import { useBrowse } from '@/features/browse/store';
import { to } from '@/router/location';

/** The tactical and structural ideas the courses use, in plain words, with the courses where each turns up. */
export function GlossaryPage() {
  const index = useBrowse((state) => state.index);
  const [entries, setEntries] = useState<GlossaryEntry[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    loadGlossary()
      .then(setEntries)
      .catch((error: unknown) => setFailure(error instanceof Error ? error.message : String(error)));
  }, []);

  // A link such as /glossary#fork scrolls to that entry once the list is there.
  useEffect(() => {
    if (entries && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [entries]);

  const names = new Map(index.map((course) => [course.id, course.name]));
  return (
    <Page className="max-w-4xl">
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
      {entries &&
        (['tactical', 'structural'] as const).map((group) => (
          <section key={group} className="grid gap-3">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {group === 'tactical' ? 'Tactics' : 'Structure and plans'}
            </h3>
            <dl className="grid gap-3 md:grid-cols-2">
              {entries
                .filter((entry) => entry.group === group)
                .map((entry) => (
                  <div key={entry.id} id={entry.id} className="grid gap-1 rounded-xl border bg-card p-3 scroll-mt-20">
                    <dt className="font-semibold">{entry.name}</dt>
                    <dd className="text-sm text-muted-foreground">{entry.summary}</dd>
                    {entry.courses.length > 0 && (
                      <dd className="flex flex-wrap gap-1 pt-1">
                        {entry.courses.map((course) => (
                          <a key={course} href={to(`/course/${course}`)}>
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
          </section>
        ))}
    </Page>
  );
}
