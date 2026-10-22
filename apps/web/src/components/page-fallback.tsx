import { Suspense, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** What a page shows while it loads: the same block the pages show while their content loads. */
export function PageFallback() {
  return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
}

/** A page loaded on first use (`lazyNamed`), with `PageFallback` while its code arrives. */
export function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}
