import { MOVES_PER_QUESTION, type MovesPerQuestion, SPEED_DEPTHS, type SpeedDepth } from '@knightschool/core';
import { Library, Play, Settings2, Telescope, Timer } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterToggle } from '@/components/filter-toggle';
import { useCatalog } from '@/data/catalog-store';
import {
  describeConfig,
  DUE,
  movesText,
  NAME_IT_POSITIONS,
  type NameItConfig,
  type PracticeConfigs,
  type PracticeMode,
  type QuizConfig,
  rushCourse,
  secondsText,
  type SpeedConfig,
  SPEED_LINES,
  SPEED_SECONDS,
} from '@/data/practice-config';

/** What each mode's set-up card says about itself. */
const MODES: Record<PracticeMode, { title: string; icon: ReactNode; blurb: string; from: string }> = {
  quiz: {
    title: 'Set up the quiz',
    icon: <Library aria-hidden />,
    blurb: 'The moves your schedule says are due, or free practice from any course.',
    from: 'Questions from',
  },
  'name-it': {
    title: 'Set up Name That Opening',
    icon: <Telescope aria-hidden />,
    blurb: 'A position comes up and you say where it came from. Naming only the opening earns half a point.',
    from: 'Positions from',
  },
  speed: {
    title: 'Set up a speed run',
    icon: <Timer aria-hidden />,
    blurb:
      'Play lines you know from memory against the clock. The other side answers the instant you move; a wrong move or a hint is counted and the clock keeps running.',
    from: 'Lines from',
  },
};

/** One labelled choice in the card. */
function Field({ label, children, note }: { label: string; children: (id: string) => ReactNode; note?: string }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} id={`${id}-label`}>
        {label}
      </Label>
      {children(id)}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}

/** A row of joined buttons, one of them chosen. */
function Choice<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <FilterToggle
      id={id}
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      className="flex-wrap justify-self-start"
    />
  );
}

/**
 * The one set-up for Quiz, Name it and Speed: a card inside the page, before the first question and whenever "Change"
 * is pressed. It edits a copy: nothing is saved and no session restarts until Start (Cancel leaves the session as it
 * was). `only` limits it to some fields (a line's quiz has only the moves per question).
 */
