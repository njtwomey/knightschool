import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';
import { useCatalog } from '@/data/catalog-store';

/**
 * An ECO code as a link to the opening's page on Lichess (its moves, games and statistics), opening in a new tab, with
 * an icon that says it leaves the site. The address comes from the build (`lichess` in index.json): the line's deepest
 * named position, or the course's. Without one it is a plain badge.
 */
export function EcoLink({
  eco,
  course,
  line,
  className,
}: {
  eco: string;
  course: string;
  line?: string;
  className?: string;
}) {
  const href = useCatalog((state) => {
    const entry = state.index.find((candidate) => candidate.id === course);
    return line ? entry?.lines.find((candidate) => candidate.id === line)?.lichess : entry?.lichess;
  });
  if (!href)
    return (
      <Badge variant="outline" className={className}>
        {eco}
      </Badge>
    );
  return (
    <Badge asChild variant="outline" className={cn('gap-1 hover:bg-accent', className)}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={`${eco} on Lichess: the opening, its games and statistics`}
      >
        {eco}
        <ExternalLink aria-hidden className="size-3" />
        <span className="sr-only">(opens Lichess in a new tab)</span>
      </a>
    </Badge>
  );
}
