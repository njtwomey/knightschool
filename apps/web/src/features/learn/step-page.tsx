import { numberedMove, playMove, stepTestOutRef, type Exercise } from '@knightschool/core';
import type { BuiltStep } from '@knightschool/core/content';
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, Flag, RotateCcw, Target } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '@/components/board/board';
import { BoardColumns } from '@/components/shared/board-columns';
import { IdeaBadge } from '@/components/chess/idea-badge';
import { MoveChip } from '@/components/chess/move-chip';
import { MoveTable } from '@/components/chess/move-table';
import { RichText } from '@/components/chess/rich-text';
import type { Try as TryRow } from '@/components/chess/tries-table';
import { StepRow } from '@/components/openings/step-row';
import { stepTitle } from '@/components/openings/steps';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { PuzzleCard } from '@/components/practice/puzzle-card';
import { SessionSummary } from '@/components/practice/session-summary';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoardNotes, type NotesMove } from '@/components/board/board-notes';
import { learnerStore } from '@/data/learner';
import { feedbackDelay } from '@/data/settings';
import { siteConfig } from '@/data/site-config';
import { ExerciseBoard } from '@/features/practice/exercise-board';
import { loadProgress } from '@/features/practice/progress';
import { useExerciseSession } from '@/features/practice/use-exercise-session';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { bakedScore, cardStates, stepMoves, type LineMove } from './model';
import { openingIdeas, openingVariations, topPuzzles, useStepActions, type OpeningData } from './opening-data';
import { OpeningCrumbs, OpeningFrame } from './opening-frame';
import { rememberStage } from './stage-memory';
import { useGates } from './use-learn';
import { checkpointHref, openingHref, stepHref, variationHref } from './views';

type Stage = 'read' | 'watch' | 'try' | 'done';
const STAGE_LABEL: Record<Stage, string> = { read: 'Read', watch: 'Watch', try: 'Try', done: 'Done' };

/** The stages a step runs through, in order (config `teach.stages`). */
const STAGES = siteConfig.teach.stages.filter((stage): stage is Stage => stage in STAGE_LABEL);

/** The step page's address state: `#stage=<stage>&m=<moves played or stepped>`, and `test=1` while testing out. */
type HashState = { stage: Stage; m: number; test: boolean };

function readHash(): HashState {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const stage = params.get('stage') as Stage | null;
  return {
    stage: stage && STAGES.includes(stage) ? stage : (STAGES[0] ?? 'read'),
    m: Math.max(0, Number(params.get('m')) || 0),
    test: params.get('test') === '1',
  };
}

function writeHash(state: HashState) {
  const params = new URLSearchParams({ stage: state.stage });
  if (state.m) params.set('m', String(state.m));
  if (state.test) params.set('test', '1');
  window.history.replaceState(null, '', `#${params.toString()}`);
}

const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
const sideName = (side: 'white' | 'black') => (side === 'white' ? 'White' : 'Black');

/**
 * Learning one step's main line through its stages (docs/v2/pages/step.md): Read, Watch, Try, Done. The opponent's
 * mistakes come after, as the step's follow-ups.
 * `range` plays only the learner's moves a to b of it.
 */
export function StepPage({ id, n, range }: { id: string; n: number; range?: [number, number] }) {
  return (
    <OpeningFrame id={id}>
      {(data) => {
        const step = data.one.opening.steps[n - 1];
        if (!step) {
          return (
            <main className="mx-auto max-w-7xl px-4 py-8">
              <Notice
                kind="problem"
                text={`The ${data.one.opening.name} has no step ${n}.`}
                action={
                  <Button asChild size="sm" variant="outline">
                    <a href={openingHref(id)}>Back to the opening</a>
                  </Button>
                }
              />
            </main>
          );
        }
        return <StepView key={`${step.id}:${range?.join('-') ?? ''}`} data={data} step={step} n={n} range={range} />;
      }}
    </OpeningFrame>
  );
}

