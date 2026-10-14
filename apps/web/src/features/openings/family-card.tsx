import { familyProgress, isMotifFamily, roleOf, type FamilyView, type MatchReason } from '@knightschool/core';
import { ArrowRight } from 'lucide-react';
import { BoardThumb } from '@/components/board/board-thumb';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { percent } from '@/features/courses/progress';
import { to } from '@/router/location';

type LineInfo = { id: string; name: string; kind: 'line' | 'refutation' };

/** An opening: its courses summed up as playing it and playing against it, and how far through them you are. */
export function FamilyCard({
  view,
  learned,
  matches,
  reason,
}: {
  view: FamilyView;
  learned: Record<string, number>;
  matches?: Map<string, LineInfo[]>;
  /** Why the search found this opening, when it was not by name. */
  reason?: MatchReason;
}) {
  const { family, courses } = view;
  const play = courses.filter((course) => roleOf(course) === 'play');
  const motif = isMotifFamily(courses);
  const progress = familyProgress(courses, learned);
  const started = progress.learned > 0;
  const matched = courses.flatMap((course) => matches?.get(course.id) ?? []);
  const side = courses[0]?.side ?? 'white';

  return (
    <a
      href={to(`/${motif ? 'motif' : 'opening'}/${family.id}`)}
      className="group flex gap-3 rounded-xl border bg-card p-3 text-card-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="w-24 shrink-0 sm:w-28">
        <BoardThumb id={family.id} epd={family.epd} side={play[0]?.side ?? side} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold leading-tight">{family.name}</h3>
          {family.eco && <Badge variant="outline">{family.eco}</Badge>}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{family.summary}</p>
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
        {matched.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Matches: {matched.map((line) => `${line.name}${line.kind === 'refutation' ? ' (trap)' : ''}`).join(', ')}
          </p>
        )}
        <div className="mt-auto grid gap-1.5">
          <Progress value={percent(progress.learned, progress.total)} aria-label={`${family.name} progress`} />
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
