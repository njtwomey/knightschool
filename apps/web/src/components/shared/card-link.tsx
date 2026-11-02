import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Cards and rows that do something when clicked anywhere on them (docs/v2/patterns/interaction.md, "No dead cards").
 *
 * The card gets `LINKED_CARD` (it must be the positioned box the link stretches over); inside it, one `CardLink` (it
 * opens a page) or `CardAction` (it does something here, such as selecting). Controls inside the card that keep their
 * own click carry `ABOVE_ROW_LINK`. There is one focus stop for the card, named by the link's text or label.
 */

/** Put on a control inside a card or row with a `CardLink`/`CardAction`, so it keeps its own click above it. */
export const ABOVE_ROW_LINK = 'relative z-10';

/**
 * Put on a wrapper of such controls (a footer of buttons, a row of chips): its controls keep their clicks, and a click on
 * the space between them still reaches the card.
 */
export const ABOVE_ROW_LINK_GROUP =
  'pointer-events-none relative z-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_[tabindex]]:pointer-events-auto';

/** A card that opens something: positioned for the stretched link, a hover border and a focus ring when it has focus. */
export const LINKED_CARD =
  'relative cursor-pointer transition-colors hover:border-primary/40 has-[[data-card-link]:focus-visible]:ring-2 has-[[data-card-link]:focus-visible]:ring-ring';

const STRETCH = 'after:absolute after:inset-0 after:rounded-[inherit] after:content-[""]';

/**
 * A link stretched over its card or row. With `children` it is the card's title text (underlined on hover); without,
 * an invisible cover named by `label`.
 */
export function CardLink({
  href,
  label,
  children,
  className,
}: {
  href: string;
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      data-card-link
      aria-label={children ? undefined : label}
      className={cn(
        'font-medium text-foreground no-underline outline-none',
        children ? STRETCH : 'absolute inset-0 rounded-[inherit]',
        className,
      )}
    >
      {children}
    </a>
  );
}

/** The same for a card whose click does something on this page (select it, show it on the board). */
export function CardAction({
  onClick,
  label,
  pressed,
  className,
}: {
  onClick: () => void;
  label: string;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      data-card-link
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'absolute inset-0 h-auto rounded-[inherit] p-0 hover:bg-transparent focus-visible:ring-0 dark:hover:bg-transparent',
        className,
      )}
    />
  );
}