export function PracticeSetup<M extends PracticeMode>({
  mode,
  initial,
  onStart,
  onCancel,
  startLabel = 'Start',
  only,
  title,
}: {
  mode: M;
  initial: PracticeConfigs[M];
  onStart: (config: PracticeConfigs[M]) => void;
  onCancel?: () => void;
  startLabel?: string;
  only?: readonly string[];
  title?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const index = useCatalog((state) => state.index);
  const about = MODES[mode];
  // Each field belongs to one mode or to all, so a change only ever names fields of this mode.
  const set = (change: Partial<QuizConfig & NameItConfig & SpeedConfig>) =>
    setDraft((current) => ({ ...current, ...change }));
  const shows = (field: string) => !only || only.includes(field);
  // An opening rush is started from a course's Path tab: it stays a choice here while the card is open.
  const rush = mode === 'speed' ? rushCourse(initial.source) : undefined;
  const extra = [
    ...(mode === 'quiz' ? [{ value: DUE, label: 'Due today (your schedule)' }] : []),
    ...(rush
      ? [
          {
            value: initial.source,
            label: `Opening rush: the units of ${index.find((course) => course.id === rush)?.name ?? rush} you have passed`,
          },
        ]
      : []),
  ];

  return (
    <Card aria-label={title ?? about.title}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {about.icon} {title ?? about.title}
        </CardTitle>
        {!only && <CardDescription>{about.blurb}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-5">
        {shows('source') && (
          <Field label={about.from}>
            {(id) => (
              <Select value={draft.source} onValueChange={(source) => set({ source })}>
                <SelectTrigger id={id} className="w-full sm:w-96">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {extra.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                  {extra.length > 0 && <SelectSeparator />}
                  <SelectItem value="learning">The courses I am learning</SelectItem>
                  <SelectItem value="all">Everything</SelectItem>
                  {index.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
        )}
        {shows('weighting') && draft.source !== DUE && (
          <Field
            label="How they are picked"
            note={
              draft.weighting === 'popular'
                ? 'Each is as likely as the share of games that reach it, so what you meet most comes up most.'
                : undefined
            }
          >
            {(id) => (
              <Choice
                id={id}
                label="How they are picked"
                value={draft.weighting}
                options={[
                  { value: 'random', label: 'At random' },
                  { value: 'popular', label: 'Favour popular' },
                ]}
                onChange={(weighting) => set({ weighting })}
              />
            )}
          </Field>
        )}
        {mode === 'quiz' && shows('moves') && (
          <Field label="Each question runs for">
            {(id) => (
              <Select
                value={String((draft as QuizConfig).moves)}
                onValueChange={(value) => set({ moves: Number(value) as MovesPerQuestion })}
              >
                <SelectTrigger id={id} className="w-full sm:w-64" aria-label="Moves per question">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVES_PER_QUESTION.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {movesText(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
        )}
        {mode === 'quiz' && shows('source') && draft.source !== DUE && (
          <p className="text-sm text-muted-foreground">Free practice: nothing here changes your schedule.</p>
        )}
        {mode === 'name-it' && shows('positions') && (
          <Field label="How many positions">
            {(id) => (
              <Choice
                id={id}
                label="How many positions"
                value={(draft as NameItConfig).positions}
                options={NAME_IT_POSITIONS.map((n) => ({ value: n, label: String(n) }))}
                onChange={(positions) => set({ positions })}
              />
            )}
          </Field>
        )}
        {mode === 'speed' && <SpeedFields draft={draft as SpeedConfig} set={set} />}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button size="lg" onClick={() => onStart(draft)}>
          <Play aria-hidden /> {startLabel}
        </Button>
        {onCancel && (
          <Button size="lg" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function SpeedFields({ draft, set }: { draft: SpeedConfig; set: (change: Partial<SpeedConfig>) => void }) {
  return (
    <>
      <Field
        label="What kind of run"
        note={
          draft.run === 'lines'
            ? 'Play each line through to the end. You get your average time per move.'
            : 'Lines keep coming until the time is up. How many moves can you make?'
        }
      >
        {(id) => (
          <Choice
            id={id}
            label="What kind of run"
            value={draft.run}
            options={[
              { value: 'lines', label: 'A set of lines' },
              { value: 'timed', label: 'Against the clock' },
            ]}
            onChange={(run) => set({ run })}
          />
        )}
      </Field>
      {draft.run === 'lines' ? (
        <Field label="How many lines">
          {(id) => (
            <Choice
              id={id}
              label="How many lines"
              value={draft.lines}
              options={SPEED_LINES.map((n) => ({ value: n, label: `${n} lines` }))}
              onChange={(lines) => set({ lines })}
            />
          )}
        </Field>
      ) : (
        <Field label="How long">
          {(id) => (
            <Choice
              id={id}
              label="How long"
              value={draft.seconds}
              options={SPEED_SECONDS.map((n) => ({ value: n, label: secondsText(n) }))}
              onChange={(seconds) => set({ seconds })}
            />
          )}
        </Field>
      )}
      {rushCourse(draft.source) ? (
        <p className="text-sm text-muted-foreground">
          An opening rush plays each passed unit from the first move to its end.
        </p>
      ) : (
        <Field label="How deep: up to move">
          {(id) => (
            <Choice
              id={id}
              label="How deep each line goes"
              value={draft.depth}
              options={SPEED_DEPTHS.map((depth: SpeedDepth) => ({
                value: depth,
                label: depth === 0 ? 'Whole line' : String(depth),
              }))}
              onChange={(depth) => set({ depth })}
            />
          )}
        </Field>
      )}
    </>
  );
}

/**
 * The set-up during a session: one line saying how it was set up, and "Change", which opens the same card in its
 * place. The session carries on underneath until Start begins a new one.
 */
export function PracticeBar<M extends PracticeMode>({
  mode,
  config,
  onStart,
  only,
  summary,
  title,
}: {
  mode: M;
  config: PracticeConfigs[M];
  onStart: (config: PracticeConfigs[M]) => void;
  only?: readonly string[];
  /** The card's title, when not the mode's own. */
  title?: string;
  /** Replaces the usual one-line description. */
  summary?: string;
}) {
  const [editing, setEditing] = useState(false);
  const index = useCatalog((state) => state.index);
  if (editing) {
    return (
      <PracticeSetup
        mode={mode}
        initial={config}
        only={only}
        title={title}
        startLabel="Start again"
        onCancel={() => setEditing(false)}
        onStart={(next) => {
          setEditing(false);
          onStart(next);
        }}
      />
    );
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="min-w-0">{summary ?? describeConfig(mode, config, index)}</span>
      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setEditing(true)}>
        <Settings2 aria-hidden /> Change
      </Button>
    </div>
  );
}
