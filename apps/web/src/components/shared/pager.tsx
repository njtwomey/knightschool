import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';

/** Where a pager button goes: its name, its address, and `onOpen` when it must ask first instead of going. */
export type PagerLink = { name: string; href: string; onOpen?: () => void };

function PagerButton({ link, direction }: { link: PagerLink; direction: 'Previous' | 'Next' }) {
  const onClick = (event: MouseEvent) => {
    if (!link.onOpen) return;
    event.preventDefault();
    link.onOpen();
  };
  return (
    <Button asChild size="sm" variant="outline">
      <a href={link.href} rel={direction === 'Next' ? 'next' : 'prev'} title={link.name} onClick={onClick}>
        {direction === 'Previous' ? <ArrowLeft aria-hidden /> : null}
        <span className="max-w-44 truncate">
          {direction}: {link.name}
        </span>
        {direction === 'Next' ? <ArrowRight aria-hidden /> : null}
      </a>
    </Button>
  );
}

/**
 * Previous and next through a sequence, each saying what it goes to (docs/v2/components/pager.md). The end of the
 * sequence has no button on that side.
 */
export function Pager({ previous, next, label }: { previous?: PagerLink; next?: PagerLink; label: string }) {
  if (!previous && !next) return null;
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      {previous ? <PagerButton link={previous} direction="Previous" /> : null}
      {next ? <PagerButton link={next} direction="Next" /> : null}
    </nav>
  );
}
