import { courseUnits, lineOrderOf } from '@knightschool/core';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  GitBranch,
  GripVertical,
  ListChecks,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { entryId, unitSummary } from './helpers';
import { useAuthor, type DraftCourse } from './store';

const KIND: Record<string, string> = {
  main: 'Main line',
  gambit: 'Gambit',
  sideline: 'Sideline',
  rare: 'Rare',
  'against-us': 'Trap to avoid',
  'for-us': 'Trap to spring',
};

/**
 * The course's Path tab in the editor: the drilled lines in the order to study them (drag a row by its handle, or use
 * the arrows), and beside it the bonus: lines shown but not needed to pass, and the course's quizzes. Each change saves
 * as one undoable action; the units follow the order as far as what they wait for allows.
 */
export function PathOrder({ course }: { course: DraftCourse }) {
  const build = useAuthor((state) => state.build);
  const content = build?.courses.find((candidate) => candidate.opening.id === course.id);
  const units = useMemo(() => (content ? courseUnits(content) : []), [content]);
  const [error, setError] = useState<string | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  const ids = course.manifest.lines.map(entryId);
  const variant = (id: string) => content?.opening.variants.find((candidate) => candidate.id === id);
  const title = (id: string) => variant(id)?.name ?? build?.tree.lines.get(id)?.game.tags.Variation ?? id;
  const kindOf = (id: string) => {
    const found = variant(id);
    return found?.whose ?? found?.weight ?? build?.tree.lines.get(id)?.game.tags.Kind ?? 'sideline';
  };
  const isBonus = (id: string) => {
    const entry = course.manifest.lines.find((candidate) => entryId(candidate) === id);
    return kindOf(id) === 'for-us' || (typeof entry !== 'string' && Boolean(entry?.alternative));
  };
  const path = lineOrderOf(
    units,
    ids.filter((id) => !isBonus(id)),
  );
  const bonus = ids.filter(isBonus);
  // Traps to spring and quizzes belong with the unit they leave from (`attachSupplementary`); alternatives stand apart.
  const springs = bonus.filter((id) => kindOf(id) === 'for-us');
  const alternatives = bonus.filter((id) => kindOf(id) !== 'for-us');
  const attached = units
    .map((unit) => ({
      unit,
      traps: unit.traps.filter((trap) => springs.includes(trap)),
      quizzes: (content?.quizzes ?? []).filter((quiz) => unit.quizzes.includes(quiz.id)),
    }))
    .filter((group) => group.traps.length > 0 || group.quizzes.length > 0);
  const loose = springs.filter((id) => !units.some((unit) => unit.traps.includes(id)));
  const custom = course.manifest.units;
  const hasCustom = Boolean(custom && (Object.keys(custom.after).length || Object.keys(custom.drop).length));

  const apply = (nextPath: string[], nextBonus: string[]) =>
    void useAuthor.getState().setPath(nextPath, nextBonus).then(setError);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= path.length || from === to) return;
    const next = [...path];
    const [line] = next.splice(from, 1);
    next.splice(to, 0, line!);
    apply(next, bonus);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
      <section className="grid gap-3" aria-labelledby="path-heading">
        <div className="grid gap-1">
          <h3 id="path-heading" className="font-semibold">
            Path
          </h3>
          <p className="text-sm text-muted-foreground">
            The lines to study, first to last. Drag a line by its handle or use the arrows. A branch still waits for the
            line it grows from.
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {path.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lines to drill yet.</p>
        ) : (
          <ol className="grid gap-1.5" aria-label="Lines in study order">
            {path.map((id, i) => (
              <li
                key={id}
                draggable
                onDragStart={(event) => {
                  setDragged(i);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragged !== null) move(dragged, i);
                  setDragged(null);
                }}
                onDragEnd={() => setDragged(null)}
                className={`flex items-center gap-2 rounded-lg border bg-card p-2 ${dragged === i ? 'opacity-50' : ''}`}
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                <span className="w-5 text-right text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{title(id)}</span>
                  <span className="text-xs text-muted-foreground">
                    {KIND[kindOf(id)] ?? kindOf(id)}
                    {variant(id)?.opponent ? `, after ${variant(id)!.opponent}` : ''}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label={`Move ${title(id)} earlier`}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={i === path.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label={`Move ${title(id)} later`}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={kindOf(id) === 'against-us'}
                  title={
                    kindOf(id) === 'against-us'
                      ? 'A trap to avoid stays on the path: its avoiding move is drilled.'
                      : 'Show it as a bonus: shown, not needed to pass'
                  }
                  onClick={() =>
                    apply(
                      path.filter((line) => line !== id),
                      [...bonus, id],
                    )
                  }
                >
                  To bonus <ArrowRight aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
        )}
        {units.length > 0 && <p className="text-sm text-muted-foreground">{unitSummary(units, title)}.</p>}
        {hasCustom && (
          <p className="text-xs text-muted-foreground">
            This course also has custom prerequisites (after or drop in its units: block). They are kept, and the order
            follows them.
          </p>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="bonus-heading">
        <div className="grid gap-1">
          <h3 id="bonus-heading" className="font-semibold">
            Bonus
          </h3>
          <p className="text-sm text-muted-foreground">Shown while studying, never needed to pass.</p>
        </div>
        {alternatives.length === 0 && attached.length === 0 && loose.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        )}
        {attached.map(({ unit, traps, quizzes }) => (
          <div key={unit.id} className="grid gap-1">
            <h4 className="text-xs font-medium text-muted-foreground">
              With {title(unit.line)} {unit.n}
            </h4>
            <ul className="grid gap-1">
              {traps.map((id) => (
                <BonusItem key={id} icon={Swords} label={title(id)} note="Trap to spring" />
              ))}
              {quizzes.map((quiz) => (
                <BonusItem key={quiz.id} icon={ListChecks} label={quiz.prompt} note="Question" />
              ))}
            </ul>
          </div>
        ))}
        {loose.length > 0 && (
          <div className="grid gap-1">
            <h4 className="text-xs font-medium text-muted-foreground">Not with any unit yet</h4>
            <ul className="grid gap-1">
              {loose.map((id) => (
                <BonusItem key={id} icon={Swords} label={title(id)} note="Trap to spring" />
              ))}
            </ul>
          </div>
        )}
        {alternatives.length > 0 && (
          <div className="grid gap-1">
            <h4 className="text-xs font-medium text-muted-foreground">Alternatives: shown, not drilled</h4>
            <ul className="grid gap-1">
              {alternatives.map((id) => (
                <BonusItem key={id} icon={GitBranch} label={title(id)} note={KIND[kindOf(id)] ?? kindOf(id)}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      apply(
                        [...path, id],
                        bonus.filter((line) => line !== id),
                      )
                    }
                  >
                    <ArrowLeft aria-hidden /> To path
                  </Button>
                </BonusItem>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/** One bonus item: what it is, and what kind. */
function BonusItem({
  icon: Icon,
  label,
  note,
  children,
}: {
  icon: LucideIcon;
  label: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="grid min-w-0 flex-1">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
      {children}
    </li>
  );
}
