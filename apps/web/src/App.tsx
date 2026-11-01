import { lazy, Suspense } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/app/header';
import { HomePage } from '@/pages/home-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { usePath } from '@/router/location';

const MocksPage = lazy(() => import('@/mocks/mocks-page').then((module) => ({ default: module.MocksPage })));
const BoardPage = lazy(() => import('@/pages/board/board-page').then((module) => ({ default: module.BoardPage })));

function Page({ path }: { path: string }) {
  if (path === '/') return <HomePage />;
  if (path === '/mocks') return <MocksPage />;
  if (path === '/board') return <BoardPage />;
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
