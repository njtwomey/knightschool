import {
  courseProgress,
  plainText,
  roleOf,
  type MatchReason,
  type OpeningGroup,
  type OpeningIndexEntry,
} from '@knightschool/core';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { Badge } from '@/components/ui/badge';
import { Hint } from '@/components/hint';
import { Progress } from '@/components/ui/progress';
import { percent } from '@/features/courses/progress';
import { to } from '@/router/location';
import { ECO_HINT, PROGRESS_HINT, ROLE_HINT, SIDE_HINT, TIER_HINT } from '@/components/tags/hints';

type LineInfo = { id: string; name: string; kind: 'line' | 'refutation' };

const TIER = { 1: 'Study first', 2: 'Study next', 3: 'Alternative' } as const;

const SHOWN_MATCHES = 3;

/**
 * The lines a board search passes through: how many, the first few by name, and "and N more" to open the rest in place.
 * The card is a link, so opening the list must not follow it.
 */
function MatchedLines({ matches }: { matches: LineInfo[] }) {
  const [open, setOpen] = useState(false);
  const name = (line: LineInfo) => `${line.name}${line.kind === 'refutation' ? ' (trap)' : ''}`;
  const hidden = matches.length - SHOWN_MATCHES;
  const toggle = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(!open);
  };
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        {matches.length} {matches.length === 1 ? 'line' : 'lines'} reach this position
      </span>
      : {(open ? matches : matches.slice(0, SHOWN_MATCHES)).map(name).join(', ')}
      {hidden > 0 && (
        <>
          {', '}
          <span
            role="button"
            tabIndex={0}
            aria-expanded={open}
            className="relative z-10 cursor-pointer text-foreground underline decoration-dotted underline-offset-2"
            onClick={toggle}
            onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && toggle(event)}
          >
            {open ? 'show fewer' : `and ${hidden} more`}
          </span>
        </>
      )}
    </p>
  );
}

/** A course: its board, name, who plays what, where it sits in the study order, and how far through it you are. */
export function CourseCard({
  course,
  openings,
  learned,
  matches,
  reason,
  here,
}: {
  course: OpeningIndexEntry;
  openings: OpeningGroup[];
  learned: Record<string, number>;
  /** The lines of this course that the board search passes through. */
  matches?: LineInfo[];
  /** Why the search found this course, when it was not by name. */
  reason?: MatchReason;
  /** The opening of the position the board search reached; shown instead of the course's summary. */
  here?: string;
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
          {course.eco && (
            <Hint text={ECO_HINT}>
              <Badge variant="outline">{course.eco}</Badge>
            </Hint>
          )}
        </div>
        {matches && matches.length > 0 && here ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Here: </span>
            <span className="font-medium">{here}</span>
          </p>
        ) : (
          <p className="line-clamp-2 text-sm text-muted-foreground">{plainText(course.summary)}</p>
        )}
        <div className="flex flex-wrap gap-1 text-xs">
          <Hint text={TIER_HINT[course.tier]}>
            <Badge
              variant={course.tier === 1 ? 'default' : 'secondary'}
              className="px-1.5 py-0 text-[11px] font-normal"
            >
              {TIER[course.tier]}
            </Badge>
          </Hint>
          <Hint text={SIDE_HINT[course.side]}>
            <Badge variant="outline" className="px-1.5 py-0 text-[11px] font-normal">
              you play {course.side}
            </Badge>
          </Hint>
          <Hint text={ROLE_HINT[role]}>
            <Badge variant="outline" className="px-1.5 py-0 text-[11px] font-normal">
              {role === 'play' ? 'playing it' : `against ${opening?.name ?? 'it'}`}
            </Badge>
          </Hint>
        </div>
        {!(matches && matches.length > 0) && reason && reason.kind !== 'name' && (
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
        {matches && matches.length > 0 && <MatchedLines matches={matches} />}
        <div className="mt-auto grid gap-1.5">
          {progress.total > 0 && (
            <Hint text={PROGRESS_HINT.progress}>
              <Progress value={percent(progress.learned, progress.total)} aria-label={`${course.name} progress`} />
            </Hint>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {progress.total === 0
                ? 'Reading only: drilled in other courses'
                : started
                  ? `${progress.learned} of ${progress.total} moves learned`
                  : `${progress.total} moves to learn`}
            </span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              {started ? 'Continue' : progress.total === 0 ? 'Read' : 'Start'}{' '}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
