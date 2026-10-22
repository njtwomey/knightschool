import type { CourseUnit, OpeningContent, UnitProgress } from '@knightschool/core';
import { BookOpen, ListChecks, Lock, Swords, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { ABOVE_ROW_LINK, RowLink } from '@/components/sortable-table';
import { KIND_LABEL } from '@/components/tags/hints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { lineHref } from '@/router/hrefs';
import { to } from '@/router/location';
import { StretchMoves } from './stretch-moves';
import { STATE } from './unit-state';
import { headline } from './unit-text';

/** One unit of the path: its state, its moves, what opens it, its extras, and Learn and Drill for just that unit. */
export function UnitRow({
  content,
  unit,
  units,
  progress,
  selected,
  onSelect,
}: {
  content: OpeningContent;
  unit: CourseUnit;
  units: CourseUnit[];
  progress: UnitProgress | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const state = progress?.state ?? 'locked';
  const { name: stateName, icon: StateIcon, blurb } = STATE[state];
  const variants = content.opening.variants;
  const lineName = variants.find((variant) => variant.id === unit.line)?.name ?? unit.line;
  const course = content.opening.id;
  const waiting = (progress?.waitingFor ?? []).map((id) => units.find((other) => other.id === id)!).filter(Boolean);
  const quizzes = unit.quizzes.flatMap((id) => content.quizzes.find((quiz) => quiz.id === id) ?? []);
  const traps = unit.traps.flatMap((id) => variants.find((variant) => variant.id === id) ?? []);
  const ref = { n: unit.n };
  // Where each stretch's moves begin in the unit's list of moves.
  const starts = unit.stretches.map((_, i) =>
    unit.stretches.slice(0, i).reduce((sum, stretch) => sum + stretch.plies.length, 0),
  );

  return (
    <li
      className={`relative grid gap-2 rounded-xl border bg-card p-3 ${selected ? 'ring-2 ring-ring' : ''} ${state === 'locked' ? 'opacity-80' : ''}`}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold tabular-nums"
          aria-hidden
          title={`Unit id ${unit.id}, for course.yaml units:`}
        >
          {unit.index + 1}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="font-semibold leading-tight">
            <RowLink onClick={onSelect} label={`Unit ${unit.index + 1}: ${lineName}, show it on the board`}>
              {lineName}
            </RowLink>
          </h3>
          <p className="text-sm text-muted-foreground">{headline(content, unit, units)}</p>
        </div>
        <div className={`flex flex-wrap items-center gap-1.5 ${ABOVE_ROW_LINK}`}>
          <Badge variant="outline">{KIND_LABEL[unit.kind]}</Badge>
          <Badge
            variant={state === 'locked' ? 'outline' : state === 'unlocked' ? 'secondary' : 'default'}
            title={blurb}
          >
            <StateIcon aria-hidden /> {stateName}
          </Badge>
        </div>
      </div>

      <div className="grid gap-1 pl-11">
        {unit.stretches.map((stretch, i) => {
          const slice = progress && {
            ...progress,
            moves: progress.moves.slice(starts[i], starts[i]! + stretch.plies.length),
          };
          return <StretchMoves key={i} content={content} stretch={stretch} progress={slice} />;
        })}
        <p className="text-xs text-muted-foreground">
          {unit.cards.length} {unit.cards.length === 1 ? 'move' : 'moves'} of yours
          {progress &&
            progress.introduced > 0 &&
            `: ${progress.moves.filter((move) => move.passed || move.graduated).length} passed, ${progress.introduced} in your quiz`}
          {unit.stretches.length > 1 && `, in ${unit.stretches.length} short branches`}.
        </p>
        {state === 'locked' && waiting.length > 0 && (
          <p className="text-sm">
            <Lock className="mr-1 inline size-3.5" aria-hidden />
            Opens when you pass{' '}
            {waiting.map((other, i) => (
              <span key={other.id}>
                {i > 0 && ' and '}
                unit {other.index + 1} ({variants.find((variant) => variant.id === other.line)?.name ?? other.line})
              </span>
            ))}
            .
          </p>
        )}
        {(quizzes.length > 0 || traps.length > 0) && (
          <Extras className={ABOVE_ROW_LINK}>
            {traps.map((trap) => (
              <li key={trap.id}>
                <Swords className="mr-1 inline size-3.5" aria-hidden />
                <a className="underline-offset-4 hover:underline" href={to(lineHref(course, trap.id, 'about'))}>
                  {KIND_LABEL[trap.whose === 'for-us' ? 'for-us' : 'against-us']}: {trap.name}
                </a>
              </li>
            ))}
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <ListChecks className="mr-1 inline size-3.5" aria-hidden />
                Question: {quiz.prompt}
              </li>
            ))}
          </Extras>
        )}
        <div className={`flex flex-wrap gap-2 pt-1 ${ABOVE_ROW_LINK}`}>
          <Button asChild size="sm" variant={state === 'unlocked' ? 'default' : 'outline'}>
            <a href={to(lineHref(course, unit.line, 'learn', ref))}>
              <BookOpen aria-hidden /> Learn
            </a>
          </Button>
          <Button asChild size="sm" variant={state === 'learning' ? 'default' : 'outline'}>
            <a href={to(lineHref(course, unit.line, 'drill', ref))}>
              <Target aria-hidden /> Drill
            </a>
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Supplementary material: shown with the unit, never needed to pass it. */
function Extras({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1 rounded-lg bg-muted/50 p-2 text-sm ${className}`}>
      <p className="text-xs font-medium text-muted-foreground">Extras, not needed to pass</p>
      <ul className="grid gap-1">{children}</ul>
    </div>
  );
}
