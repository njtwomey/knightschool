import { AlertCircle, AlertTriangle, Archive, CircleCheck, Pause, RefreshCw, WifiOff, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type NoticeKind = 'saved' | 'problem' | 'reminder' | 'offline' | 'paused' | 'update' | 'error';

type KindSpec = {
  icon: ReactNode;
  /** `status` is announced politely, `alert` at once. */
  role: 'status' | 'alert';
  scope: 'site' | 'page';
  /** Whether it can be put away while it is still true. */
  dismiss: false | string;
  tone?: 'destructive';
};

const KINDS: Record<NoticeKind, KindSpec> = {
  saved: { icon: <CircleCheck aria-hidden />, role: 'status', scope: 'page', dismiss: 'Close' },
  problem: {
    icon: <AlertTriangle aria-hidden className="text-destructive!" />,
    role: 'alert',
    scope: 'page',
    dismiss: false,
  },
  reminder: { icon: <Archive aria-hidden />, role: 'status', scope: 'page', dismiss: 'Remind me tomorrow' },
  offline: { icon: <WifiOff aria-hidden />, role: 'status', scope: 'site', dismiss: false },
  paused: { icon: <Pause aria-hidden />, role: 'status', scope: 'site', dismiss: false },
  update: { icon: <RefreshCw aria-hidden />, role: 'status', scope: 'site', dismiss: false },
  error: { icon: <AlertCircle aria-hidden />, role: 'alert', scope: 'page', dismiss: false, tone: 'destructive' },
};

/** How long a `saved` notice stays when nothing else replaces it. */
export const SAVED_NOTICE_MS = 8000;

export type NoticeProps = {
  kind: NoticeKind;
  /** The page's words; the look, icon, placement and announcement come from the kind. */
  text: ReactNode;
  /** More under the line: the problems list, a sentence of detail. */
  detail?: ReactNode;
  /** What it offers: Undo, Export, Use it in this tab, Reload, Try again. */
  action?: ReactNode;
  /** Overrides the kind's placement: `site` is a full-width banner under the header. */
  scope?: 'site' | 'page';
  /** Shown only for kinds that can be put away while still true (saved, reminder). */
  onDismiss?: () => void;
  /** A `saved` notice calls this after eight seconds. */
  onExpire?: () => void;
  className?: string;
};

/**
 * A message about the site rather than the chess, in one of a few fixed kinds, shown in place: never a toast in a
 * corner, never over the board (docs/v2/components/notice.md).
 */
export function Notice({ kind, text, detail, action, scope, onDismiss, onExpire, className }: NoticeProps) {
  const spec = KINDS[kind];
  const site = (scope ?? spec.scope) === 'site';

  useEffect(() => {
    if (kind !== 'saved' || !onExpire) return;
    const id = window.setTimeout(onExpire, SAVED_NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [kind, onExpire, text]);

  return (
    <Alert
      role={spec.role}
      variant={spec.tone === 'destructive' ? 'destructive' : 'default'}
      className={cn(
        !detail && 'items-center',
        site && 'rounded-none border-x-0 bg-muted/60 px-4',
        kind === 'saved' && 'bg-muted/40',
        className,
      )}
    >
      {spec.icon}
      <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <AlertTitle className="min-w-0 font-normal">{text}</AlertTitle>
        {action || (spec.dismiss && onDismiss) ? (
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {action}
            {spec.dismiss && onDismiss ? (
              spec.dismiss === 'Close' ? (
                <Button variant="ghost" size="icon-xs" aria-label="Close" onClick={onDismiss}>
                  <X aria-hidden />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  {spec.dismiss}
                </Button>
              )
            ) : null}
          </div>
        ) : null}
      </div>
      {detail ? (
        <AlertDescription className="col-start-2 mt-1 text-foreground [&_p:not(:last-child)]:mb-0">
          {detail}
        </AlertDescription>
      ) : null}
    </Alert>
  );
}
