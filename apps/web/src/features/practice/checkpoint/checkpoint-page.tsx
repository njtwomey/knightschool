import {
  branchExercise,
  checkpointCleared,
  checkpointPlan,
  checkpointRef,
  drillBranches,
  drillScope,
  finalTestRef,
  opponentMistakes,
  shuffled,
  sideToMove,
  type Exercise,
} from '@knightschool/core';
import type { BuiltOpening, BuiltQuestion } from '@knightschool/core/content';
import { ArrowRight, BookOpen, Flag, Play, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Try } from '@/components/chess/tries-table';
import { StepRow } from '@/components/openings/step-row';
import { DEFAULT_CONFIG } from '@/components/practice/practice-config';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ShippedPuzzle } from '@/data/content';
import { getSetting } from '@/data/settings';
import { siteConfig } from '@/data/site-config';
import { finalTestHref, openingHref, stepHref, variationViews } from '@/features/learn/views';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { ExerciseBoard } from '../exercise-board';
import { playOnStarts, startExercise } from '../play-on/play-on-data';
import { loadProgress, puzzlesOf, type LearnerProgress, type OpeningProgress } from '../progress';
import { puzzleExercise } from '../puzzles/puzzle-data';
import { askedOf, type QuestionAnswer } from '../questions/asked';
import { QuestionRun } from '../questions/question-run';
import { openTry } from '../try-position';
import { useExerciseSession, type ExerciseResult } from '../use-exercise-session';
import { BookPrompt } from '../book-prompt';
import { openingTabs } from '@/features/learn/opening-frame';

const percent = (share: number) => `${Math.round(share * 100)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const KNOWN = ['known', 'mastered'];

/**
 * The checkpoint page (docs/v2/pages/checkpoint.md). `variation` given: a variation's checkpoint, a mixed test of its
 * steps (positions, the opponent's mistakes to punish, a puzzle, a question). Left out: the opening's final test, every
 * branch of the opening, puzzles and a Play on. One try each and no help; cleared at `teach.checkpointMark` with no
 * blunders. The result is an attempt (mode `checkpoint`, ref `checkpoint:<opening>:<variation>` or `test:<opening>`);
 * clearing it makes the steps it covers known, tested out or not (`testedOutSteps`).
 */
export function CheckpointPage({ opening, variation }: { opening: string; variation?: string }) {
  const data = useLoad(async () => {
    const progress = await loadProgress(undefined, opening);
    return { progress, puzzles: await puzzlesOf(opening).catch((): ShippedPuzzle[] => []) };
  }, [opening, variation]);
  const one = data.data?.progress.openings.find((candidate) => candidate.opening.id === opening);
  const name = variation ? (one?.opening.variations.find((v) => v.id === variation)?.name ?? variation) : undefined;
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs
        root={{ label: 'Openings', href: to('/openings') }}
        crumbs={[
          { label: one?.opening.name ?? opening, href: openingHref(opening) },
          ...(name ? [{ label: name }, { label: 'Checkpoint' }] : [{ label: 'Final test' }]),
        ]}
        tabs={openingTabs(opening)}
      />
      {data.error ? (
        <p className="text-destructive">{data.error}</p>
      ) : !data.data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !one || (variation && !one.opening.variations.some((v) => v.id === variation)) ? (
        <EmptyState
          kind="no-match"
          size="page"
          text={variation ? 'There is no such variation.' : 'There is no such opening.'}
          action={{ label: 'All openings', href: to('/openings') }}
        />
      ) : (
        <CheckpointView
          progress={data.data.progress}
          puzzles={data.data.puzzles}
          one={one}
          {...(variation ? { variation } : {})}
          name={name ?? one.opening.name}
        />
      )}
    </main>
  );
}

/** What one sitting asks: the board's exercises, then the typed questions; and the steps a miss sends back to. */
type Test = {
  exercises: Exercise[];
  questions: BuiltQuestion[];
  /** "6 positions, 2 of Black's mistakes, a question and a puzzle". */
  parts: string[];
  ref: string;
};

/** The puzzles that fit: the learner's side solving, on these lines, strongest match first, unseen first. */
function fittingPuzzles(
  puzzles: readonly ShippedPuzzle[],
  lines: readonly string[] | undefined,
  have: ReadonlySet<string>,
  random: () => number,
): ShippedPuzzle[] {
  const levels = siteConfig.puzzles.levels as readonly string[];
  const [low, high] = getSetting('puzzles.rating');
  const fit = puzzles.filter(
    (puzzle) => puzzle.mine !== false && (!lines || (puzzle.line && lines.includes(puzzle.line))),
  );
  const rank = (puzzle: ShippedPuzzle) =>
    (have.has(`puzzle:${puzzle.id}`) ? 1000 : 0) +
    levels.indexOf(puzzle.level) * 10 +
    (puzzle.rating < low || puzzle.rating > high ? 5 : 0);
  return shuffled(fit, random).sort((a, b) => rank(a) - rank(b));
}

/** The opponent's mistakes on a set of lines, at every position where the opponent moves. */
function mistakesOn(one: OpeningProgress, variation?: string) {
  const positions = new Set<string>();
  for (const line of one.opening.lines) {
    if (line.alternative || (variation && line.variation !== variation)) continue;
    let epd = one.opening.startEpd;
    for (let ply = one.opening.startPly; ply < line.moves.length; ply++) {
      if (sideToMove(epd) !== one.opening.side) positions.add(epd);
      const next = one.opening.positions[epd]?.moves.find((move) => move.uci === line.moves[ply]);
      if (!next) break;
      epd = next.to;
    }
  }
  return opponentMistakes(one.opening, [...positions], one.facts, {
    ...siteConfig.judge,
    ...siteConfig.coverage,
  });
}

function partWords(
  counts: { positions: number; mistakes: number; questions: number; puzzles: number },
  opponent: string,
) {
  return [
    counts.positions ? plural(counts.positions, 'position') : '',
    counts.mistakes
      ? `${counts.mistakes} of ${opponent}'s ${counts.mistakes === 1 ? 'mistake' : 'mistakes'} to punish`
      : '',
    counts.questions ? (counts.questions === 1 ? 'a question' : `${counts.questions} questions`) : '',
    counts.puzzles ? (counts.puzzles === 1 ? 'a puzzle' : `${counts.puzzles} puzzles`) : '',
  ].filter(Boolean);
}

