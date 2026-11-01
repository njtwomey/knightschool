import { lazy, Suspense } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/app/header';
import { HomePage } from '@/pages/home-page';
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

function Page({ path }: { path: string }) {
  if (path === '/') return <HomePage />;
  if (path === '/mocks') return <MocksPage />;
  if (path === '/board') return <BoardPage />;
  if (path === '/openings') return <OpeningsPage />;
  const step = /^\/openings\/([a-z0-9-]+)\/step\/(\d+)$/.exec(path);
  if (step) return <StepPage id={step[1]!} n={Number(step[2])} />;
  const opening = /^\/openings\/([a-z0-9-]+)$/.exec(path);
  if (opening) return <OpeningPage id={opening[1]!} />;
  return <NotFoundPage />;
}

export function App() {
  const path = usePath();
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-svh bg-background text-foreground">
        <Header />
        <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
          <Page path={path} />
        </Suspense>
      </div>
    </TooltipProvider>
  );
}
