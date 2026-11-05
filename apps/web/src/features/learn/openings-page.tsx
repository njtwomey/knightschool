import { Search as SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { forgivingMatch } from '@/components/finding/text-match';
import { SortableTable, type Column } from '@/components/finding/sortable-table';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { loadCatalog } from '@/data/content';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { openingSummary } from './views';

type Row = ReturnType<typeof openingSummary>;
type Key = 'board' | 'name' | 'side' | 'suits' | 'variations' | 'steps' | 'hours';

const byNumber = (of: (row: Row) => number) => (a: Row, b: Row) => of(a) - of(b);

const COLUMNS: Column<Row, Key>[] = [
  {
    key: 'board',
    heading: '',
    hideOnCard: true,
    cell: (row) => <BoardThumb {...row.thumb} id={`thumb-${row.id}`} className="w-24" />,
  },
  { key: 'name', heading: 'Opening', compare: (a, b) => a.name.localeCompare(b.name), cell: (row) => row.name },
  {
    key: 'side',
    heading: 'Side',
    compare: (a, b) => a.side.localeCompare(b.side),
    cell: (row) => (row.side === 'white' ? 'White' : 'Black'),
  },
  { key: 'suits', heading: 'About', className: 'whitespace-normal', cell: (row) => row.suits },
  {
    key: 'variations',
    heading: 'Variations',
    align: 'right',
    compare: byNumber((row) => row.size.variations),
    cell: (row) => row.size.variations,
  },
  {
    key: 'steps',
    heading: 'Steps',
    align: 'right',
    compare: byNumber((row) => row.size.steps),
    cell: (row) => row.size.steps,
  },
  {
    key: 'hours',
    heading: 'Time',
    align: 'right',
    compare: byNumber((row) => row.size.hours),
    cell: (row) => `about ${row.size.hours} ${row.size.hours === 1 ? 'hour' : 'hours'}`,
  },
];

/** Every opening as a table to sort, with a plain search on its name and description (docs/v2/pages/openings.md). */
export function OpeningsPage() {
  const catalog = useLoad(loadCatalog, []);
  const [query, setQuery] = useState('');
  const all = useMemo(() => catalog.data?.openings.map(openingSummary) ?? [], [catalog.data]);
  const rows = query.trim() ? all.filter((row) => forgivingMatch(query, `${row.name} ${row.suits}`)) : all;
  const searchHref = to('/explore/search') + (query.trim() ? `#q=${encodeURIComponent(query.trim())}` : '');
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Openings</h1>
        <p className="text-muted-foreground">Pick one to see its variations and start its first step.</p>
      </div>
      {catalog.error ? <p className="text-destructive">{catalog.error}</p> : null}
      <SortableTable
        label="Openings"
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => row.id}
        rowHref={(row) => row.href}
        titleColumn="name"
        loading={catalog.loading}
        filters={
          <>
            <InputGroup className="max-w-sm">
              <InputGroupAddon>
                <SearchIcon aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                placeholder="Find an opening"
                aria-label="Find an opening"
                onChange={(event) => setQuery(event.target.value)}
              />
            </InputGroup>
            <Button asChild variant="outline">
              <a href={searchHref}>Search lines and ideas</a>
            </Button>
          </>
        }
        empty={
          all.length === 0 && !catalog.loading ? (
            <EmptyState kind="new" text="No openings yet." />
          ) : (
            <EmptyState
              kind="no-match"
              size="part"
              text={`No opening matches '${query}'.`}
              action={{ label: 'Search lines and ideas', href: searchHref }}
            />
          )
        }
      />
    </main>
  );
}
