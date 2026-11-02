import { lazy, Suspense } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/app/header';
import { StorageNotice } from '@/app/storage-notice';
import { NotFoundPage } from '@/pages/not-found-page';
import { usePath } from '@/router/location';

const MocksPage = lazy(() => import('@/mocks/mocks-page').then((module) => ({ default: module.MocksPage })));
const BoardPage = lazy(() => import('@/pages/board/board-page').then((module) => ({ default: module.BoardPage })));
const OpeningsPage = lazy(() =>
  import('@/features/learn/openings-page').then((module) => ({ default: module.OpeningsPage })),
);
const OpeningPage = lazy(() =>
  import('@/features/learn/opening-page').then((module) => ({ default: module.OpeningPage })),
);
const StepPage = lazy(() => import('@/features/learn/step-page').then((module) => ({ default: module.StepPage })));
const VariationPage = lazy(() =>
  import('@/features/learn/variation-page').then((module) => ({ default: module.VariationPage })),
);
const FollowUpPage = lazy(() =>
  import('@/features/learn/follow-up-page').then((module) => ({ default: module.FollowUpPage })),
);
const LinePage = lazy(() => import('@/features/learn/line-page').then((module) => ({ default: module.LinePage })));
const PuzzlesPage = lazy(() =>
  import('@/features/practice/puzzles/puzzles-page').then((module) => ({ default: module.PuzzlesPage })),
);
const PuzzlePage = lazy(() =>
  import('@/features/practice/puzzles/puzzles-page').then((module) => ({ default: module.PuzzlePage })),
);
const PlayOnPage = lazy(() =>
  import('@/features/practice/play-on/play-on-page').then((module) => ({ default: module.PlayOnPage })),
);
const QuestionsPage = lazy(() =>
  import('@/features/practice/questions/questions-page').then((module) => ({ default: module.QuestionsPage })),
);
const SpeedPage = lazy(() =>
  import('@/features/practice/speed/speed-page').then((module) => ({ default: module.SpeedPage })),
);
const NameItPage = lazy(() =>
  import('@/features/practice/name-it/name-it-page').then((module) => ({ default: module.NameItPage })),
);
const TodayPage = lazy(() =>
  import('@/features/practice/today/today-page').then((module) => ({ default: module.TodayPage })),
);
const PracticePage = lazy(() =>
  import('@/features/practice/hub/practice-page').then((module) => ({ default: module.PracticePage })),
);
const ReviewPage = lazy(() =>
  import('@/features/practice/review/review-page').then((module) => ({ default: module.ReviewPage })),
);
const DrillPage = lazy(() =>
  import('@/features/practice/drill/drill-page').then((module) => ({ default: module.DrillPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings/settings-page').then((module) => ({ default: module.SettingsPage })),
);
const CheckpointPage = lazy(() =>
  import('@/features/practice/checkpoint/checkpoint-page').then((module) => ({ default: module.CheckpointPage })),
);

/** A mode address scoped to an opening and maybe a variation: `/practice/<mode>[/<opening>[/<variation>]]`. */
const scoped = (match: RegExpExecArray) =>
  match[1] ? { opening: match[1], ...(match[2] ? { variation: match[2] } : {}) } : undefined;

function Page({ path }: { path: string }) {
  if (path === '/') return <TodayPage home />;
  if (path === '/today') return <TodayPage />;
  if (path === '/practice') return <PracticePage />;
  const review = /^\/practice\/review(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?)?$/.exec(path);
  if (review) return <ReviewPage key={path} scope={scoped(review)} />;
  const drill = /^\/practice\/drill(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?)?$/.exec(path);
  if (drill) return <DrillPage key={path} scope={scoped(drill)} />;
  const checkpoint = /^\/openings\/([a-z0-9-]+)\/([a-z0-9-]+)\/checkpoint$/.exec(path);
  if (checkpoint) return <CheckpointPage key={path} opening={checkpoint[1]!} variation={checkpoint[2]!} />;
  const finalTest = /^\/openings\/([a-z0-9-]+)\/test$/.exec(path);
  if (finalTest) return <CheckpointPage key={path} opening={finalTest[1]!} />;
  if (path === '/mocks') return <MocksPage />;
  // `/you/settings` (the spec's address) and v1's `/profile/settings` land on the same page.
  const settings = /^\/(?:you\/|profile\/)?settings(?:\/([a-z]+))?$/.exec(path);
  if (settings) return <SettingsPage key={path} group={settings[1]} />;
  if (path === '/board') return <BoardPage />;
  if (path === '/openings') return <OpeningsPage />;
  const puzzles = /^\/practice\/puzzles(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?)?$/.exec(path);
  if (puzzles) return <PuzzlesPage opening={puzzles[1]} variation={puzzles[2]} />;
  const puzzle = /^\/practice\/puzzle\/([A-Za-z0-9]+)$/.exec(path);
  if (puzzle) return <PuzzlePage id={puzzle[1]!} />;
  const playOn = /^\/practice\/play-on(?:\/([a-z0-9-]+)(?:\/lines\/([a-z0-9-]+))?)?$/.exec(path);
  if (playOn) return <PlayOnPage opening={playOn[1]} line={playOn[2]} />;
  const questions = /^\/practice\/questions(?:\/([a-z0-9-]+))?$/.exec(path);
  if (questions) return <QuestionsPage opening={questions[1]} />;
  const speed = /^\/practice\/speed(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?)?$/.exec(path);
  if (speed) return <SpeedPage opening={speed[1]} variation={speed[2]} />;
  const nameIt = /^\/practice\/name-it(?:\/([a-z0-9-]+))?$/.exec(path);
  if (nameIt) return <NameItPage opening={nameIt[1]} />;
  const step = /^\/openings\/([a-z0-9-]+)\/step\/(\d+)(?:\/(\d+)-(\d+))?$/.exec(path);
  if (step)
    return (
      <StepPage
        key={path}
        id={step[1]!}
        n={Number(step[2])}
        range={step[3] ? [Number(step[3]), Number(step[4])] : undefined}
      />
    );
  const followUp = /^\/openings\/([a-z0-9-]+)\/step\/(\d+)\/follow-up\/(\d+)$/.exec(path);
  if (followUp) return <FollowUpPage key={path} id={followUp[1]!} n={Number(followUp[2])} k={Number(followUp[3])} />;
  const opening = /^\/openings\/([a-z0-9-]+)(?:\/(lines))?$/.exec(path);
  if (opening) return <OpeningPage key={path} id={opening[1]!} tab={opening[2] ? 'lines' : 'overview'} />;
  const line = /^\/openings\/([a-z0-9-]+)\/lines\/([a-z0-9-]+)$/.exec(path);
  if (line) return <LinePage key={path} id={line[1]!} line={line[2]!} />;
  // Reserved words under an opening (step, lines, map, test) are never variations.
  const variation = /^\/openings\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(path);
  if (variation && !['step', 'lines', 'map', 'test'].includes(variation[2]!))
    return <VariationPage key={path} id={variation[1]!} variation={variation[2]!} />;
  return <NotFoundPage />;
}

export function App() {
  const path = usePath();
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-svh bg-background text-foreground">
        <Header />
        <StorageNotice />
        <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
          <Page path={path} />
        </Suspense>
      </div>
    </TooltipProvider>
  );
}