/** A variation's checkpoint, drawn afresh for each sitting. */
function variationTest(
  one: OpeningProgress,
  variation: string,
  puzzles: readonly ShippedPuzzle[],
  have: Set<string>,
): Test {
  const random = Math.random;
  const tries = siteConfig.teach.checkpointTries;
  const lines = one.opening.variations.find((v) => v.id === variation)?.lines;
  const plan = checkpointPlan(one.opening, variation, {
    random,
    tries,
    mix: siteConfig.teach.checkpointMix,
    mistakes: mistakesOn(one, variation),
    puzzles: fittingPuzzles(puzzles, lines, have, random).map(puzzleExercise),
  });
  return {
    exercises: plan.exercises,
    questions: plan.questions,
    parts: partWords(plan.counts, one.opening.side === 'white' ? 'Black' : 'White'),
    ref: checkpointRef(one.opening.id, variation),
  };
}

/**
 * The opening's final test (docs/v2/pages/checkpoint.md): every branch of the opening as a drill would play it, the
 * band's way, then puzzles from the opening and a Play on from a line's end (config `teach.finalTest`).
 */
function finalTest(one: OpeningProgress, puzzles: readonly ShippedPuzzle[], have: Set<string>): Test {
  const random = Math.random;
  const tries = siteConfig.teach.checkpointTries;
  const scope = drillScope(one.opening);
  const branches = drillBranches(one.opening, scope, one.facts?.counts).map((branch) => ({
    ...branchExercise(one.opening, scope, branch, {
      id: `test:${one.opening.id}:${branch.moves.join('-')}`,
      tries,
      help: false,
    }),
    mode: 'checkpoint' as const,
  }));
  const picked = fittingPuzzles(puzzles, undefined, have, random)
    .slice(0, siteConfig.teach.finalTest.puzzles)
    .map((puzzle) => ({
      ...puzzleExercise(puzzle),
      mode: 'checkpoint' as const,
      tries,
      help: false,
      record: 'none' as const,
    }));
  const playOn = playOnStarts(one.opening, one.facts, have, { leave: false, random })
    .slice(0, siteConfig.teach.finalTest.playOn)
    .map((start) => ({
      ...startExercise(one.opening, start, {
        ...DEFAULT_CONFIG,
        playOnMoves: siteConfig.opponent.playOnMoves,
        playOnTolerance: siteConfig.opponent.playOnTolerance,
      }),
      // Numbered as the game numbers them: the moves that reach it are the line's.
      startPly: start.moves.length,
      tries,
      record: 'none' as const,
    }));
  return {
    exercises: [...branches, ...shuffled([...picked, ...playOn], random)],
    questions: [],
    parts: [
      plural(branches.length, 'branch', 'branches'),
      picked.length ? plural(picked.length, 'puzzle') : '',
      playOn.length ? `${playOn.length === 1 ? 'a' : playOn.length} Play on` : '',
    ].filter(Boolean),
    ref: finalTestRef(one.opening.id),
  };
}

