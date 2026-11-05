import { dayKey } from '@knightschool/core';
import { useMemo } from 'react';
import { OpeningCard } from '@/components/openings/opening-card';
import { PuzzleCard } from '@/components/practice/puzzle-card';
import { ActivityCalendar, type ActivityDay } from '@/components/progress/activity-calendar';
import { CoverageMeter } from '@/components/progress/coverage-meter';
import { DueCard } from '@/components/progress/due-card';
import { GapLink } from '@/components/progress/gap-link';
import type { ModeId } from '@/components/progress/modes';
import { NextAction } from '@/components/progress/next-action';
import { Streak } from '@/components/progress/streak';
import { EmptyState } from '@/components/shared/empty-state';
import { getSetting } from '@/data/settings';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
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
import { chosenPuzzles, coverageOpenings } from '../chosen';
import { DueOutside } from '../due-outside';
import { startedSummary } from '../opening-summary';
import { modeHref } from '../sources';
import { coverageOf } from './coverage';
import { nextStateOf, puzzleHref, reviewHref } from './next';

/** The calendar's colour for each attempts-log mode, by the counted mode it belongs to (Speed and Name it have none). */
const CALENDAR_MODE: Record<string, ModeId> = {
  watch: 'learn',
  try: 'learn',
  mistakes: 'learn',
  checkpoint: 'learn',
  review: 'review',
  drill: 'drill',
  puzzle: 'puzzles',
  'play-on': 'playOn',
};

/** The attempts log's days as the activity calendar draws them, each tinted by the mode answered most. */
function calendarDays(progress: LearnerProgress): ActivityDay[] {
  return progress.activity.map((day) => {
    const top = Object.entries(day.modes).sort((a, b) => b[1] - a[1])[0]?.[0];
    const mode = top ? CALENDAR_MODE[top] : undefined;
    return { date: day.date, answers: day.answers, right: day.right, ...(mode ? { topMode: mode } : {}) };
  });
}

const band = () => {
  const ratings = siteConfig.coverage.band.ratings;
  return `${ratings[0]} to ${ratings.at(-1)}`;
};

async function loadToday() {
  const progress = await loadProgress();
  const have = new Set(progress.cards.map((card) => card.id));
  const opening = startedOpenings(progress)[0];
  const puzzle = opening
    ? pickPuzzle(chosenPuzzles(opening, await puzzlesOf(opening.opening.id).catch(() => [])), have)
    : undefined;
  return { progress, puzzle, puzzleOpening: opening };
}

/**
 * Today (docs/v2/pages/today.md): the one thing to do now, what is due, a puzzle from the learner's openings, the
 * openings at a glance and the streak.
 */
export function TodayPage() {
  const data = useLoad(loadToday, []);
  if (data.error) return <main className="mx-auto max-w-7xl px-4 py-8 text-destructive">{data.error}</main>;
  if (!data.data) return <main className="mx-auto max-w-7xl px-4 py-8" aria-busy="true" />;
  const { progress } = data.data;
  const started = startedOpenings(progress);
  if (!started.length) {
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
  const covered = useMemo(() => coverageOf(progress, coverageOpenings(progress)), [progress]);
  const days = useMemo(() => calendarDays(progress), [progress]);
  const showStreak = getSetting('progress.showStreak');
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
          minutes={minutesFor(Math.min(due, getSetting('review.sessionSize')), progress.msPerAnswer)}
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
            level={getSetting('puzzles.rating')}
            from={`From a game that went through your ${puzzleOpening.opening.name}`}
          />
        ) : (
          <EmptyState kind="done" size="panel" text="No puzzle waiting from your openings." />
        )}
      </div>
      <DueOutside progress={progress} />
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
      {covered.rows.length ? (
        <section className="grid gap-3" aria-labelledby="coverage">
          <h2 id="coverage" className="text-lg font-semibold">
            How much of what you meet you know
          </h2>
          <CoverageMeter rows={covered.rows} band={band()} target={covered.target} className="max-w-2xl" />
          {covered.gaps[0] ? (
            <GapLink
              gaps={covered.gaps}
              band={band()}
              target={covered.target}
              orientation={covered.gaps[0].side}
              className="max-w-2xl"
            />
          ) : null}
        </section>
      ) : null}
      {showStreak ? (
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
      ) : null}
      <section className="grid gap-3" aria-labelledby="activity">
        <h2 id="activity" className="text-lg font-semibold">
          Your practice
        </h2>
        <ActivityCalendar days={days} weeks={13} today={dayKey(new Date())} split />
      </section>
    </main>
  );
}
