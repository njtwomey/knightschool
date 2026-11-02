import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Hint } from './hint';
import { ABOVE_ROW_LINK } from './card-link';

const LOOK =
  'transition-colors hover:bg-accent hover:text-foreground hover:ring-2 hover:ring-primary/60 pointer-coarse:size-10';
const DANGER = 'hover:text-destructive hover:ring-destructive/60';

export type IconActionProps = {
  /** What it does, as a verb: the accessible name and the hint. */
  label: string;
  /** A lucide icon. */
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** A toggle that is on. */
  pressed?: boolean;
  disabled?: boolean;
  /** Why it is disabled; becomes the hint ("Nothing to undo"). */
  disabledReason?: string;
  tone?: 'default' | 'danger';
  /** Ask first, in a small dialog that says what goes with it. */
  confirm?: { title: string; description?: string; action?: string };
  className?: string;
};

/**
 * A small icon button with its label as a hint after the long delay: the one look of every icon button in a table, a
 * card, a row of board controls or a trail (docs/v2/components/icon-action.md).
 */
export function IconAction({
  label,
  children,
  href,
  onClick,
  pressed,
  disabled,
  disabledReason,
  tone = 'default',
  confirm,
  className,
}: IconActionProps) {
  const look = cn(LOOK, tone === 'danger' && DANGER, ABOVE_ROW_LINK, className);
  const variant = pressed ? 'secondary' : 'ghost';

  if (disabled) {
    // A disabled button takes no pointer events, so the hint sits on a wrapper that can be focused.
    return (
      <Hint text={disabledReason ?? label} delay="long">
        <span tabIndex={0} className={cn('inline-flex rounded-md', ABOVE_ROW_LINK)} aria-label={label}>
          <Button variant="ghost" size="icon-sm" className={look} disabled aria-hidden tabIndex={-1}>
            {children}
          </Button>
        </span>
      </Hint>
    );
  }

  if (href) {
    return (
      <Hint text={label} delay="long">
        <Button asChild variant={variant} size="icon-sm" className={look}>
          <a href={href} aria-label={label}>
            {children}
          </a>
        </Button>
      </Hint>
    );
  }

  const button = (
    <Button
      variant={variant}
      size="icon-sm"
      className={look}
      onClick={confirm ? undefined : onClick}
      aria-label={label}
      aria-pressed={pressed}
    >
      {children}
    </Button>
  );

  if (!confirm) {
    return (
      <Hint text={label} delay="long">
        {button}
      </Hint>
    );
  }

  return (
    <AlertDialog>
      <Hint text={label} delay="long">
        <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
      </Hint>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          {confirm.description ? <AlertDialogDescription>{confirm.description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant={tone === 'danger' ? 'destructive' : 'default'} onClick={onClick}>
            {confirm.action ?? label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
