import { AlertTriangle, CircleAlert, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { MoveChip } from '@/components/chess/move-chip';
import { Hint } from '@/components/shared/hint';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * `blocking`: the item does not build and is left out; `bar`: it builds but falls short of what a published opening
 * needs (making-openings.md); `warning`: something the build noticed that may be meant.
 */
export type ProblemLevel = 'blocking' | 'bar' | 'warning';

export type Problem = {
  id: string;
  level: ProblemLevel;
  /** What it is about: a line, a step, a move, or the whole opening. */
  about: {
    itemId: string;
    kind: 'opening' | 'line' | 'step' | 'move';
    name: string;
    href?: string;
    /** For a move: drawn as a move chip. */
    move?: { ply: number; san: string; epd?: string };
  };
  /** One sentence on what is wrong. */
  what: string;
  /** One sentence on what to do. */
  fix?: string;
};

const LEVELS: Record<ProblemLevel, { icon: ReactNode; heading: (n: number) => string; tone: string }> = {
  blocking: {
    icon: <CircleAlert aria-hidden />,
    heading: (n) => `${n} ${n === 1 ? 'thing stops' : 'things stop'} this opening being used`,
    tone: 'text-destructive',
  },
  bar: {
    icon: <AlertTriangle aria-hidden />,
    heading: (n) => `${n} ${n === 1 ? 'thing' : 'things'} to improve before you publish`,
    tone: 'text-verdict-inaccuracy',
  },
  warning: {
    icon: <Info aria-hidden />,
    heading: (n) => `${n} ${n === 1 ? 'thing' : 'things'} to check`,
    tone: 'text-muted-foreground',
  },
};

const LEVEL_NAME: Record<ProblemLevel, string> = { blocking: 'Stops it', bar: 'Before publishing', warning: 'Check' };

export type ProblemsListProps = {
  problems: Problem[];
  /** Only the problems about these items (a line page shows only its line's). */
  ids?: string[];
  /** Which levels to show: the line editor shows blocking only while writing, Publish shows all. */
  levels?: ProblemLevel[];
  /** A single line ("2 problems") that opens the list, for table rows. */
  compact?: boolean;
  /** Goes to the item: the line editor at that move, the step in the step editor. */
  onGo?: (problem: Problem) => void;
  className?: string;
};

function About({ problem, onGo }: { problem: Problem; onGo?: (problem: Problem) => void }) {
  const { about } = problem;
  if (about.move) {
    return (
      <MoveChip
        ply={about.move.ply}
        san={about.move.san}
        epd={about.move.epd}
        onSelect={onGo ? () => onGo(problem) : undefined}
      />
    );
  }
  const label = about.kind === 'line' ? `Line ${about.name}` : about.name;
  if (about.href) {
    return (
      <a href={about.href} className="font-medium underline underline-offset-2">
        {label}
      </a>
    );
  }
  if (onGo) {
    return (
      <Button variant="link" size="sm" className="h-auto p-0 font-medium" onClick={() => onGo(problem)}>
        {label}
      </Button>
    );
  }
  return <span className="font-medium">{label}</span>;
}

function Rows({ problems, onGo }: { problems: Problem[]; onGo?: (problem: Problem) => void }) {
  const levels = (['blocking', 'bar', 'warning'] as const).filter((level) => problems.some((p) => p.level === level));
  return (
    <div className="grid gap-3">
      {levels.map((level) => {
        const rows = problems.filter((p) => p.level === level);
        return (
          <section key={level} className="grid gap-1.5" aria-label={LEVELS[level].heading(rows.length)}>
            <h3 className={cn('flex items-center gap-1.5 text-sm font-medium [&_svg]:size-4', LEVELS[level].tone)}>
              {LEVELS[level].icon}
              <span className="text-foreground">{LEVELS[level].heading(rows.length)}</span>
            </h3>
            <ul className="grid gap-1.5">
              {rows.map((problem) => (
                <li key={problem.id} className="grid gap-0.5 border-l-2 pl-3 text-sm">
                  <p>
                    <About problem={problem} onGo={onGo} />
                    {problem.about.move || problem.about.kind === 'opening' ? ' ' : ': '}
                    {problem.what}
                  </p>
                  {problem.fix ? <p className="text-muted-foreground">{problem.fix}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * What in an author's work does not build yet, or falls short of the bar, shown where it occurs, each saying what is
 * wrong, where, and what to do. With no problems it shows nothing at all (docs/v2/components/problems-list.md).
 */
export function ProblemsList({ problems, ids, levels, compact = false, onGo, className }: ProblemsListProps) {
  const shown = problems.filter(
    (problem) => (!ids || ids.includes(problem.about.itemId)) && (!levels || levels.includes(problem.level)),
  );
  if (shown.length === 0) return null;

  if (compact) {
    const worst = shown.some((p) => p.level === 'blocking')
      ? 'blocking'
      : shown.some((p) => p.level === 'bar')
        ? 'bar'
        : 'warning';
    return (
      <Popover>
        <Hint text={LEVEL_NAME[worst]} delay="long">
          <PopoverTrigger asChild>
            <Button variant="ghost" size="xs" className={cn('relative z-10 [&_svg]:size-3.5', LEVELS[worst].tone)}>
              {LEVELS[worst].icon}
              <span className="text-foreground">
                {shown.length} {shown.length === 1 ? 'problem' : 'problems'}
              </span>
            </Button>
          </PopoverTrigger>
        </Hint>
        <PopoverContent align="start" className="w-96 max-w-[calc(100vw-2rem)]">
          <Rows problems={shown} onGo={onGo} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn('grid gap-2 rounded-lg border p-3', className)}>
      <Rows problems={shown} onGo={onGo} />
    </div>
  );
}
