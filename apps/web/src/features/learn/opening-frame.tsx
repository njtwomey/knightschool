import type { BuiltOpening } from '@knightschool/core/content';
import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import type { Catalog } from '@/data/content';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { loadOpeningData, type OpeningData } from './opening-data';
import { linesHref, openingHref } from './views';

/** An opening's tabs; `tab` marks the one this page is, if it is one. */
export const openingTabs = (id: string, tab?: 'overview' | 'lines' | 'map') => ({
  label: 'Opening pages',
  value: tab ?? '',
  items: [
    { value: 'overview', label: 'Overview', href: openingHref(id) },
    { value: 'lines', label: 'Lines', href: linesHref(id) },
    { value: 'map', label: 'Map', href: to(`/openings/${id}/map`) },
  ],
});

/**
 * The opening's crumbs and its tabs, Overview, Lines and Map (docs/v2/pages/opening.md). The tabs are on every page under
 * an opening, a step or a line as much as the overview; `tab` marks the one this page is.
 */
export function OpeningCrumbs({
  catalog,
  opening,
  tab,
  crumbs = [],
}: {
  catalog: Catalog;
  opening: BuiltOpening;
  tab?: 'overview' | 'lines' | 'map';
  crumbs?: Crumb[];
}) {
  return (
    <Breadcrumbs
      root={{ label: 'Openings', href: to('/openings') }}
      crumbs={[
        {
          label: opening.name,
          href: openingHref(opening.id),
          siblings: {
            current: opening.id,
            label: 'Openings',
            items: catalog.openings.map((entry) => ({
              id: entry.id,
              label: `${entry.name}, as ${entry.side === 'white' ? 'White' : 'Black'}`,
              href: openingHref(entry.id),
            })),
          },
        },
        ...crumbs,
      ]}
      tabs={openingTabs(opening.id, tab)}
    />
  );
}

/** The page frame while an opening loads, when it is missing, or once it is in. */
export function OpeningFrame({ id, children }: { id: string; children: (data: OpeningData) => ReactNode }): ReactNode {
  const data = useLoad(() => loadOpeningData(id), [id]);
  if (data.error) return <main className="mx-auto max-w-7xl px-4 py-8 text-destructive">{data.error}</main>;
  if (data.loading) return <main className="mx-auto max-w-7xl px-4 py-8 text-muted-foreground">Loading…</main>;
  if (!data.data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <EmptyState
          kind="no-match"
          size="page"
          text="There is no such opening."
          action={{ label: 'All openings', href: to('/openings') }}
        />
      </main>
    );
  }
  return children(data.data);
}
