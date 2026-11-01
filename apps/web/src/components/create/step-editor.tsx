import { numberedMove } from '@knightschool/core';
import { ChevronLeft, ChevronRight, FileText, Plus, RotateCcw, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Board, type BoardPosition } from '@/components/board/board';
import { IDEA_KINDS, IdeaBadge, type Idea } from '@/components/chess/idea-badge';
import { MoveRun, type RunMove } from '@/components/chess/move-run';
import { RichText } from '@/components/chess/rich-text';
import { EmptyState } from '@/components/shared/empty-state';
import { Hint } from '@/components/shared/hint';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MarksEditor, type MarkSet } from './marks-editor';
import { ProblemsList, type Problem } from './problems-list';

export type StepMove = RunMove & { before: string };

/** A step over a line: its stretch is the plies `first` to `last` (inclusive), indexes into the line's moves. */
export type Step = {
  id: string;
  name?: string;
  text?: string;
  first: number;
  last: number;
  /** The position the Read stage shows, as an index into the stretch's positions (0 is before its first move). */
  keyIndex?: number;
  keyMarks?: MarkSet;
  ideas?: string[];
};

export type StageName = 'read' | 'watch' | 'try' | 'mistakes' | 'done';
const STAGE_NAME: Record<StageName, string> = {
  read: 'Read',
  watch: 'Watch',
  try: 'Try',
  mistakes: 'Their mistakes',
  done: 'Done',
};

export type StepEditorProps = {
  variationName: string;
  /** The line the steps cut, every move. */
  moves: StepMove[];
  side: 'white' | 'black';
  steps: Step[];
  /** The automatic cut (about four of your moves each), the default every handle can return to. */
  auto: { first: number; last: number }[];
  /** Every change saves as one undoable action ("rename step 3", "move the end of step 2 to 6.c3"). */
  onChange: (steps: Step[], label: string) => void;
  ideas: Idea[];
  /** Ideas written on the stretch's moves, offered as suggestions. */
  suggestedIdeas?: (step: Step) => string[];
  /** What feeds each stage ("2 refutations in this stretch"), or null when it has nothing to show and is skipped. */
  stageFeeds: (step: Step) => Record<StageName, string | null>;
  /** The puzzle picker for the chosen step. */
  puzzles?: (step: Step) => ReactNode;
  problems?: Problem[];
};

const isMine = (ply: number, side: 'white' | 'black') => (ply % 2 === 0) === (side === 'white');

/**
 * A step's name, its text and which moves it covers, on top of the automatic cut. A step left alone keeps its
 * automatic stretch and a plain name; naming it and writing two to four sentences makes it a taught step
 * (docs/v2/components/step-editor.md).
 */
