import { useEffect } from 'react';
import { PageErrorBoundary } from '@/components/error-boundary';
import { SiteFooter } from '@/components/site-footer';
import { useCatalog } from '@/data/catalog-store';
import { useStorage } from '@/data/storage';
import { navigate, usePathname } from '@/router/location';
import { parseRoute } from '@/router/route';
import { PausedBanner, SiteHeader } from './app/header';
import { Routes } from './app/routes';

export function App() {
  const pathname = usePathname();
  const route = parseRoute(pathname);
  const selectCourse = useCatalog((state) => state.selectCourse);
  const loadIndex = useCatalog((state) => state.loadIndex);
  const courseId = route.page === 'course' ? route.id : null;

  useEffect(() => {
    void loadIndex();
    void useStorage.getState().open();
  }, [loadIndex]);

  useEffect(() => {
    void selectCourse(courseId);
  }, [courseId, selectCourse]);

  // Writing courses was once a Profile tab; its old address shows Create.
  useEffect(() => {
    if (/^\/profile\/author\/?$/.test(pathname)) navigate('/create', { replace: true });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader route={route} />
      <PausedBanner />
      <main className="min-h-dvh flex-1">
        <PageErrorBoundary resetKey={pathname}>
          <Routes route={route} />
        </PageErrorBoundary>
      </main>
      <SiteFooter />
    </div>
  );
}