/** The step's moves, from the lead-in opponent move to its last learner move, or only learner moves a to b of it. */
function stretchOf(data: OpeningData, step: BuiltStep, range?: [number, number]): LineMove[] {
  const { moves } = stepMoves(data.one.opening, step);
  if (!range) return moves;
  const mine = moves.map((move, i) => (move.mine ? i : -1)).filter((i) => i >= 0);
  const first = mine[Math.max(0, range[0] - 1)];
  const last = mine[Math.min(mine.length, range[1]) - 1];
  if (first === undefined || last === undefined || last < first) return moves;
  return moves.slice(first > 0 && !moves[first - 1]!.mine ? first - 1 : first, last + 1);
}

function StepView({
  data,
  step,
  n,
  range,
}: {
  data: OpeningData;
  step: BuiltStep;
  n: number;
  range?: [number, number];
}) {
  const { one, progress } = data;
  const opening = one.opening;
  const gates = useGates(opening.id);
  const [hash, setHashState] = useState<HashState>(readHash);
  const setHash = (next: Partial<HashState>) =>
    setHashState((current) => {
      const merged = { ...current, ...next };
      writeHash(merged);
      return merged;
    });
  // A finished Try's guesses, kept for Done's record.
  const [record, setRecord] = useState<{ tries: TryRow[]; testedOut?: boolean }>({ tries: [] });
  const [run, setRun] = useState(0);
  // Remember where the learner is, so the step's row continues here.
  useEffect(() => {
    if (!range) rememberStage(opening.id, step.id, hash.stage);
  }, [opening.id, step.id, hash.stage, range]);
  const moves = useMemo(() => stretchOf(data, step, range), [data, step, range]);
  const variation = opening.variations.find((v) => v.id === step.variation);
  const steps = opening.steps.map((s, i) => ({ step: s, n: i + 1 })).filter((s) => s.step.variation === step.variation);
  const state = one.stepStates.get(step.id);
  // The author's title, or a headline from the step's first move ("When 6...Bg4 is played").
  const title = useMemo(() => {
    const row = openingVariations(data)
      .flatMap((v) => v.steps)
      .find((candidate) => candidate.id === step.id);
    return row ? stepTitle(row) : `Step ${n}`;
  }, [data, step, n]);
  const nextAfter = (stage: Stage): Stage => STAGES[STAGES.indexOf(stage) + 1] ?? 'done';
  const stageIndex = STAGES.indexOf(hash.stage);

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <OpeningCrumbs
        catalog={progress.catalog}
        opening={opening}
        crumbs={[
          { label: variation?.name ?? step.variation, href: variationHref(opening.id, step.variation) },
          {
            label: `Step ${n}`,
            siblings: {
              current: step.id,
              label: 'Steps',
              items: steps.map((s) => ({
                id: s.step.id,
                label: `Step ${s.n}${s.step.title ? `: ${s.step.title}` : ''}`,
                href: stepHref(opening.id, s.n),
              })),
            },
          },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Step {n}: {title}
            {range ? <span className="text-muted-foreground"> (moves {range.join(' to ')})</span> : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {opening.name}, {variation?.name ?? step.variation}
          </p>
        </div>
        <Tabs value={hash.stage} onValueChange={(value) => setHash({ stage: value as Stage, m: 0 })}>
          <TabsList aria-label="Stages">
            {STAGES.map((stage, i) => (
              <TabsTrigger key={stage} value={stage}>
                {i < stageIndex ? <Check aria-hidden className="text-state-known" /> : null}
                {STAGE_LABEL[stage]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {state === 'locked' && gates && !hash.test ? (
        <Notice
          kind="reminder"
          text={`This step builds on step ${n - 1}. Earlier steps stay open to come back to.`}
          action={
            <Button asChild size="sm" variant="outline">
              <a href={stepHref(opening.id, n - 1)}>Go to step {n - 1}</a>
            </Button>
          }
        />
      ) : null}
      {hash.stage === 'read' ? (
        <ReadStage
          data={data}
          step={step}
          moves={moves}
          onWatch={() => setHash({ stage: nextAfter('read'), m: 0, test: false })}
          onTest={() => setHash({ stage: 'try', m: 0, test: true })}
        />
      ) : null}
      {hash.stage === 'watch' ? (
        <WatchStage
          data={data}
          moves={moves}
          m={hash.m}
          onStep={(m) => setHash({ m })}
          onTry={() => setHash({ stage: nextAfter('watch'), m: 0 })}
        />
      ) : null}
      {hash.stage === 'try' ? (
        <TryStage
          key={run}
          data={data}
          step={step}
          moves={moves}
          m={hash.m}
          test={hash.test}
          onPlayed={(m) => setHash({ m })}
          onDone={(tries, testedOut) => {
            setRecord({ tries, ...(testedOut !== undefined ? { testedOut } : {}) });
            setHash({ stage: hash.test ? 'done' : nextAfter('try'), m: 0 });
          }}
        />
      ) : null}
      {hash.stage === 'done' ? (
        <DoneStage
          data={data}
          step={step}
          n={n}
          moves={moves}
          steps={steps}
          record={record}
          test={hash.test}
          onAgain={() => {
            setRun((r) => r + 1);
            setHash({ stage: 'try', m: 0, test: false });
          }}
        />
      ) : null}
    </main>
  );
}

/** The ideas a stretch's moves show (`[%idea]` in their notes), as the catalogue knows them. */
function stretchIdeas(data: OpeningData, moves: readonly LineMove[]) {
  const ids = [...new Set(moves.flatMap((move) => move.note?.ideas ?? []))];
  return openingIdeas(data.progress.catalog, ids);
}

const notesOf = (move: LineMove | undefined): NotesMove | undefined =>
  move
    ? {
        ply: move.ply,
        san: move.san,
        ...(move.note?.text ? { comment: move.note.text } : {}),
        ...(move.note?.tags ? { tags: move.note.tags } : {}),
        ...(move.note ? { marks: move.note } : {}),
      }
    : undefined;

/** Read: the step's title and text, the position that matters with its marks, and its ideas. Nothing to answer. */
function ReadStage({
  data,
  step,
  moves,
  onWatch,
  onTest,
}: {
  data: OpeningData;
  step: BuiltStep;
  moves: LineMove[];
  onWatch: () => void;
  onTest: () => void;
}) {
  const { one } = data;
  const opening = one.opening;
  const ideas = stretchIdeas(data, moves);
  const start = moves[0]!;
  // The position that matters: where the step starts, with the marks of the move that leads in.
  const lead = stepMoves(opening, step).before.at(-1);
  const mine = moves.filter((move) => move.mine);
  const text =
    step.text ??
    `${mine.length} ${mine.length === 1 ? 'move' : 'moves'} of yours, from ${numberedMove(mine[0]!.ply, mine[0]!.san)}. ` +
      'Watch them with their reasons, then play them without help.';
  return (
    <BoardColumns
      board={
        <Board
          positions={[
            {
              epd: start.before,
              ...(lead ? { lastMove: squares(lead.uci), marks: lead.note } : {}),
              score: bakedScore(one.facts, start.before),
            },
          ]}
          index={0}
          reveal="study"
          orientation={opening.side}
          flippable={false}
        />
      }
    >
      <RichText
        text={text}
        context={{ startEpd: start.before, firstPly: start.ply, moves }}
        side={opening.side}
        className="max-w-prose"
      />
      {ideas.length ? (
        <div className="flex flex-wrap gap-1.5">
          {ideas.map((idea) => (
            <IdeaBadge key={idea.id} idea={idea} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onWatch}>
          <Eye aria-hidden /> Watch the moves
        </Button>
        {siteConfig.teach.testOut ? (
          <Button variant="outline" onClick={onTest}>
            <Target aria-hidden /> Test me instead
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        Test me instead goes straight to Try: get every move right first time and the step is known.
      </p>
    </BoardColumns>
  );
}

/**
 * Watch: the learner steps through the stretch with the arrow keys or the board's controls, each move's comment and
 * marks arriving with it. Playing the move on the board steps forward too, but is never needed. Nothing is saved.
 */
function WatchStage({
  data,
  moves,
  m,
  onStep,
  onTry,
}: {
  data: OpeningData;
  moves: LineMove[];
  m: number;
  onStep: (m: number) => void;
  onTry: () => void;
}) {
  const { one } = data;
  const opening = one.opening;
  const [index, setIndexState] = useState(Math.min(m, moves.length));
  const setIndex = (next: number) => {
    setIndexState(next);
    onStep(next);
  };
  const positions = useMemo(
    () => [
      { epd: moves[0]!.before, score: bakedScore(one.facts, moves[0]!.before), next: squares(moves[0]!.uci) },
      ...moves.map((move, i) => ({
        epd: move.after,
        lastMove: squares(move.uci),
        marks: move.note,
        score: bakedScore(one.facts, move.after),
        ...(moves[i + 1] ? { next: squares(moves[i + 1]!.uci) } : {}),
      })),
    ],
    [moves, one.facts],
  );
  const next = moves[index];
  // Playing the move shown by the arrow steps forward; any other move stays a moment with its cross (config
  // `timing.wrongHold`, at the learner's feedback speed), then slides back, with no penalty.
  const [held, setHeld] = useState<{ epd: string; uci: string } | null>(null);
  const holding = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(holding.current), []);
  const onMove = (from: string, to: string): boolean => {
    if (!next || held) return false;
    const played = playMove(next.before, from + to) ?? playMove(next.before, `${from}${to}q`);
    if (!played) return false;
    if (played.uci === next.uci) {
      setIndex(index + 1);
      return true;
    }
    setHeld({ epd: played.epd, uci: played.uci });
    holding.current = setTimeout(() => setHeld(null), feedbackDelay(siteConfig.timing.wrongHold));
    return true;
  };
  return (
    <BoardColumns
      board={
        <Board
          positions={held ? [{ epd: held.epd, lastMove: squares(held.uci) }] : positions}
          index={held ? 0 : index}
          onIndex={setIndex}
          reveal="learn"
          orientation={opening.side}
          flippable={false}
          interactive={Boolean(next) && !held}
          onMove={onMove}
          badge={held ? { square: held.uci.slice(2, 4), kind: 'wrong' } : undefined}
        />
      }
    >
      <BoardNotes
        move={notesOf(moves[index - 1])}
        reveal="learn"
        startText="Step forward with the right arrow key, or play the arrow's move: each move comes with why it is played."
        side={opening.side}
      />
      <MoveTable
        moves={moves.map((move) => ({ san: move.san, uci: move.uci, after: move.after }))}
        current={index - 1}
        onSelect={(i) => setIndex(i + 1)}
        side={opening.side}
        firstPly={moves[0]!.ply}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant={next ? 'outline' : 'default'} onClick={onTry}>
          <Target aria-hidden /> Try without help
        </Button>
      </div>
    </BoardColumns>
  );
}

/**
 * Try: the learner plays their side alone; the other side plays the step's replies. Every move is saved as a review.
 * Testing out records the step's test in the attempts log: passed when every move was right first time, no help.
 */
function TryStage({
  data,
  step,
  moves,
  m,
  test,
  onPlayed,
  onDone,
}: {
  data: OpeningData;
  step: BuiltStep;
  moves: LineMove[];
  m: number;
  test: boolean;
  onPlayed: (m: number) => void;
  onDone: (tries: TryRow[], testedOut?: boolean) => void;
}) {
  const { one } = data;
  const opening = one.opening;
  // Carry on from the moves already played (the hash's `m`), unless testing out, which runs the whole stretch.
  // Read once: the hash's `m` follows the moves played from here on.
  const [offset] = useState(() => (test ? 0 : Math.min(m, moves.length - 1)));
  const exercises = useMemo<Exercise[]>(
    () => [
      {
        id: step.id,
        mode: 'try',
        start: moves[offset]!.before,
        startPly: moves[offset]!.ply,
        side: opening.side,
        grader: { kind: 'exact' },
        responder: { kind: 'scripted', script: moves.slice(offset).map((move) => move.uci) },
      },
    ],
    [opening, step, moves, offset],
  );
  const session = useExerciseSession({ exercises, opening, facts: one.facts, save: 'moves' });
  const finished = useRef(false);
  const played = session.played.length;
  useEffect(() => {
    if (!session.done) onPlayed(offset + played);
    // Only when a move is played.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [played]);
  useEffect(() => {
    if (!session.done || finished.current) return;
    finished.current = true;
    const result = session.results[0];
    if (!test) {
      onDone(session.tries);
      return;
    }
    const passed = Boolean(result && result.right && !result.hint && !result.shown);
    void learnerStore()
      .then((store) =>
        store.attempts.add({
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          session: crypto.randomUUID(),
          mode: 'try',
          ref: stepTestOutRef(opening.id, step.id),
          result: passed ? 'right' : result?.shown ? 'shown' : 'wrong',
          tries: result?.attempt.tries ?? [],
          ms: result?.ms ?? 0,
          hint: Boolean(result?.hint),
          shown: Boolean(result?.shown),
        }),
      )
      .finally(() => onDone(session.tries, passed));
  }, [session.done, session.results, session.tries, test, opening, step, onDone]);

  const mine = moves.slice(offset).filter((move) => move.mine).length;
  const done = session.played.filter((move) => move.mine).length;
  return (
    <ExerciseBoard
      session={session}
      aside={
        <ExercisePanel
          mode="step"
          prompt={test ? 'Test out: every move right first time' : `Play ${sideName(opening.side)}'s moves of the step`}
          context={
            test
              ? 'No Read or Watch. Get every move right with no help and the step is known.'
              : 'The other side plays the step’s replies. A wrong move snaps back and says why.'
          }
          tries={{
            left: session.triesBeforeShown - session.attempt.tries.filter((t) => t.outcome === 'wrong').length,
            total: session.triesBeforeShown,
          }}
          help={{ hint: session.attempt.hint, shown: session.attempt.shown }}
          progress={{ done, total: mine }}
        />
      }
    />
  );
}

/**
 * Done: the tries as the record, the ideas, where the line leaves you, a few puzzles, and whether the step is known;
 * if not, which moves are not yet, with Try again. Reads the log again, so it says what the answers just did.
 */
function DoneStage({
  data,
  step,
  n,
  moves,
  steps,
  record,
  test,
  onAgain,
}: {
  data: OpeningData;
  step: BuiltStep;
  n: number;
  moves: LineMove[];
  steps: { step: BuiltStep; n: number }[];
  record: { tries: TryRow[]; testedOut?: boolean };
  test: boolean;
  onAgain: () => void;
}) {
  const opening = data.one.opening;
  // The answers of the Try just played are saved as it goes; read the log once they have landed.
  const fresh = useLoad(
    () =>
      new Promise<Awaited<ReturnType<typeof loadProgress>>>((resolve, reject) =>
        setTimeout(() => loadProgress().then(resolve, reject), siteConfig.timing.nextCard),
      ),
    [step.id, record],
  );
  const progress = fresh.data ?? data.progress;
  const one = progress.openings.find((candidate) => candidate.opening.id === opening.id) ?? data.one;
  const state = one.stepStates.get(step.id);
  const known = state === 'known' || state === 'mastered';
  const states = cardStates(progress.cards, progress.reviews);
  const notYet = moves.filter(
    (move) => move.mine && !['known', 'mastered'].includes(states.get(`move:${move.before}:${move.uci}`) ?? ''),
  );
  const ideas = stretchIdeas(data, moves);
  const last = moves.at(-1)!;
  const positions = new Set(moves.flatMap((move) => [move.before, move.after]));
  const matched = data.puzzles.filter(
    (puzzle) => (puzzle.position && positions.has(puzzle.position)) || puzzle.line === step.line,
  );
  const puzzles = topPuzzles(matched.length ? matched : data.puzzles, siteConfig.puzzles.perStep);
  const lastOfVariation = steps.at(-1)?.n === n;
  const nextStep = opening.steps[n];
  const tries = record.tries;
  // The follow-ups this step opens once known: the opponent's common mistakes in its stretch.
  const followUps = useMemo(
    () =>
      openingVariations({ ...data, progress, one }).find((v) => v.id === step.variation)?.followUps?.[step.id] ?? [],
    [data, progress, one, step],
  );
  const actions = useStepActions(opening);
  const headline = test
    ? record.testedOut
      ? `Step ${n} is known: you tested out`
      : `Not tested out yet`
    : known
      ? `Step ${n} is known`
      : `Step ${n} done: nearly there`;
  const sentence = test
    ? record.testedOut
      ? 'Every move right first time with no help. The step counts as known and opens the next one.'
      : 'Testing out needs every move right first time with no help. Learn it through the stages, or test out again.'
    : known
      ? 'Every move has been right twice running. Its moves join your reviews.'
      : `A move is known once it has been right ${siteConfig.judge.knownAfterRight} times running. Its moves are in your reviews either way.`;

  return (
    <div className="grid gap-6">
      <SessionSummary
        mode="step"
        headline={fresh.loading ? 'Saving your answers…' : headline}
        sentence={sentence}
        tries={tries}
        ideas={ideas}
        evalAfter={bakedScore(data.one.facts, last.after)}
        figures={[{ value: String(record.tries.length), label: record.tries.length === 1 ? 'try' : 'tries' }]}
      />
      {!fresh.loading && !known && notYet.length ? (
        <div className="grid gap-2">
          <h2 className="text-sm font-medium">Not known yet</h2>
          <p className="flex flex-wrap items-baseline gap-1 text-sm">
            {notYet.map((move) => (
              <MoveChip
                key={move.ply}
                ply={move.ply}
                san={move.san}
                epd={move.after}
                {...squares(move.uci)}
                mine
                orientation={opening.side}
              />
            ))}
            <span>{notYet.length === 1 ? 'needs' : 'need'} another right answer.</span>
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!known ? (
          <Button onClick={onAgain}>
            <RotateCcw aria-hidden /> Try again
          </Button>
        ) : null}
        {known && lastOfVariation ? (
          <Button asChild>
            <a href={checkpointHref(opening.id, step.variation)}>
              <Flag aria-hidden /> Take the checkpoint
            </a>
          </Button>
        ) : known && nextStep ? (
          <Button asChild>
            <a href={stepHref(opening.id, n + 1)}>
              Next step <ArrowRight aria-hidden />
            </a>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <a href={openingHref(opening.id)}>
            <ArrowLeft aria-hidden /> Back to the opening
          </a>
        </Button>
        {!known && test ? (
          <Button asChild variant="ghost">
            <a href={stepHref(opening.id, n, 'read')}>
              <BookOpen aria-hidden /> Learn it
            </a>
          </Button>
        ) : null}
      </div>
      {followUps.length ? (
        <section className="grid gap-3" aria-labelledby="step-follow-ups">
          <div className="grid gap-1">
            <h2 id="step-follow-ups" className="text-lg font-semibold">
              Follow-ups
            </h2>
            <p className="text-sm text-muted-foreground">
              {known
                ? 'Where players at your level go wrong in this stretch, and how to punish it: shown first, then tried.'
                : 'They open once the step is known: the main line first, then the mistakes to exploit.'}
            </p>
          </div>
          <div className="grid gap-2">
            {followUps.map((row) => (
              <StepRow key={row.id} step={row} testOut={false} {...actions} />
            ))}
          </div>
        </section>
      ) : null}
      {puzzles.length ? (
        <section className="grid gap-3" aria-labelledby="step-puzzles">
          <h2 id="step-puzzles" className="text-lg font-semibold">
            Puzzles from these positions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {puzzles.map((puzzle) => (
              <PuzzleCard
                key={puzzle.id}
                puzzle={puzzle}
                href={to(`/practice/puzzle/${puzzle.id}`)}
                hideThemes
                learnerSide={opening.side}
                level={siteConfig.puzzles.rating}
                from={`From a game that went through this step of your ${opening.name}`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
