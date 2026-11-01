import { BookText, Database, ExternalLink, Library, Newspaper, Video, type LucideIcon } from 'lucide-react';
import { Fragment, useId, useSyncExternalStore } from 'react';
import { Hint } from '@/components/shared/hint';
import { cn } from '@/lib/utils';
import type { Source, SourceKind } from './types';

const KIND: Record<SourceKind, { icon: LucideIcon; name: string }> = {
  video: { icon: Video, name: 'Video' },
  book: { icon: BookText, name: 'Book' },
  article: { icon: Newspaper, name: 'Article' },
  study: { icon: Library, name: 'Lichess study' },
  database: { icon: Database, name: 'Database' },
};

const subscribe = (change: () => void) => {
  window.addEventListener('online', change);
  window.addEventListener('offline', change);
  return () => {
    window.removeEventListener('online', change);
    window.removeEventListener('offline', change);
  };
};
const useOnline = () =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

function SourceLink({ source, online, className }: { source: Source; online: boolean; className?: string }) {
  return (
    <Hint text={online ? source.url : `${source.url} (needs a connection)`}>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-baseline gap-1 rounded-sm font-medium underline decoration-muted-foreground/50 underline-offset-4',
          'hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          className,
        )}
      >
        {source.title}
        <ExternalLink className="size-3 shrink-0 self-center text-muted-foreground" aria-hidden />
        <span className="sr-only">(opens in a new tab, leaving Knight School)</span>
      </a>
    </Hint>
  );
}

/**
 * The videos, books and articles an opening credits, as a short list of links (docs/v2/components/sources-list.md).
 * No sources: draws nothing.
 */
export function SourcesList({
  sources,
  layout = 'list',
  className,
}: {
  sources: Source[];
  /** `list`: the opening page's foot; `inline`: one line, for the opening card and the line page. */
  layout?: 'list' | 'inline';
  className?: string;
}) {
  const online = useOnline();
  const heading = useId();
  if (!sources.length) return null;

  if (layout === 'inline') {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Sources:{' '}
        {sources.map((source, i) => (
          <Fragment key={source.url}>
            <SourceLink source={source} online={online} className="font-normal text-foreground" />
            {i < sources.length - 1 ? ', ' : null}
          </Fragment>
        ))}
      </p>
    );
  }

  return (
    <section className={cn('grid gap-2', className)} aria-labelledby={heading}>
      <h3 id={heading} className="text-sm font-semibold">
        Sources
      </h3>
      <ul className="grid gap-2">
        {sources.map((source) => {
          const kind = KIND[source.kind ?? 'article'];
          const Icon = kind.icon;
          return (
            <li key={source.url} className="flex gap-2.5 text-sm">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={kind.name} />
              <span className="grid gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <SourceLink source={source} online={online} />
                  {source.author ? <span className="text-muted-foreground">{source.author}</span> : null}
                </span>
                {source.note ? <span className="text-muted-foreground">{source.note}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Ideas taken from these sources and written in our own words; every claim checked with the engine.
      </p>
    </section>
  );
}
