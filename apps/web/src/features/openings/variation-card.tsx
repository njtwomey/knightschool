import { roleOf, type LineHit, type OpeningGroup } from '@knightschool/core';
import { BookOpen, Target } from 'lucide-react';
import { BoardThumb } from '@/components/board/board-thumb';
import { Hint } from '@/components/hint';
import { Badge } from '@/components/ui/badge';
import { IconAction } from '@/features/browse/icon-action';
import { to } from '@/router/location';
import { ROLE_HINT, SIDE_HINT, TRAP_HINT, WEIGHT_HINT } from './explanations';
import { lineHref } from '@/features/line/tabs';

/** A variation found by search, drawn like an opening: its board, name and where it lives. Click to see it on the board. */
export function VariationCard({ hit, openings }: { hit: LineHit; openings: OpeningGroup[] }) {
  const { course, line } = hit;
  const role = roleOf(course, openings);
  const href = to(lineHref(course.id, line.id));
  return (
    <li className="group relative flex gap-3 rounded-xl border bg-card p-3 text-card-foreground transition-colors hover:bg-accent">
      <div className="w-24 shrink-0 sm:w-28">
        <BoardThumb id={`${course.id}-${line.id}`} epd={line.epd} side={course.side} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <a
          href={href}
          className='font-medium leading-tight outline-none after:absolute after:inset-0 after:rounded-xl after:content-[""] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50'
        >
          {line.name}
        </a>
        <p className="text-xs text-muted-foreground">
          {course.name}
          {line.opponent && (
            <>
              {' '}
              · after <span className="font-mono">{line.opponent}</span>
            </>
          )}
        </p>
        <div className="relative z-10 flex flex-wrap gap-1">
          <Hint text={SIDE_HINT[course.side]}>
            <Badge variant="outline" className="px-1.5 py-0 text-[11px] font-normal">
              as {course.side}
            </Badge>
          </Hint>
          {role === 'against' && (
            <Hint text={ROLE_HINT.against}>
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                against it
              </Badge>
            </Hint>
          )}
          {line.weight && line.weight !== 'main' && (
            <Hint text={WEIGHT_HINT[line.weight]}>
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                {line.weight}
              </Badge>
            </Hint>
          )}
          {line.kind === 'refutation' && (
            <Hint text={line.whose === 'against-us' ? TRAP_HINT['against-us'] : TRAP_HINT['for-us']}>
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
                {line.whose === 'against-us' ? 'trap to avoid' : 'trap'}
              </Badge>
            </Hint>
          )}
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col justify-center gap-1">
        <IconAction label="Learn it first" href={to(`/play/${course.id}/${line.id}/learn`)}>
          <BookOpen aria-hidden />
        </IconAction>
        <IconAction label="Drill it" href={to(`/play/${course.id}/${line.id}/drill`)}>
          <Target aria-hidden />
        </IconAction>
      </div>
    </li>
  );
}