function CheckpointView({
  progress,
  puzzles,
  one,
  variation,
  name,
}: {
  progress: LearnerProgress;
  puzzles: ShippedPuzzle[];
  one: OpeningProgress;
  variation?: string;
  name: string;
}) {
  const [run, setRun] = useState(0);
  const have = useMemo(() => new Set(progress.cards.map((card) => card.id)), [progress]);
  const test = useMemo(
    () => (variation ? variationTest(one, variation, puzzles, have) : finalTest(one, puzzles, have)),
    // A fresh draw for each sitting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [one, variation, puzzles, have, run],
  );
  const steps = one.opening.steps
    .map((step, i) => ({ step, n: i + 1 }))
    .filter(({ step }) => !variation || step.variation === variation);
  const unknown = steps.filter(({ step }) => !KNOWN.includes(one.stepStates.get(step.id) ?? ''));
  const gated = siteConfig.teach.gates && !getSetting('learning.gatesRelaxed');
  const locked = unknown.length > 0;
  const info = variation ? one.checkpoints.find((c) => c.variation === variation) : undefined;
  const cleared = variation
    ? info?.state === 'cleared'
    : progress.attempts.some((a) => a.ref === finalTestRef(one.opening.id) && a.result === 'right');
  const total = test.exercises.length + test.questions.length;

  if (!total) {
    return (
      <EmptyState
        kind="not-covered"
        size="page"
        text={`The ${name} has nothing of yours to test: its lines are alternatives, shown rather than drilled.`}
        action={{ label: `Back to the ${one.opening.name}`, href: openingHref(one.opening.id) }}
      />
    );
  }
  if (run > 0) {
    return (
      <CheckpointRun
        key={run}
        progress={progress}
        one={one}
        test={test}
        {...(variation ? { variation } : {})}
        name={name}
        onAgain={() => setRun((n) => n + 1)}
      />
    );
  }
  const numbers = unknown.map(({ n }) => n);
  const stepsWord = numbers.length === 1 ? `Step ${numbers[0]} is` : `Steps ${numbers.join(', ')} are`;
  const what = variation ? `the ${name} checkpoint` : `the ${name} final test`;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="size-5 text-mode-learn" aria-hidden />
          {variation ? `The ${name} checkpoint` : `The ${name}: final test`}
        </CardTitle>
        <CardDescription>
          {plural(total, 'exercise')} {variation ? `from the ${name}` : 'over the whole opening'}:{' '}
          {test.parts.join(', ').replace(/, ([^,]*)$/, ' and $1')}. Each with{' '}
          {siteConfig.teach.checkpointTries === 1 ? 'one try' : `${siteConfig.teach.checkpointTries} tries`} and no
          help. Clear it with {percent(siteConfig.teach.checkpointMark)} right and no blunders.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {cleared ? <p>Cleared before{info?.score ? `, ${info.score}` : ''}. Take it again any time.</p> : null}
        {locked && !cleared ? (
          <p className="text-muted-foreground">
            {stepsWord} not known yet.
            {siteConfig.teach.testOut
              ? ` Clear ${what} and ${variation ? "the variation's" : "the opening's"} steps count as known.`
              : ''}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {locked && !cleared && gated ? (
          siteConfig.teach.testOut ? (
            <Button onClick={() => setRun(1)}>
              <Play aria-hidden /> Test out
            </Button>
          ) : (
            <Button asChild variant="outline">
              <a href={stepHref(one.opening.id, numbers[0]!)}>
                <BookOpen aria-hidden /> Learn step {numbers[0]}
              </a>
            </Button>
          )
        ) : (
          <Button onClick={() => setRun(1)}>
            <Play aria-hidden /> Start
          </Button>
        )}
        {locked && !gated ? (
          <Button asChild variant="ghost">
            <a href={stepHref(one.opening.id, numbers[0]!)}>
              <BookOpen aria-hidden /> Learn step {numbers[0]} first
            </a>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

/** One answer of the sitting, a board exercise or a question, as the result and the log keep it. */
type Answered = { id: string; right: boolean; ms: number; shown: boolean };

function CheckpointRun({
  progress,
  one,
  test,
  variation,
  name,
  onAgain,
}: {
  progress: LearnerProgress;
  one: OpeningProgress;
  test: Test;
  variation?: string;
  name: string;
  onAgain: () => void;
}) {
  const [board, setBoard] = useState<{ results: ExerciseResult[]; tries: Try[] } | null>(
    test.exercises.length ? null : { results: [], tries: [] },
  );
  const [answers, setAnswers] = useState<QuestionAnswer[] | null>(test.questions.length ? null : []);
  const total = test.exercises.length + test.questions.length;
  const started = useRef(new Date());
  const recorded = useRef(false);
  const all = useMemo<Answered[] | null>(
    () =>
      board && answers
        ? [
            ...board.results.map((r) => ({ id: r.id, right: r.right, ms: r.ms, shown: r.shown })),
            ...answers.map((a) => ({ id: a.cardId, right: a.matched, ms: a.ms, shown: !a.typed })),
          ]
        : null,
    [board, answers],
  );
  const blunders = board ? board.tries.filter((t) => t.grade === 'blunder').length : 0;
  useEffect(() => {
    if (!all || recorded.current) return;
    recorded.current = true;
    void record(progress, test.ref, all, blunders, started.current);
  }, [all, blunders, progress, test.ref]);

  if (!board) {
    return <BoardPart one={one} exercises={test.exercises} total={total} onDone={setBoard} />;
  }
  if (!answers) {
    return (
      <QuestionRun
        asked={test.questions.map((question) => askedOf(one.opening, question))}
        mode="step"
        save
        logMode="checkpoint"
        progress={{ done: test.exercises.length, total }}
        aside={<p className="text-sm text-muted-foreground">One answer, no help. The explanation follows.</p>}
        onDone={setAnswers}
      />
    );
  }
  return (
    <CheckpointResult
      one={one}
      {...(variation ? { variation } : {})}
      name={name}
      answers={all!}
      blunders={blunders}
      tries={board.tries}
      onAgain={onAgain}
    />
  );
}

function BoardPart({
  one,
  exercises,
  total,
  onDone,
}: {
  one: OpeningProgress;
  exercises: Exercise[];
  total: number;
  onDone: (part: { results: ExerciseResult[]; tries: Try[] }) => void;
}) {
  const session = useExerciseSession({ exercises, opening: one.opening, facts: one.facts, save: 'moves' });
  const finished = useRef(false);
  useEffect(() => {
    if (!session.done || finished.current) return;
    finished.current = true;
    onDone({ results: session.results, tries: session.tries });
  }, [session.done, session.results, session.tries, onDone]);
  const current = session.exercise;
  const kind = !current
    ? ''
    : current.id.startsWith('puzzle:')
      ? 'A puzzle from a game that went through this opening.'
      : current.id.startsWith('mistake:')
        ? `${current.side === 'white' ? 'Black' : 'White'} has just made a mistake: punish it.`
        : current.mode === 'play-on'
          ? 'Play on from the end of a line and keep your advantage.'
          : '';
  // A position or a branch asks for the opening's own move, named by the line it is from.
  const book =
    current && !kind ? (
      <BookPrompt
        opening={one.opening}
        epd={session.epd}
        branch={current.responder.kind === 'scripted' && current.responder.script.length > 1}
      />
    ) : undefined;
  return (
    <ExerciseBoard
      session={session}
      prompt={book}
      aside={
        <div className="grid gap-1 text-sm">
          <p className="font-medium">
            {Math.min(session.index + 1, session.total)} of {total}
          </p>
          <p className="text-muted-foreground">{kind ? `${kind} ` : ''}One try, no help; feedback still says why.</p>
        </div>
      }
    />
  );
}

/** The sitting in the attempts log: one try per exercise (what was asked, its time, whether it was found). */
async function record(
  progress: LearnerProgress,
  ref: string,
  answers: readonly Answered[],
  blunders: number,
  started: Date,
) {
  const cleared = checkpointCleared(answers, siteConfig.teach.checkpointMark, blunders);
  const now = new Date();
  await progress.store.attempts.add({
    id: crypto.randomUUID(),
    at: now.toISOString(),
    session: crypto.randomUUID(),
    mode: 'checkpoint',
    ref,
    result: cleared ? 'right' : 'wrong',
    tries: answers.map((answer) => ({ uci: answer.id, ms: answer.ms, outcome: answer.right ? 'right' : 'wrong' })),
    ms: now.getTime() - started.getTime(),
    hint: false,
    shown: answers.some((answer) => answer.shown),
  });
}

function CheckpointResult({
  one,
  variation,
  name,
  answers,
  blunders,
  tries,
  onAgain,
}: {
  one: OpeningProgress;
  variation?: string;
  name: string;
  answers: Answered[];
  blunders: number;
  tries: Try[];
  onAgain: () => void;
}) {
  const cleared = checkpointCleared(answers, siteConfig.teach.checkpointMark, blunders);
  const right = answers.filter((a) => a.right).length;
  const opening = one.opening;
  const missed = useMemo(() => missedSteps(opening, one, answers, tries), [opening, one, answers, tries]);
  const rows = useMemo(() => {
    const info = new Map(
      opening.steps.map((step) => [
        step.id,
        {
          state: one.stepStates.get(step.id) ?? 'open',
          counts: one.stepCounts.get(step.id) ?? { mine: 0, known: 0, inReviews: 0 },
        },
      ]),
    );
    return variationViews(opening, info)
      .flatMap((v) => v.steps)
      .filter((row) => missed.has(row.id));
  }, [opening, one, missed]);
  const index = variation ? opening.variations.findIndex((v) => v.id === variation) : -1;
  const nextVariation = variation ? opening.variations[index + 1] : undefined;
  const nextStep = nextVariation ? opening.steps.findIndex((step) => step.variation === nextVariation.id) : -1;
  const what = variation ? `The ${name} checkpoint` : `The ${name} final test`;
  return (
    <div className="grid gap-4">
      <SessionSummary
        mode="step"
        headline={
          cleared
            ? `${what} is cleared: ${right} of ${answers.length}`
            : `Not cleared yet: ${right} of ${answers.length}`
        }
        sentence={
          cleared
            ? variation
              ? `The ${name} counts as known, and so do its steps.`
              : `The ${name} is complete: every step counts as known.`
            : `${percent(siteConfig.teach.checkpointMark)} right with no blunders clears it${blunders ? `; ${plural(blunders, 'move was a blunder', 'moves were blunders')}` : ''}. Nothing is lost: go over the steps below and try again.`
        }
        figures={[
          { value: `${right}/${answers.length}`, label: 'found first time' },
          { value: percent(answers.length ? right / answers.length : 0), label: 'right' },
          { value: String(blunders), label: blunders === 1 ? 'blunder' : 'blunders' },
        ]}
        tries={tries}
        onSelectTry={openTry(tries)}
      />
      {rows.length ? (
        <section className="grid gap-2" aria-labelledby="revisit">
          <h2 id="revisit" className="text-sm font-medium">
            Steps to go over
          </h2>
          <div className="grid gap-2">
            {rows.map((row) => (
              <StepRow key={row.id} step={row} compact href={stepHref(opening.id, row.number)} />
            ))}
          </div>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {cleared && nextVariation && nextStep >= 0 ? (
          <Button asChild>
            <a href={stepHref(opening.id, nextStep + 1)}>
              Start the {nextVariation.name ?? nextVariation.id} <ArrowRight aria-hidden />
            </a>
          </Button>
        ) : cleared && variation && !nextVariation ? (
          <Button asChild>
            <a href={finalTestHref(opening.id)}>
              Take the final test <ArrowRight aria-hidden />
            </a>
          </Button>
        ) : null}
        <Button variant={cleared ? 'outline' : 'default'} onClick={onAgain}>
          <RotateCcw aria-hidden /> Try again
        </Button>
        <Button asChild variant="ghost">
          <a href={openingHref(opening.id)}>Back to the {opening.name}</a>
        </Button>
      </div>
    </div>
  );
}

/** The steps that teach what was missed: a position's card, a move missed in a branch, a question's variation. */
function missedSteps(
  opening: BuiltOpening,
  one: OpeningProgress,
  answers: readonly Answered[],
  tries: readonly Try[],
): Set<string> {
  const stepOf = new Map(one.cards.map((card) => [card.id, card.step]));
  const out = new Set<string>();
  // A move missed inside a branch: the step teaching the opening's move in that position.
  for (const one_try of tries) {
    if (one_try.grade === 'book' || !one_try.before) continue;
    const card = one.cards.find((candidate) => candidate.epd === one_try.before);
    if (card) out.add(card.step);
  }
  for (const answer of answers) {
    if (answer.right) continue;
    const step = stepOf.get(answer.id);
    if (step) {
      out.add(step);
      continue;
    }
    if (answer.id.startsWith('quiz:')) {
      const id = answer.id.split(':').at(-1);
      const variation = opening.questions?.find((q) => q.id === id)?.variation;
      const first = opening.steps.find((s) => s.variation === variation);
      if (first) out.add(first.id);
    }
  }
  return out;
}
