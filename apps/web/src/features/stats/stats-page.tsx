import { Page } from '@/components/page';
import {
  accuracy,
  dailyCounts,
  formatMs,
  guessSummary,
  mostMissed,
  speedSummary,
  streak,
  type Missed,
  type OpeningContent,
} from '@knightschool/core';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { loadOpening } from '@/data/content';
import { useStorage } from '@/data/storage';
import { lastDays, localDay, previousDay } from '@/data/training-settings';
import { useCatalog } from '@/data/catalog-store';
import { describeCard } from './describe-card';

type Loaded = {
  total: number;
  accuracy: number | null;
  streak: number;
  learned: number;
  days: ReturnType<typeof dailyCounts>;
  missed: { text: string; course: string; entry: Missed }[];
  guess: ReturnType<typeof guessSummary>;
  speed: ReturnType<typeof speedSummary>;
};

const DAYS = 14;

async function load(courseNames: Map<string, string>): Promise<Loaded> {
  const storage = useStorage.getState().storage!.storage;
  const now = new Date();
  const reviews = await storage.reviews.since('1970-01-01T00:00:00.000Z');
  const dayOf = (at: string) => localDay(new Date(at));
  const attempts = await storage.guessAttempts.since('1970-01-01T00:00:00.000Z');
  const speedRuns = await storage.speedAttempts.since('1970-01-01T00:00:00.000Z');
  // A day counts toward the streak whether you reviewed moves or named openings.
  const reviewDays = new Set([...reviews, ...attempts, ...speedRuns].map((entry) => dayOf(entry.at)));

  const contents = new Map<string, OpeningContent>();
  const missed = await Promise.all(
    mostMissed(reviews, 5).map(async (entry) => {
      const card = await storage.cards.get(entry.cardId);
      if (!card) return { text: 'A card that was removed', course: '', entry };
      const course = courseNames.get(card.openingId) ?? card.openingId;
      // A card can outlive its course (deleted in Create, or renamed in an update): say so rather than fail the page.
      try {
        if (!contents.has(card.openingId)) contents.set(card.openingId, await loadOpening(card.openingId));
        return { text: describeCard(contents.get(card.openingId)!, card), course, entry };
      } catch {
        return { text: 'A move from a course that is no longer here', course, entry };
      }
    }),
  );
  const learned = Object.values(await storage.cards.learnedByOpening()).reduce((sum, n) => sum + n, 0);
  return {
    total: reviews.length,
    accuracy: accuracy(reviews),
    streak: streak(reviewDays, localDay(now), previousDay),
    learned,
    days: dailyCounts(reviews, lastDays(DAYS, now), dayOf),
    missed,
    guess: guessSummary(attempts),
    speed: speedSummary(speedRuns),
  };
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function StatsPage() {
  const storage = useStorage((state) => state.storage);
  const status = useStorage((state) => state.status);
  const index = useCatalog((state) => state.index);
  const [data, setData] = useState<Loaded | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    load(new Map(index.map((course) => [course.id, course.name])))
      .then((loaded) => !cancelled && setData(loaded))
      .catch((error: unknown) => !cancelled && setFailure(error instanceof Error ? error.message : String(error)));
    return () => {
      cancelled = true;
    };
  }, [storage, index]);

  const tallest = Math.max(1, ...(data?.days.map((day) => day.total) ?? [1]));

  return (
    <Page className="gap-6">
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">Stats</h2>
        <p className="text-muted-foreground">How your quizzes are going. Everything here is stored on this device.</p>
      </header>

      {(status === 'paused' || status === 'unavailable' || status === 'error') && (
        <Alert variant="destructive">
          <AlertDescription>Your progress is not available in this tab, so there is nothing to show.</AlertDescription>
        </Alert>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      {!data && !failure && status !== 'paused' && status !== 'unavailable' && status !== 'error' && (
        <Skeleton className="h-64" />
      )}

      {data && data.guess.total > 0 && (
        <section className="grid gap-3" aria-label="Name That Opening">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Name That Opening</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Answered" value={String(data.guess.total)} />
            <Tile
              label="Score"
              value={data.guess.accuracy === null ? '–' : `${Math.round(data.guess.accuracy * 100)}%`}
              note="half a point for the opening alone"
            />
            <Tile label="Variation named" value={String(data.guess.full)} />
            <Tile label="Opening only" value={String(data.guess.partial)} note={`${data.guess.miss} missed`} />
          </div>
        </section>
      )}
      {data && data.speed.lines > 0 && (
        <section className="grid gap-3" aria-label="Speed">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Speed</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Lines played" value={String(data.speed.lines)} />
            <Tile
              label="Average per move"
              value={formatMs(data.speed.averageMs)}
              note="your moves, against the clock"
            />
            <Tile label="Best line pace" value={formatMs(data.speed.bestLineMs)} />
            <Tile label="Wrong moves" value={String(data.speed.errors)} />
          </div>
        </section>
      )}
      {data && data.total === 0 && data.guess.total === 0 && data.speed.lines === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          No answers yet. Drill a line, take the quiz, try Name That Opening or run a Speed test and your numbers will
          appear here.
        </p>
      )}
      {data && data.total > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Answers" value={String(data.total)} />
            <Tile
              label="Recalled"
              value={data.accuracy === null ? '–' : `${Math.round(data.accuracy * 100)}%`}
              note="right, with or without a hint"
            />
            <Tile label="Day streak" value={String(data.streak)} />
            <Tile label="Moves learned" value={String(data.learned)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Last {DAYS} days</CardTitle>
              <CardDescription>Answers each day. The darker part is the ones you recalled.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex h-40 items-end gap-1.5" aria-label="Answers per day">
                {data.days.map((day) => (
                  <li
                    key={day.day}
                    className="flex h-full flex-1 flex-col justify-end gap-1"
                    title={`${day.day}: ${day.total} reviews, ${day.recalled} recalled`}
                  >
                    <div
                      className="flex w-full flex-col justify-end overflow-hidden rounded-sm bg-muted"
                      style={{ height: `${(day.total / tallest) * 100}%`, minHeight: day.total ? 4 : 0 }}
                    >
                      <div
                        className="bg-primary"
                        style={{ height: `${day.total ? (day.recalled / day.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-center text-[10px] text-muted-foreground">{day.day.slice(8)}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {data.missed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Moves you miss most</CardTitle>
                <CardDescription>Missed at least twice. These come back sooner.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 text-sm">
                  {data.missed.map(({ text, course, entry }) => (
                    <li key={entry.cardId} className="flex items-baseline justify-between gap-4">
                      <span>
                        <span className="text-muted-foreground">{course}: </span>
                        {text}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {entry.misses} of {entry.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
