import { OpeningCard } from '@/components/openings/opening-card';
import { EmptyState } from '@/components/shared/empty-state';
import { loadCatalog } from '@/data/content';
import { useLoad } from '@/hooks/use-load';
import { openingSummary } from './views';

/** Every opening, as cards (docs/v2/pages/openings.md). */
export function OpeningsPage() {
  const catalog = useLoad(loadCatalog, []);
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Openings</h1>
        <p className="text-muted-foreground">Pick one to see its variations and start its first step.</p>
      </div>
      {catalog.error ? <p className="text-destructive">{catalog.error}</p> : null}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
        {catalog.loading
          ? [0, 1, 2].map((i) => <OpeningCard key={i} loading />)
          : catalog.data?.openings.map((entry) => <OpeningCard key={entry.id} opening={openingSummary(entry)} />)}
      </div>
      {catalog.data && catalog.data.openings.length === 0 ? <EmptyState kind="new" text="No openings yet." /> : null}
    </main>
  );
}
