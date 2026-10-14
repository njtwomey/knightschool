import { roleOf, type LineHit } from '@knightschool/core';
import { BookOpen, Target } from 'lucide-react';
import { BoardThumb } from '@/components/board/board-thumb';
import { Badge } from '@/components/ui/badge';
import { IconAction } from '@/features/browse/icon-action';
import { buildHash } from '@/router/hash';
import { to } from '@/router/location';

/** A variation found by search, drawn like an opening: its board, name and where it lives. Click to see it on the board. */
export function VariationCard({ hit }: { hit: LineHit }) {
  const { family, course, line } = hit;
  const role = roleOf(course);
  const href = to(`/${role === 'motif' ? 'motif' : 'opening'}/${family.id}`) + buildHash({ c: course.id, v: line.id });
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
          {family.name} · {course.name.replace(/^[^:]+: /, '')}
        </p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="px-1.5 py-0 text-[11px] font-normal">
            as {course.side}
          </Badge>
          {role !== 'play' && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
              {role === 'against' ? 'against it' : 'motif'}
            </Badge>
          )}
          {line.kind === 'refutation' && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
              trap
            </Badge>
          )}
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col justify-center gap-1">
        <IconAction label="Learn it first" href={to(`/play/${course.id}/${line.id}/learn`)}>
          <BookOpen aria-hidden />
        </IconAction>
        <IconAction label="Practise" href={to(`/play/${course.id}/${line.id}/practice`)}>
          <Target aria-hidden />
        </IconAction>
      </div>
    </li>
  );
}
