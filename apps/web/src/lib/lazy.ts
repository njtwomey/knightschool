import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * A component loaded with its own chunk the first time it is shown: `lazyNamed(() => import('./x'), 'XPage')`. Render it
 * inside a `<Suspense>` (`PageSuspense`), which shows a fallback while the chunk loads.
 */
export function lazyNamed<K extends string, P extends object>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
): LazyExoticComponent<ComponentType<P>> {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}