export function StepEditor({
  variationName,
  moves,
  side,
  steps,
  auto,
  onChange,
  ideas,
  suggestedIdeas,
  stageFeeds,
  puzzles,
  problems = [],
}: StepEditorProps) {
  const [chosen, setChosen] = useState(0);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const step = steps[chosen]!;
  const n = chosen + 1;

  const replace = (next: Step, label: string, others: Record<number, Step> = {}) => {
    onChange(
      steps.map((s, i) => (i === chosen ? next : (others[i] ?? s))),
      label,
    );
  };

  /** Moves one end of the chosen step by one move pair; the neighbour grows or shrinks to match. */
  const moveEnd = (end: 'first' | 'last', by: -2 | 2) => {
    setRefusal(null);
    const value = Math.max(0, Math.min(moves.length - 1, step[end] + by));
    if (value === step[end]) return;
    const next = { ...step, [end]: value, keyIndex: undefined };
    if (next.first > next.last) return setRefusal(`Step ${n} would have no moves left.`);
    const neighbourIndex = end === 'first' ? chosen - 1 : chosen + 1;
    const neighbour = steps[neighbourIndex];
    if (!neighbour) {
      const lost = end === 'first' ? moves[0]! : moves[moves.length - 1]!;
      const lostPly = end === 'first' ? 0 : moves.length - 1;
      return setRefusal(`That would leave ${numberedMove(lostPly, lost.san)} in no step.`);
    }
    const grown = end === 'first' ? { ...neighbour, last: value - 1 } : { ...neighbour, first: value + 1 };
    if (grown.first > grown.last) return setRefusal(`Step ${neighbourIndex + 1} would have no moves left.`);
    const at = moves[value]!;
    replace(next, `move the ${end === 'first' ? 'start' : 'end'} of step ${n} to ${numberedMove(value, at.san)}`, {
      [neighbourIndex]: grown,
    });
  };

  const resetStretch = () => {
    const cut = auto[chosen];
    if (!cut) return;
    setRefusal(null);
    const others: Record<number, Step> = {};
    if (steps[chosen - 1]) others[chosen - 1] = { ...steps[chosen - 1]!, last: cut.first - 1 };
    if (steps[chosen + 1]) others[chosen + 1] = { ...steps[chosen + 1]!, first: cut.last + 1 };
    replace({ ...step, first: cut.first, last: cut.last, keyIndex: undefined }, `reset step ${n} to automatic`, others);
  };

  const stretch = moves.slice(step.first, step.last + 1);
  const positions: BoardPosition[] = [
    { epd: stretch[0]!.before },
    ...stretch.map((move) => ({
      epd: move.after,
      lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) },
    })),
  ];
  const keyIndex = step.keyIndex ?? positions.length - 1;
  const automatic = auto[chosen]?.first === step.first && auto[chosen]?.last === step.last;
  const feeds = stageFeeds(step);
  const suggested = (suggestedIdeas?.(step) ?? []).filter((id) => !(step.ideas ?? []).includes(id));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <nav aria-label={`Steps of ${variationName}`} className="grid content-start gap-1">
        <h3 className="mb-1 text-sm font-medium text-muted-foreground">{variationName}</h3>
        {steps.map((s, i) => {
          const custom = auto[i]?.first !== s.first || auto[i]?.last !== s.last;
          return (
            <Button
              key={s.id}
              variant="ghost"
              aria-current={i === chosen ? 'step' : undefined}
              className={cn(
                'h-auto w-full flex-col items-start gap-1 px-3 py-2 text-left whitespace-normal',
                i === chosen && 'bg-muted',
              )}
              onClick={() => {
                setChosen(i);
                setRefusal(null);
              }}
            >
              <span className="flex w-full items-center gap-2">
                <span className="font-medium">{s.name ? `${i + 1}. ${s.name}` : `Step ${i + 1}, automatic`}</span>
                {s.text ? <FileText aria-label="Has text" className="ml-auto size-3.5 text-muted-foreground" /> : null}
                {custom ? (
                  <Badge variant="outline" className="text-[0.65rem] font-normal">
                    moved
                  </Badge>
                ) : null}
              </span>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {moves.slice(s.first, s.last + 1).map((move, j) => {
                  const ply = s.first + j;
                  const text = j === 0 || ply % 2 === 0 ? numberedMove(ply, move.san) : move.san;
                  return (
                    <span key={ply} className={cn(isMine(ply, side) && 'font-semibold text-foreground')}>
                      {j > 0 ? ' ' : ''}
                      {text}
                    </span>
                  );
                })}
              </span>
            </Button>
          );
        })}
      </nav>

      <div className="grid content-start gap-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Step {n}</h3>
          <ProblemsList problems={problems} ids={[step.id]} compact />
        </header>

        <div className="grid gap-1.5">
          <Label htmlFor="step-name">Name</Label>
          <Input
            key={`name-${step.id}`}
            id="step-name"
            defaultValue={step.name ?? ''}
            placeholder={`Step ${n}: in plain words, such as “Castle, then strike in the centre”`}
            onBlur={(event) => {
              const name = event.target.value.trim() || undefined;
              if (name !== step.name) replace({ ...step, name }, `rename step ${n}`);
            }}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="step-text">Text</Label>
            <Textarea
              key={`text-${step.id}`}
              id="step-text"
              rows={5}
              defaultValue={step.text ?? ''}
              placeholder="Two to four sentences: what the moves are for. Write moves as 4.c3 or 5...d6."
              onBlur={(event) => {
                const text = event.target.value.trim() || undefined;
                if (text !== step.text) replace({ ...step, text }, `edit the text of step ${n}`);
              }}
            />
          </div>
          <section
            className="grid content-start gap-1.5 rounded-lg bg-muted/50 p-3 text-sm"
            aria-label="Read stage preview"
          >
            <p className="text-xs text-muted-foreground">As the Read stage shows it</p>
            <p className="font-medium">{step.name ?? `Step ${n}`}</p>
            {step.text ? (
              <RichText
                text={step.text}
                side={side}
                ideas={Object.fromEntries(ideas.map((idea) => [idea.id, idea]))}
                context={{ startEpd: stretch[0]!.before, firstPly: step.first, moves: stretch }}
              />
            ) : (
              <p className="text-muted-foreground">No text: learners go straight to Watch.</p>
            )}
          </section>
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Stretch</Label>
            <Button variant="ghost" size="sm" disabled={automatic} onClick={resetStretch}>
              <RotateCcw aria-hidden /> {automatic ? 'Automatic' : 'Reset to automatic'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
            <div className="flex" role="group" aria-label="Where the step starts">
              <Hint text="Start a move earlier">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Start a move earlier"
                  onClick={() => moveEnd('first', -2)}
                >
                  <ChevronLeft aria-hidden />
                </Button>
              </Hint>
              <Hint text="Start a move later">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Start a move later"
                  onClick={() => moveEnd('first', 2)}
                >
                  <ChevronRight aria-hidden />
                </Button>
              </Hint>
            </div>
            <span className="min-w-0 flex-1 border-x px-2">
              <MoveRun moves={stretch} firstPly={step.first} side={side} />
            </span>
            <div className="flex" role="group" aria-label="Where the step ends">
              <Hint text="End a move earlier">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="End a move earlier"
                  onClick={() => moveEnd('last', -2)}
                >
                  <ChevronLeft aria-hidden />
                </Button>
              </Hint>
              <Hint text="End a move later">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="End a move later"
                  onClick={() => moveEnd('last', 2)}
                >
                  <ChevronRight aria-hidden />
                </Button>
              </Hint>
            </div>
          </div>
          {refusal ? (
            <p role="alert" className="text-sm text-destructive">
              {refusal}
            </p>
          ) : null}
        </div>

        <div className="grid max-w-md gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Key position</Label>
            <div className="flex items-center gap-2">
              <Switch id="step-draw" checked={drawing} onCheckedChange={setDrawing} />
              <Label htmlFor="step-draw" className="font-normal">
                Draw marks on it
              </Label>
            </div>
          </div>
          {drawing ? (
            <MarksEditor
              epd={positions[keyIndex]!.epd}
              lastMove={positions[keyIndex]!.lastMove}
              moveName={`step ${n}`}
              marks={step.keyMarks ?? { arrows: [], circles: [] }}
              onChange={(keyMarks, label) => replace({ ...step, keyMarks }, label)}
              orientation={side}
              tapToDraw
            />
          ) : (
            <Board
              key={`key-${step.id}-${step.first}-${step.last}`}
              positions={positions.map((position, i) =>
                i === keyIndex ? { ...position, marks: step.keyMarks } : position,
              )}
              index={keyIndex}
              onIndex={(index) => replace({ ...step, keyIndex: index }, `pick the key position of step ${n}`)}
              orientation={side}
              flippable={false}
              caption={<span className="text-muted-foreground">Step to the position the Read stage shows.</span>}
            />
          )}
        </div>

        <div className="grid gap-1.5">
          <Label>Ideas</Label>
          <div className="flex flex-wrap gap-1">
            {(step.ideas ?? []).map((id) => {
              const idea = ideas.find((option) => option.id === id);
              return (
                <span key={id} className="inline-flex items-center">
                  <IdeaBadge idea={idea} name={idea ? undefined : id} />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${idea?.name ?? id}`}
                    onClick={() =>
                      replace(
                        { ...step, ideas: (step.ideas ?? []).filter((x) => x !== id) },
                        `edit the ideas of step ${n}`,
                      )
                    }
                  >
                    <X aria-hidden />
                  </Button>
                </span>
              );
            })}
            {suggested.map((id) => {
              const idea = ideas.find((option) => option.id === id);
              const Icon = idea ? IDEA_KINDS[idea.kind].icon : null;
              return (
                <Hint key={id} text={`Suggested from its moves. ${idea?.summary ?? ''}`}>
                  <Button
                    variant="outline"
                    size="xs"
                    className="border-dashed"
                    aria-label={`Add ${idea?.name ?? id}`}
                    onClick={() =>
                      replace({ ...step, ideas: [...(step.ideas ?? []), id] }, `edit the ideas of step ${n}`)
                    }
                  >
                    <Plus aria-hidden />
                    {Icon ? <Icon aria-hidden /> : null} {idea?.name ?? id}
                  </Button>
                </Hint>
              );
            })}
            {(step.ideas ?? []).length === 0 && suggested.length === 0 ? (
              <EmptyState kind="new" size="part" text="No ideas on these moves yet." />
            ) : null}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Stages</Label>
          <ol className="grid gap-1 text-sm">
            {(Object.keys(STAGE_NAME) as StageName[]).map((stage) => (
              <li key={stage} className={cn('flex gap-2', !feeds[stage] && 'text-muted-foreground')}>
                <span className={cn('w-28 shrink-0', feeds[stage] && 'font-medium')}>{STAGE_NAME[stage]}</span>
                <span>{feeds[stage] ?? 'Nothing to show: skipped for learners.'}</span>
              </li>
            ))}
          </ol>
        </div>

        {puzzles ? (
          <div className="grid gap-1.5">
            <Label>Puzzles</Label>
            {puzzles(step)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
