import { courseUnits, lineOrderOf, type CourseUnit } from '@knightschool/core';
import { KIND_LABEL, kindLabel } from '@/components/tags/hints';
import { ArrowDown, ArrowUp, GripVertical, ListChecks, Route, Swords } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { entryId, unitSummary } from './helpers';
import { fullLine, useAuthor, type DraftCourse } from './store';

/** One row of the path: a line (on the path or a bonus), or a trap to spring or a quiz shown with a unit. */
type Row =
  | { type: 'line'; id: string; bonus: boolean }
  | { type: 'extra'; id: string; extra: 'trap' | 'quiz'; label: string; unit: CourseUnit | undefined; natural: number };

/**
 * The course's Path tab in Create: one list, in study order. Lines are dragged by their handle or moved with the
 * arrows; each trap to spring and each quiz sits with the unit it is shown with, and can be moved later (never before
 * the unit that first reaches it). The Bonus switch on a line makes it shown but not drilled. Every change saves as one
 * undoable action.
 */
export function PathOrder({ course }: { course: DraftCourse }) {
  const build = useAuthor((state) => state.build);
  const content = build?.courses.find((candidate) => candidate.opening.id === course.id);
  const units = useMemo(() => (content ? courseUnits(content) : []), [content]);
  // Where each trap and quiz would be shown by itself, for "never before" and for the default.
  const naturalUnits = useMemo(
    () =>
      content
        ? courseUnits({
            ...content,
            opening: {
              ...content.opening,
              units: { order: [], after: {}, drop: {}, ...content.opening.units, place: {} },
            },
          })
        : [],
    [content],
  );
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  const ids = course.manifest.lines.map(entryId);
  const variant = (id: string) => content?.opening.variants.find((candidate) => candidate.id === id);
  const title = (id: string) => variant(id)?.name ?? build?.tree.lines.get(id)?.game.tags.Variation ?? id;
  const kindOf = (id: string) => {
    const found = variant(id);
    return found?.whose ?? found?.weight ?? build?.tree.lines.get(id)?.game.tags.Kind ?? 'sideline';
  };
  const springs = (id: string) => kindOf(id) === 'for-us';
  const isAlternative = (id: string) => {
    const entry = course.manifest.lines.find((candidate) => entryId(candidate) === id);
    return typeof entry !== 'string' && Boolean(entry?.alternative);
  };
  const unitLabel = (unit: CourseUnit) => `${title(unit.line)} ${unit.n}`;
  const indexOf = (unitId: string | undefined) => units.findIndex((unit) => unit.id === unitId);
  const holderOf = (list: CourseUnit[], item: string) =>
    list.find((unit) => unit.traps.includes(item) || unit.quizzes.includes(item));

  // The rows: each line on the path, then the bonus lines that branch from it, then the traps and quizzes shown with
  // its units; anything left over at the end.
  const path = lineOrderOf(
    units,
    ids.filter((id) => !springs(id) && !isAlternative(id)),
  );
  const bonus = ids.filter((id) => springs(id) || isAlternative(id));
  const alternatives = bonus.filter((id) => !springs(id));
  const extras: Row[] = [
    ...bonus.filter(springs).map((id) => ({ id, extra: 'trap' as const, label: title(id) })),
    ...(content?.quizzes ?? []).map((quiz) => ({ id: quiz.id, extra: 'quiz' as const, label: quiz.prompt })),
  ]
    .map((item) => {
      const unit = holderOf(units, item.id);
      return {
        type: 'extra' as const,
        ...item,
        unit,
        natural: Math.max(0, indexOf(holderOf(naturalUnits, item.id)?.id)),
      };
    })
    .sort((a, b) => indexOf(a.unit?.id) - indexOf(b.unit?.id));
  const rows: Row[] = [];
  const placed = new Set<string>();
  for (const id of path) {
    rows.push({ type: 'line', id, bonus: false });
    for (const other of alternatives)
      if (!placed.has(other) && fullLine(build, other)?.parents.at(-1) === id) {
        rows.push({ type: 'line', id: other, bonus: true });
        placed.add(other);
      }
    for (const extra of extras)
      if (extra.type === 'extra' && extra.unit?.line === id && !placed.has(`x:${extra.id}`)) {
        rows.push(extra);
        placed.add(`x:${extra.id}`);
      }
  }
  for (const other of alternatives) if (!placed.has(other)) rows.push({ type: 'line', id: other, bonus: true });
  for (const extra of extras) if (!placed.has(`x:${extra.id}`)) rows.push(extra);

  const report = (problem: string | null) => setError(problem);
  const setPath = (nextPath: string[], nextBonus: string[]) =>
    void useAuthor.getState().setPath(nextPath, nextBonus).then(report);
  const place = (row: Extract<Row, { type: 'extra' }>, target: number) => {
    const allowed = Math.max(target, row.natural);
    if (allowed !== target)
      setNote(
        `${row.extra === 'trap' ? 'A trap' : 'A question'} cannot come before ${unitLabel(units[row.natural]!)}, the first unit to reach it, so it stays there.`,
      );
    else setNote(null);
    const unit = units[Math.min(allowed, units.length - 1)];
    if (unit && unit.id !== row.unit?.id) void useAuthor.getState().placeExtra(row.id, unit.id).then(report);
  };

  /** A row dropped at `to`: a line moves among the path's lines; a trap or quiz goes with the line above it. */
  const drop = (from: number, to: number) => {
    const row = rows[from];
    if (!row || from === to) return;
    const next = [...rows];
    next.splice(from, 1);
    next.splice(to, 0, row);
    if (row.type === 'line') {
      setPath(
        next.flatMap((candidate) => (candidate.type === 'line' && !candidate.bonus ? [candidate.id] : [])),
        bonus,
      );
      return;
    }
    // The nearest path line above: shown with its first unit that is not before the natural one.
    const above = next
      .slice(0, to)
      .reverse()
      .find((candidate) => candidate.type === 'line' && !candidate.bonus);
    const lineUnits = above ? units.filter((unit) => unit.line === above.id) : [];
    const target = lineUnits.find((unit) => unit.index >= row.natural)?.index ?? lineUnits[0]?.index ?? 0;
    place(row, target);
  };

  const moveLine = (id: string, step: number) => {
    const at = path.indexOf(id);
    const to = at + step;
    if (to < 0 || to >= path.length) return;
    const next = [...path];
    next.splice(at, 1);
    next.splice(to, 0, id);
    setPath(next, bonus);
  };

  return (
    <section className="grid max-w-4xl gap-3" aria-labelledby="path-heading">
      <div className="grid gap-1">
        <h3 id="path-heading" className="font-semibold">
          Path
        </h3>
        <p className="text-sm text-muted-foreground">
          The course in study order. Drag a row by its handle or use the arrows. A branch still waits for the line it
          grows from, and a trap or question never comes before the unit that first reaches it. Bonus rows are shown
          while studying but never needed to pass.
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {note && (
        <Alert role="status">
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lines yet.</p>
      ) : (
        <ol className="grid gap-1.5" aria-label="The path in study order">
          {rows.map((row, i) => {
            const bonusRow = row.type === 'extra' || row.bonus;
            const movable = row.type === 'extra' || !row.bonus;
            const lineAt = row.type === 'line' ? path.indexOf(row.id) : -1;
            const unitAt = row.type === 'extra' ? indexOf(row.unit?.id) : -1;
            const Icon = row.type === 'line' ? Route : row.extra === 'trap' ? Swords : ListChecks;
            const name = row.type === 'line' ? title(row.id) : row.label;
            return (
              <li
                key={`${row.type}:${row.id}`}
                draggable={movable}
                onDragStart={(event) => {
                  setDragged(i);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragged !== null) drop(dragged, i);
                  setDragged(null);
                }}
                onDragEnd={() => setDragged(null)}
                className={`flex items-center gap-2 rounded-lg border p-2 ${bonusRow ? 'bg-muted/40 text-muted-foreground' : 'bg-card'} ${row.type === 'extra' ? 'ml-6' : ''} ${dragged === i ? 'opacity-50' : ''}`}
              >
                <GripVertical
                  className={`size-4 shrink-0 ${movable ? 'cursor-grab text-muted-foreground' : 'invisible'}`}
                  aria-hidden
                />
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="grid min-w-0 flex-1">
                  <span className={`truncate ${bonusRow ? '' : 'font-medium text-foreground'}`}>{name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.type === 'line'
                      ? `${row.bonus ? `Alternative, shown not drilled (${kindLabel(kindOf(row.id))})` : kindLabel(kindOf(row.id))}${variant(row.id)?.opponent ? `, after ${variant(row.id)!.opponent}` : ''}`
                      : `${row.extra === 'trap' ? KIND_LABEL['for-us'] : 'Question'}${row.unit ? `, with ${unitLabel(row.unit)}` : ''}`}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={row.type === 'line' ? !movable || lineAt <= 0 : unitAt <= row.natural}
                  onClick={() =>
                    row.type === 'line' ? moveLine(row.id, -1) : place(row, Math.max(row.natural, unitAt - 1))
                  }
                  aria-label={`Move ${name} earlier`}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={row.type === 'line' ? !movable || lineAt >= path.length - 1 : unitAt >= units.length - 1}
                  onClick={() => (row.type === 'line' ? moveLine(row.id, 1) : place(row, unitAt + 1))}
                  aria-label={`Move ${name} later`}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <BonusSwitch
                  id={`bonus-${row.type}-${row.id}`}
                  checked={bonusRow}
                  fixed={row.type === 'extra'}
                  reason={
                    row.type === 'extra'
                      ? row.extra === 'trap'
                        ? 'A trap to spring is always a bonus: the opponent has to go wrong first, so it earns no move card.'
                        : 'A question is always a bonus: it is answered in words, not with a move.'
                      : undefined
                  }
                  onChange={(on) => {
                    if (row.type !== 'line') return;
                    if (on)
                      setPath(
                        path.filter((line) => line !== row.id),
                        [...bonus, row.id],
                      );
                    else
                      setPath(
                        [...path, row.id],
                        bonus.filter((line) => line !== row.id),
                      );
                  }}
                />
              </li>
            );
          })}
        </ol>
      )}
      {units.length > 0 && <p className="text-sm text-muted-foreground">{unitSummary(units, title)}.</p>}
      {Boolean(
        course.manifest.units &&
        (Object.keys(course.manifest.units.after).length || Object.keys(course.manifest.units.drop).length),
      ) && (
        <p className="text-xs text-muted-foreground">
          This course also has custom prerequisites (after or drop in its units: block). They are kept, and the order
          follows them.
        </p>
      )}
    </section>
  );
}

/** The Bonus switch of a row; fixed on (with the reason on hover) for what is always a bonus. */
function BonusSwitch({
  id,
  checked,
  fixed,
  reason,
  onChange,
}: {
  id: string;
  checked: boolean;
  fixed: boolean;
  reason?: string;
  onChange: (on: boolean) => void;
}) {
  const control = (
    <span className="flex items-center gap-1.5">
      <Switch id={id} checked={checked} disabled={fixed} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-xs">
        Bonus
      </Label>
    </span>
  );
  if (!reason) return control;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{control}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{reason}</TooltipContent>
    </Tooltip>
  );
}
