import type { ReactNode } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { IdeaBadge } from '@/components/chess/idea-badge';
import { OpeningName } from '@/components/chess/opening-name';
import { LineCard } from '@/components/openings/line-row';
import { OpeningCard } from '@/components/openings/opening-card';
import { ABOVE_ROW_LINK, CardLink, LINKED_CARD } from '@/components/shared/card-link';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ResultView } from './search-data';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const sideName = { white: 'As White', black: 'As Black' } as const;

function VariationCard({ view, match }: { view: Extract<ResultView, { kind: 'variation' }>; match: ReactNode }) {
  return (
    <Card size="sm" className={cn(LINKED_CARD, 'h-full flex-row items-center gap-3 px-3')}>
      <CardLink href={view.href} label={`${view.name}, in the ${view.opening}`} />
      <BoardThumb {...view.thumb} className="w-14 shrink-0" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <OpeningName name={`${view.opening}: ${view.name}`} className="text-sm" />
        <span className="text-xs text-muted-foreground">
          {sideName[view.side]}, {plural(view.lines, 'line')}
        </span>
        {match ? <span className="text-xs text-muted-foreground">{match}</span> : null}
      </div>
    </Card>
  );
}

function IdeaCard({ view, match }: { view: Extract<ResultView, { kind: 'idea' }>; match: ReactNode }) {
  const first = view.openings[0]!;
  return (
    <Card size="sm" className={cn(LINKED_CARD, 'h-full gap-1.5 px-3')}>
      <CardLink href={first.href} label={`${view.idea.name}, taught in the ${first.name}`} />
      <span className={cn('justify-self-start', ABOVE_ROW_LINK)}>
        <IdeaBadge idea={view.idea} href={first.href} />
      </span>
      <p className="text-sm text-muted-foreground">{view.idea.summary}</p>
      <p className="text-xs text-muted-foreground">
        Taught in{' '}
        {view.openings.map((opening, i) => (
          <span key={opening.href}>
            {i > 0 ? ', ' : null}
            <a href={opening.href} className={cn('underline-offset-2 hover:underline', ABOVE_ROW_LINK)}>
              {opening.name}
            </a>
          </span>
        ))}
      </p>
      {match ? <p className="text-xs text-muted-foreground">{match}</p> : null}
    </Card>
  );
}

/** One result of any kind; each opens what it names (docs/v2/pages/search.md). */
export function ResultCard({ view, match, href }: { view: ResultView; match?: ReactNode; href?: string }) {
  switch (view.kind) {
    case 'opening':
      return <OpeningCard opening={view.opening} size="small" match={match} className="h-full" />;
    case 'variation':
      return <VariationCard view={view} match={match} />;
    case 'line':
      return (
        <LineCard line={href ? { ...view.line, href } : view.line} match={match} showKnown={false} className="h-full" />
      );
    case 'idea':
      return <IdeaCard view={view} match={match} />;
  }
}
