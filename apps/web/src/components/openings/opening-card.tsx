import { Bookmark, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { OpeningName } from '@/components/chess/opening-name';
import { ModeCounts } from '@/components/progress/mode-counts';
import { ProgressRing } from '@/components/progress/progress-ring';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Hint } from '@/components/shared/hint';
import { ABOVE_ROW_LINK, ABOVE_ROW_LINK_GROUP, CardLink, LINKED_CARD } from '@/components/shared/card-link';
import { IconAction } from '@/components/shared/icon-action';
import { cn } from '@/lib/utils';
import { STYLE_INFO, type OpeningSummary } from './types';

export type OpeningCardProps = {
  opening?: OpeningSummary;
  /** `full`: the Openings page and onboarding; `small`: pickers and search results (thumb, name, side, ring). */
  size?: 'full' | 'small';
  /** A page action, such as Choose in onboarding and the slot picker; it keeps its own click. */
  action?: ReactNode;
  /** "Why it matched", from the search box. */
  match?: ReactNode;
  /** Links into each mode, for the counts. */
  modeHrefs?: Parameters<typeof ModeCounts>[0]['hrefs'];
  loading?: boolean;
  className?: string;
};

const LEVEL = { beginners: 'For beginners', improvers: 'For improvers' } as const;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/**
 * An opening in a list: what it is, who it suits, and how far the learner has got with it
 * (docs/v2/components/opening-card.md).
 */
export function OpeningCard({
  opening,
  size = 'full',
  action,
  match,
  modeHrefs,
  loading,
  className,
}: OpeningCardProps) {
  if (loading || !opening) {
    return size === 'small' ? (
      <Card size="sm" className={cn('flex-row items-center gap-3 px-3', className)}>
        <Skeleton className="size-14 rounded-md" />
        <div className="grid flex-1 gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </Card>
    ) : (
      <Card className={cn('flex-row gap-4 px-4', className)}>
        <Skeleton className="size-28 shrink-0 rounded-md" />
        <div className="grid flex-1 content-start gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-5 w-48" />
        </div>
      </Card>
    );
  }

  const label = `${opening.name}, ${opening.trigger.toLowerCase()}`;
  const yours = opening.authored ? (
    <span className={cn('inline-flex items-center gap-0.5', ABOVE_ROW_LINK)}>
      <Badge variant="secondary">Yours</Badge>
      {opening.editHref ? (
        <IconAction label="Edit in Create" href={opening.editHref}>
          <Pencil />
        </IconAction>
      ) : null}
    </span>
  ) : null;

  if (size === 'small') {
    return (
      <Card size="sm" className={cn(LINKED_CARD, 'flex-row items-center gap-3 px-3', className)}>
        <CardLink href={opening.href} label={label} />
        <BoardThumb {...opening.thumb} className="w-14 shrink-0" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <OpeningName name={opening.name} eco={opening.eco} oneLine className="text-sm" />
          <span className="text-xs text-muted-foreground">{opening.trigger}</span>
          {match ? <span className="text-xs text-muted-foreground">{match}</span> : null}
        </div>
        {yours}
        {opening.started ? (
          <span className={ABOVE_ROW_LINK}>
            <ProgressRing counts={opening.started.progress} size="sm" cleared={opening.started.finalTestCleared} />
          </span>
        ) : null}
        {action ? <span className={ABOVE_ROW_LINK}>{action}</span> : null}
      </Card>
    );
  }

  return (
    <Card className={cn(LINKED_CARD, 'flex-row gap-4 px-4', className)}>
      <CardLink href={opening.href} label={label} />
      <BoardThumb {...opening.thumb} className="w-28 shrink-0 self-start" />
      <div className="grid min-w-0 flex-1 content-start gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="grid gap-0.5">
            <OpeningName name={opening.name} eco={opening.eco} className="text-base" />
            <span className="text-sm text-muted-foreground">
              {opening.trigger} · {LEVEL[opening.level]}
            </span>
            {match ? <span className="text-xs text-muted-foreground">{match}</span> : null}
          </div>
          {opening.started ? (
            <span className={ABOVE_ROW_LINK}>
              <ProgressRing counts={opening.started.progress} size="sm" cleared={opening.started.finalTestCleared} />
            </span>
          ) : null}
        </div>
        <p className="text-sm">{opening.suits}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {opening.style.map((tag) => (
            <Hint key={tag} text={STYLE_INFO[tag].hint}>
              <Badge variant="outline" tabIndex={0} className={cn('cursor-default', ABOVE_ROW_LINK)}>
                {STYLE_INFO[tag].name}
              </Badge>
            </Hint>
          ))}
          {yours}
        </div>
        {opening.started ? (
          <ModeCounts counts={opening.started.modes} hrefs={modeHrefs} className={ABOVE_ROW_LINK_GROUP} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {plural(opening.size.variations, 'variation')}, {plural(opening.size.steps, 'step')}, about{' '}
            {plural(opening.size.hours, 'hour')}
          </p>
        )}
        {opening.inRepertoire || action ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {opening.inRepertoire ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium">
                <Bookmark className="size-3.5 fill-current text-state-known" aria-hidden />
                In your repertoire, {opening.inRepertoire}
              </span>
            ) : (
              <span />
            )}
            {action ? <span className={ABOVE_ROW_LINK}>{action}</span> : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
