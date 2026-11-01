import { useMemo } from 'react';
import { OpeningCard } from '@/components/openings/opening-card';
import { PuzzleCard } from '@/components/practice/puzzle-card';
import { DueCard } from '@/components/progress/due-card';
import { NextAction } from '@/components/progress/next-action';
import { Streak } from '@/components/progress/streak';
import { EmptyState } from '@/components/shared/empty-state';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
import { HomePage } from '@/pages/home-page';
import { to } from '@/router/location';
import {
  loadProgress,
  minutesFor,
  pickPuzzle,
  puzzlesOf,
  startedOpenings,
  whenWords,
  type LearnerProgress,
} from '../progress';
import { startedSummary } from '../opening-summary';
import { modeHref } from '../sources';
import { nextStateOf, puzzleHref, reviewHref } from './next';

async function loadToday() {
  const progress = await loadProgress();
  const have = new Set(progress.cards.map((card) => card.id));
  const opening = startedOpenings(progress)[0];
  const puzzle = opening ? pickPuzzle(await puzzlesOf(opening.opening.id).catch(() => []), have) : undefined;
  return { progress, puzzle, puzzleOpening: opening };
}

/**
 * Today (docs/v2/pages/today.md): the one thing to do now, what is due, a puzzle from the learner's openings, the
 * openings at a glance and the streak. `/` shows the first-visit home until the learner has any cards.
 */
export function TodayPage({ home = false }: { home?: boolean }) {
  const data = useLoad(loadToday, []);
  if (data.error) return <main className="mx-auto max-w-7xl px-4 py-8 text-destructive">{data.error}</main>;
  if (!data.data) return <main className="mx-auto max-w-7xl px-4 py-8" aria-busy="true" />;
  const { progress } = data.data;
  const started = startedOpenings(progress);
  if (!started.length) {
    if (home) return <HomePage />;
    return (
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <EmptyState
          kind="new"
          size="page"
          text="Nothing to review yet: learn the first step of an opening and its moves come back here."
          action={{ label: 'Choose an opening', href: to('/openings') }}
        />
      </main>
    );
  }
  return <TodayView {...data.data} />;
}

function TodayView({
  progress,
  puzzle,
  puzzleOpening,
}: Awaited<ReturnType<typeof loadToday>> & { progress: LearnerProgress }) {
  const next = useMemo(
    () => ({ ...nextStateOf(progress), ...(puzzle ? { puzzleHref: puzzleHref(puzzle.id) } : {}) }),
    [progress, puzzle],
  );
  const started = startedOpenings(progress);
  const due = progress.due.length;
  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8">
      <section className="grid gap-3" aria-label="What to do now">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <NextAction
          state={next}
          form="with-alternatives"
          enterKey
          alternatives={[
            { label: 'Practise anyway', href: to('/practice'), hint: 'Every practice mode, never on your schedule.' },
          ]}
        />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <DueCard
          due={due}
          minutes={minutesFor(Math.min(due, siteConfig.schedule.sessionSize.default), progress.msPerAnswer)}
          byKind={{
            moves: progress.dueByKind.moves,
            puzzles: progress.dueByKind.puzzles,
            questions: progress.dueByKind.questions,
          }}
          byOpening={started
            .filter((one) => one.due > 0)
            .map((one) => ({ name: one.opening.name, count: one.due, href: to(`/practice/review/${one.opening.id}`) }))}
          newToday={progress.newLeft}
          {...(progress.nextDue ? { nextDue: whenWords(progress.nextDue) } : {})}
          href={reviewHref()}
          practiseHref={to(`/practice/review/${started[0]!.opening.id}`)}
        />
        {puzzle && puzzleOpening ? (
          <PuzzleCard
            puzzle={puzzle}
            href={puzzleHref(puzzle.id)}
            hideThemes
            learnerSide={puzzleOpening.opening.side}
            level={siteConfig.puzzles.rating}
            from={`From a game that went through your ${puzzleOpening.opening.name}`}
          />
        ) : (
          <EmptyState kind="done" size="panel" text="No puzzle waiting from your openings." />
        )}
      </div>
      <section className="grid gap-3" aria-labelledby="your-openings">
        <h2 id="your-openings" className="text-lg font-semibold">
          Your openings
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {started.map((one) => (
            <OpeningCard
              key={one.opening.id}
              opening={startedSummary(one, progress.newLeft)}
              modeHrefs={{
                learn: to(`/openings/${one.opening.id}`),
                review: to(`/practice/review/${one.opening.id}`),
                drill: modeHref('drill', { opening: one.opening.id }),
                puzzles: modeHref('puzzles', { opening: one.opening.id }),
              }}
            />
          ))}
        </div>
      </section>
      <section aria-label="Streak">
        <Streak
          form="full"
          days={progress.streak.days}
          longest={progress.streak.longest}
          doneToday={progress.streak.doneToday}
          {...(progress.streak.since
            ? {
                since: new Date(`${progress.streak.since}T12:00:00`).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }),
              }
            : {})}
        />
      </section>
    </main>
  );
}
