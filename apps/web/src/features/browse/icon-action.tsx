import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * The one look of every icon button in a table or card: flat, with an edge and a colour change on hover. Everything that
 * is an icon button there goes through this file, so the behaviour is changed in one place. There is no tooltip (they get
 * in the way of the next button) and no grow effect; `aria-label` still names the button for screen readers.
 */
export const ICON_BUTTON = 'transition-colors hover:bg-accent hover:text-foreground hover:ring-2 hover:ring-primary/60';

/** An icon-only button, as a link or a button. */
export function IconAction({
  label,
  children,
  href,
  onClick,
  pressed,
  disabled,
}: {
  label: string;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Marks a toggle that is on. */
  pressed?: boolean;
  disabled?: boolean;
}) {
  const variant = pressed ? 'secondary' : 'ghost';
  return href ? (
    <Button asChild variant={variant} size="icon-sm" className={ICON_BUTTON}>
      <a href={href} aria-label={label}>
        {children}
      </a>
    </Button>
  ) : (
    <Button
      variant={variant}
      size="icon-sm"
      className={ICON_BUTTON}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
    >
      {children}
    </Button>
  );
}
