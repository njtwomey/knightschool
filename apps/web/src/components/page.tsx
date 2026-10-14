import type { ComponentProps } from 'react';
import { cn } from 'cn';

/**
 * The one width and padding for every page, so moving between Browse, an opening, a line, the quiz and the rest never
 * changes how wide the content is. Pass a `className` for the page's own grid.
 */
export function Page({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto grid w-full max-w-6xl gap-5 px-4 py-6', className)} {...props} />;
}
