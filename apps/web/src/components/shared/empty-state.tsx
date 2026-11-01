import { Lock, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export type EmptyKind = 'new' | 'done' | 'no-match' | 'not-covered' | 'locked' | 'needs-username' | 'offline';

/** An action that fixes the emptiness: a link or a button. */
export type EmptyAction = { label: string; href?: string; onClick?: () => void };

export type EmptyStateProps = {
  /** Sets the tone and which icon, if any (a lock for locked, a cloud for offline; no illustrations). */
  kind: EmptyKind;
  /** One sentence on why it is empty, in the learner's terms. */
  text: ReactNode;
  action?: EmptyAction;
  /** A second, quieter action at most. */
  secondary?: EmptyAction;
  /**
   * `part`: one muted line inside a board part or a list; `panel`: centred in a panel; `page`: a card for a page that
   * has nothing to show.
   */
  size?: 'part' | 'panel' | 'page';
  className?: string;
};

const ICONS: Partial<Record<EmptyKind, ReactNode>> = {
  locked: <Lock aria-hidden />,
  offline: <WifiOff aria-hidden />,
};

function ActionButton({ action, quiet }: { action: EmptyAction; quiet?: boolean }) {
  const variant = quiet ? 'ghost' : 'outline';
  return action.href ? (
    <Button asChild variant={variant} size="sm">
      <a href={action.href}>{action.label}</a>
    </Button>
  ) : (
    <Button variant={variant} size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

/**
 * What a list, a panel or a page says when there is nothing in it, and the one thing to do about it; never a blank
 * box, never only "No results" (docs/v2/components/empty-state.md). Announced as a status, so a list that empties
 * after a filter change is heard.
 */
export function EmptyState({ kind, text, action, secondary, size = 'panel', className }: EmptyStateProps) {
  if (size === 'part') {
    return (
      <p
        role="status"
        className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground', className)}
      >
        {ICONS[kind] ? <span className="[&_svg]:size-3.5">{ICONS[kind]}</span> : null}
        <span>{text}</span>
        {action ? (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            asChild={!!action.href}
            onClick={action.href ? undefined : action.onClick}
          >
            {action.href ? <a href={action.href}>{action.label}</a> : action.label}
          </Button>
        ) : null}
      </p>
    );
  }
  const body = (
    <Empty role="status" className={cn(size === 'panel' && 'border p-6', size === 'page' && 'p-10', className)}>
      <EmptyHeader>
        {ICONS[kind] ? <EmptyMedia variant="icon">{ICONS[kind]}</EmptyMedia> : null}
        <EmptyDescription className="text-foreground">{text}</EmptyDescription>
      </EmptyHeader>
      {action || secondary ? (
        <EmptyContent className="flex-row flex-wrap justify-center">
          {action ? <ActionButton action={action} /> : null}
          {secondary ? <ActionButton action={secondary} quiet /> : null}
        </EmptyContent>
      ) : null}
    </Empty>
  );
  return size === 'page' ? <Card className="py-0">{body}</Card> : body;
}
