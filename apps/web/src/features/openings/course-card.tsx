import {
  courseProgress,
  roleOf,
  type MatchReason,
  type OpeningGroup,
  type OpeningIndexEntry,
} from '@knightschool/core';
import { ArrowRight } from 'lucide-react';
import { BoardThumb } from '@/components/board/board-thumb';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { percent } from '@/features/courses/progress';
import { to } from '@/router/location';

type LineInfo = { id: string; name: string; kind: 'line' | 'refutation' };

const TIER = { 1: 'Study first', 2: 'Study next', 3: 'Alternative' } as const;

/** A course: its board, name, who plays what, where it sits in the study order, and how far through it you are. */
export function CourseCard({
  course,
  openings,
  learned,
  matches,
  reason,
}: {
  course: OpeningIndexEntry;
  openings: OpeningGroup[];
  learned: Record<string, number>;
  /** The lines of this course that the board search passes through. */
  matches?: LineInfo[];
  /** Why the search found this course, when it was not by name. */
  reason?: MatchReason;
}) {
  const progress = courseProgress([course], learned);
  const started = progress.learned > 0;
  const role = roleOf(course, openings);
  const opening = openings.find((candidate) => candidate.id === course.opening);

  return (
    <a
      href={to(`/course/${course.id}`)}
      className="group flex gap-3 rounded-xl border bg-card p-3 text-card-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="w-24 shrink-0 sm:w-28">
        <BoardThumb id={course.id} epd={course.keyEpd} side={course.side} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold leading-tight">{course.name}</h3>
          {course.eco && <Badge variant="outline">{course.eco}</Badge>}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
        <div className="flex flex-wrap gap-1 text-xs">
          <Badge variant={course.tier === 1 ? 'default' : 'secondary'} className="px-1.5 py-0 text-[11px] font-normal">
            {TIER[course.tier]}
          </Badge>
          <Badge variant="outline" className="px-1.5 py-0 text-[11px] font-normal">
            you play {course.side}
          </Badge>
          <Badge variant="outline" className="px-1.5 py-0 text-[11px] font-normal">
            {role === 'play' ? 'playing it' : `against ${opening?.name ?? 'it'}`}
          </Badge>
        </div>
        {reason && reason.kind !== 'name' && (
          <p className="text-xs text-foreground">
            {reason.kind === 'lines' ? (
              <>
                <span className="font-medium">
                  {reason.names.length} {reason.names.length === 1 ? 'line matches' : 'lines match'}
                </span>
                <span className="text-muted-foreground">
                  : {reason.names.slice(0, 3).join(', ')}
                  {reason.names.length > 3 ? '…' : ''}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Mentioned in its description</span>
            )}
          </p>
        )}
        {matches && matches.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Matches: {matches.map((line) => `${line.name}${line.kind === 'refutation' ? ' (trap)' : ''}`).join(', ')}
          </p>
        )}
        <div className="mt-auto grid gap-1.5">
          <Progress value={percent(progress.learned, progress.total)} aria-label={`${course.name} progress`} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {started ? `${progress.learned} of ${progress.total} moves learned` : `${progress.total} moves to learn`}
            </span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              {started ? 'Continue' : 'Start'}{' '}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
