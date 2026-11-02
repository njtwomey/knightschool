import type { BuiltOpening } from '@knightschool/core/content';
import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import type { Catalog } from '@/data/content';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { loadOpeningData, type OpeningData } from './opening-data';
import { linesHref, openingHref } from './views';

/** The opening's crumbs and its tabs, Overview, Lines and Map (docs/v2/pages/opening.md). */
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
      root={{ label: 'Learn', href: to('/openings') }}
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
      {...(tab
        ? {
            tabs: {
              label: 'Opening pages',
              value: tab,
              items: [
                { value: 'overview', label: 'Overview', href: openingHref(opening.id) },
                { value: 'lines', label: 'Lines', href: linesHref(opening.id) },
                { value: 'map', label: 'Map', href: to(`/openings/${opening.id}/map`) },
              ],
            },
          }
        : {})}
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
