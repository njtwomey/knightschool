import { Badge } from '@/components/ui/badge';

const LABEL: Record<string, string> = { tip: 'Tip', trap: 'Trap', blunder: 'Common blunder' };

/** A move's supplementary tags (tip, trap, common blunder or the author's own word): shown while studying, never asked. */
export function MoveTags({ tags, className }: { tags: string[] | undefined; className?: string }) {
  if (!tags?.length) return null;
  return (
    <span className={`inline-flex flex-wrap gap-1 align-middle ${className ?? ''}`}>
      {tags.map((tag) => (
        <Badge key={tag} variant={tag === 'blunder' || tag === 'trap' ? 'destructive' : 'secondary'}>
          {LABEL[tag] ?? tag.replace(/-/g, ' ')}
        </Badge>
      ))}
    </span>
  );
}
