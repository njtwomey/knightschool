import { ChevronDown } from 'lucide-react';
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EmptyState, type EmptyAction } from './empty-state';
import { Notice } from './notice';
import { PAUSED_REASON, PausedContext } from './paused';
import { to } from '@/router/location';

/** A skeleton shows only after this long, so a fast load never flickers (docs/v2/patterns/states.md). */
export const SKELETON_AFTER_MS = 300;

export type PageGate =
  | { state: 'ready' }
  | { state: 'loading' }
  /** It cannot open: why, in plain words, and what to do. */
  | { state: 'blocked'; text: string; action?: EmptyAction };

export type PageShellProps = {
  /** The page's name: the document title ("Giuoco Piano · Knight School") and, with `showTitle`, a heading. */
  title: string;
  showTitle?: boolean;
  /** The breadcrumbs, or none (Today, the first visit). */
  trail?: ReactNode;
  /** `page` for every page; `wide` for the map, which uses the full screen. */
  width?: 'page' | 'wide';
  gate?: PageGate;
  /** The skeleton's shape: a board and its panel, or rows for a list. */
  skeleton?: 'board' | 'list';
  /** Site banners, full width above the page: offline, a new version. */
  banners?: ReactNode;
  /** Another tab has the database: the page stays readable and the banner offers to take it back. */
  paused?: { onUseHere: () => void };
  /** Notices for this page, under the trail. */
  notices?: ReactNode;
  footer?: boolean;
  /** Sets the document title (off in the mocks, where many shells share one tab). */
  documentTitle?: boolean;
  /** Clears an error when it changes: the address. */
  resetKey?: string;
  children: ReactNode;
};

function PageSkeleton({ shape }: { shape: 'board' | 'list' }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), SKELETON_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);
  if (!shown) return <div className="min-h-64" aria-busy="true" />;
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-4">
      {shape === 'board' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          <Skeleton className="aspect-square w-full" />
          <div className="grid content-start gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
    </div>
  );
}

type BoundaryProps = { resetKey?: string; children: ReactNode };
type BoundaryState = { error: Error | null; key?: string };

/** A page that fails to draw is replaced by a message; the header and menu stay, and moving away clears it. */
class PageErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to draw', error, info.componentStack);
  }

  override render() {
    if (this.state.error) return <PageError error={this.state.error} />;
    return this.props.children;
  }
}

/** "This page could not be shown", with Reload and the error in a fold. */
export function PageError({ error }: { error: Error }) {
  return (
    <div role="alert" className="grid justify-items-start gap-3 rounded-xl border p-6">
      <h2 className="text-lg font-semibold">This page could not be shown</h2>
      <p className="text-muted-foreground">
        Something went wrong while drawing it. Your progress is safe. Reload to try again, or go to another page.
      </p>
      <Button onClick={() => window.location.reload()}>Reload</Button>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
            Details <ChevronDown aria-hidden />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-1 max-w-full overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * A page's frame under the site header: banners, one column width for every page, the trail, the page's notices,
 * the page itself, and what shows while it loads, if it fails, and when another tab has the data
 * (docs/v2/components/page-shell.md).
 */
export function PageShell({
  title,
  showTitle = false,
  trail,
  width = 'page',
  gate = { state: 'ready' },
  skeleton = 'list',
  banners,
  paused,
  notices,
  footer = true,
  documentTitle = true,
  resetKey,
  children,
}: PageShellProps) {
  useEffect(() => {
    if (documentTitle) document.title = `${title} · Knight School`;
  }, [title, documentTitle]);

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr_auto]">
      <div>
        {paused ? (
          <Notice
            kind="paused"
            text="Knight School is open in another tab, so progress is paused here."
            action={
              <Button size="sm" variant="outline" onClick={paused.onUseHere}>
                Use it in this tab
              </Button>
            }
          />
        ) : null}
        {banners}
      </div>
      <main
        className={cn(
          'mx-auto grid w-full content-start gap-4 px-4 py-6',
          width === 'page' ? 'max-w-6xl' : 'max-w-none',
        )}
      >
        {trail}
        {showTitle ? <h1 className="text-2xl font-semibold tracking-tight">{title}</h1> : null}
        {notices ? <div className="grid gap-2">{notices}</div> : null}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
          {gate.state === 'loading' ? (
            <PageSkeleton shape={skeleton} />
          ) : gate.state === 'blocked' ? (
            <EmptyState kind="new" size="page" text={gate.text} action={gate.action} />
          ) : (
            <PageErrorBoundary resetKey={resetKey}>
              <PausedContext.Provider value={paused ? PAUSED_REASON : null}>{children}</PausedContext.Provider>
            </PageErrorBoundary>
          )}
        </div>
      </main>
      {footer ? (
        <footer className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          <a href={to('/credits')} className="underline-offset-2 hover:underline">
            Credits
          </a>{' '}
          ·{' '}
          <a href={to('/credits#licence')} className="underline-offset-2 hover:underline">
            Licence
          </a>{' '}
          · Stockfish is a separate program under the GPL.
        </footer>
      ) : null}
    </div>
  );
}
