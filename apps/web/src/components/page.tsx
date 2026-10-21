import type { ComponentProps } from 'react';
import { cn } from 'cn';

/**
 * The one width and padding for every page, so moving between Search, an opening, a line, the quiz and the rest never
 * changes how wide the content is. Pass a `className` for the page's own grid. Its one column may be narrower than what
 * is in it, so nothing wide (a table, a long name) can push the page past the edge of a phone: it wraps or scrolls in
 * its own box instead.
 */
export function Page({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-5 px-4 py-6', className)}
      {...props}
    />
  );
}
