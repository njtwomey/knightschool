import { ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CATALOGUE, specUrl, type CatalogueEntry } from './catalogue';
import { MOCKS } from './registry';

const BUILT = new Map(MOCKS.map((item) => [item.id, item]));

function Entry({ entry, onOpen }: { entry: CatalogueEntry; onOpen: () => void }) {
  const item = BUILT.get(entry.id);
  return (
    <a
      href={`#${entry.id}`}
      onClick={(event) => {
        event.preventDefault();
        if (item) onOpen();
      }}
      aria-disabled={!item}
      className={cn('group block rounded-xl no-underline outline-none', item ? 'cursor-pointer' : 'cursor-default')}
    >
      <Card
        className={cn(
          'h-full gap-2 py-4 transition-colors',
          item
            ? 'group-hover:border-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-ring'
            : 'opacity-55',
        )}
      >
        <CardHeader className="gap-1 px-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">{entry.name}</CardTitle>
            {item ? (
              <Badge variant="secondary">
                {item.variants.length} {item.variants.length === 1 ? 'variant' : 'variants'}
              </Badge>
            ) : (
              <Badge variant="outline">planned</Badge>
            )}
          </div>
          <CardDescription className="text-xs">{entry.summary}</CardDescription>
        </CardHeader>
      </Card>
    </a>
  );
}

/** A temporary page: every planned component, and the built ones with all their variations, for feedback. */
export function MocksPage() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(() => window.location.hash.slice(1) || null);
  const groups = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = CATALOGUE.filter((entry) =>
      words.every((word) => `${entry.name} ${entry.summary} ${entry.group}`.toLowerCase().includes(word)),
    );
    return [...new Set(shown.map((entry) => entry.group))].map((group) => ({
      group,
      entries: shown.filter((entry) => entry.group === group),
    }));
  }, [query]);
  const openEntry = CATALOGUE.find((entry) => entry.id === open);
  // Built components in the gallery's order, so the dialog can move to the previous or next one without closing.
  const built = CATALOGUE.filter((entry) => BUILT.has(entry.id));
  const at = built.findIndex((entry) => entry.id === open);
  const previous = at > 0 ? built[at - 1] : undefined;
  const next = at >= 0 && at < built.length - 1 ? built[at + 1] : undefined;
  const openItem = open ? BUILT.get(open) : undefined;
  const choose = (id: string | null) => {
    setOpen(id);
    window.history.replaceState(null, '', id ? `#${id}` : window.location.pathname);
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Mocks</h1>
        <p className="max-w-3xl text-muted-foreground">
          Every component in the plan. The ones built so far open with all their variations, using one small example:
          the Italian Game for White (the Giuoco Piano and the Legal Mate trap). {MOCKS.length} of {CATALOGUE.length}{' '}
          built.
        </p>
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a component"
            className="pl-8"
            aria-label="Find a component"
          />
        </div>
      </div>
      {groups.map(({ group, entries }) => (
        <section key={group} className="grid gap-3">
          <h2 className="text-lg font-semibold">{group}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {entries.map((entry) => (
              <Entry key={entry.id} entry={entry} onOpen={() => choose(entry.id)} />
            ))}
          </div>
        </section>
      ))}
      <Dialog open={Boolean(openItem)} onOpenChange={(next) => !next && choose(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl">
          {openEntry && openItem ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 pr-8">
                  <DialogTitle className="mr-auto">{openEntry.name}</DialogTitle>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {at + 1} of {built.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!previous}
                    aria-label={previous ? `Previous: ${previous.name}` : 'No previous component'}
                    title={previous?.name}
                    onClick={() => previous && choose(previous.id)}
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!next}
                    aria-label={next ? `Next: ${next.name}` : 'No next component'}
                    title={next?.name}
                    onClick={() => next && choose(next.id)}
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
                <DialogDescription>
                  {openEntry.summary}{' '}
                  <a
                    href={specUrl(openEntry.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    The spec <ExternalLink className="size-3" aria-hidden />
                  </a>
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                {openItem.variants.map((variant) => (
                  <section key={variant.name} className="grid gap-3 rounded-lg border p-4">
                    <div>
                      <h3 className="font-medium">{variant.name}</h3>
                      {variant.note ? <p className="text-sm text-muted-foreground">{variant.note}</p> : null}
                    </div>
                    <div>{variant.render()}</div>
                  </section>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
