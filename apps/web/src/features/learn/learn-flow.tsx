import { playMove, type Exercise } from '@knightschool/core';
import type { Note } from '@knightschool/core/content';
import { ArrowLeft, BookOpen, Check, RotateCcw, Target } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Board } from '@/components/board/board';
import { MoveChip } from '@/components/chess/move-chip';
import type { Try as TryRow } from '@/components/chess/tries-table';
import { LineStory, type LineStoryProps, type StoryMove } from '@/components/openings/line-story';
import { STAGE_NAMES } from '@/components/openings/steps';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { SessionSummary } from '@/components/practice/session-summary';
import { BoardColumns } from '@/components/shared/board-columns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { learnerStore } from '@/data/learner';
import { siteConfig } from '@/data/site-config';
import { ExerciseBoard } from '@/features/practice/exercise-board';
import { loadProgress } from '@/features/practice/progress';
import { useExerciseSession } from '@/features/practice/use-exercise-session';
import { useLoad } from '@/hooks/use-load';
import { bakedScore, cardStates, type LineMove } from './model';
import { openingIdeas, type OpeningData } from './opening-data';
import { openingHref } from './views';
import type { Stage } from './stage-memory';
import { STAGES, useLearnFlow, type FlowHash } from './use-learn-flow';

/*
 * The Learn flow (docs/v2/pages/step.md): how every line-like thing is taught, whether a step's stretch of the main
 * line, a follow-up (the opponent's mistake and its punishment) or a line from the Lines tab. One component, three
 * stages: Learn (the line story beside the board, the introduction first, stepped with the arrow keys), Try (the
 * learner plays their side alone) and Done (the record, what is known, the way on). The pages only give it the moves,
 * the introduction and their own way on.
 */

/** What a Done stage knows when it words itself and offers the way on. */
export type DoneContext = {
  /** The opening's data read again once Try's answers have landed (the page's own until then). */
  data: OpeningData;
  known: boolean;
  /** The answers are still being saved. */
  loading: boolean;
  test: boolean;
  testedOut?: boolean;
};

export type LearnFlowProps = {
  data: OpeningData;
  /** The step, follow-up or line: its id is the exercise's and where this device remembers the stage. */
  item: string;
  /** Remember the stage on this device, so the item's row continues there. */
  remember: boolean;
  crumbs: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Above the stage: a locked step's or follow-up's notice. */
  notice?: (hash: FlowHash) => ReactNode;
  /** The moves the story tells and Try asks, in order; the learner's are `mine`. */
  moves: LineMove[];
  /** The move that reached the first position, highlighted with its marks before anything is played. */
  lead?: { uci: string; note?: Note };
  /** What the story says before the moves. */
  intro: ReactNode;
  /** The story's other parts: where a line branches off, where it ends, what grows from it. */
  story?: Pick<LineStoryProps, 'start' | 'end' | 'grows'>;
  /** Which refutations fold under the moves: all, only at the learner's moves (a step's), or none. */
  refutations?: 'all' | 'mine' | 'none';
  /** Try's prompt and the words under it; `save` is whether the learner's moves become cards. */
  practice: { prompt: string; context: ReactNode; save: 'moves' | 'none' };
  /** Test out (a step): "Test me instead" in the introduction, and the attempt's ref in the log. */
  testOut?: { ref: string };
  /** Done: whether it is known, its words, its way on, and anything after. */
  done: {
    known: (data: OpeningData) => boolean;
    words: (context: DoneContext) => { headline: string; sentence: string };
    actions?: (context: DoneContext) => ReactNode;
    after?: (context: DoneContext) => ReactNode;
  };
  /** Under every stage: the steps that teach a line. */
  footer?: ReactNode;
};

const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

export function LearnFlow(props: LearnFlowProps) {
  const { data, item, remember, crumbs, title, subtitle, notice, testOut, footer } = props;
  const opening = data.one.opening;
  const { hash, setHash, nextAfter, version } = useLearnFlow({ opening: opening.id, item, remember });
  // A finished Try's guesses, kept for Done's record.
  const [record, setRecord] = useState<{ tries: TryRow[]; testedOut?: boolean }>({ tries: [] });
  const [run, setRun] = useState(0);
  const stageIndex = STAGES.indexOf(hash.stage);

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      {crumbs}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Tabs value={hash.stage} onValueChange={(value) => setHash({ stage: value as Stage, m: 0, test: false })}>
          <TabsList aria-label="Stages">
            {STAGES.map((stage, i) => (
              <TabsTrigger key={stage} value={stage}>
                {i < stageIndex ? <Check aria-hidden className="text-state-known" /> : null}
                {STAGE_NAMES[stage]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {notice?.(hash)}
      {hash.stage === 'learn' ? (
        <LearnStage
          key={version}
          {...props}
          m={hash.m}
          onStep={(m) => setHash({ m })}
          onTry={() => setHash({ stage: nextAfter('learn'), m: 0, test: false })}
          onTest={testOut ? () => setHash({ stage: 'try', m: 0, test: true }) : undefined}
        />
      ) : null}
      {hash.stage === 'try' ? (
        <TryStage
          key={`${run}:${version}`}
          {...props}
          m={hash.m}
          test={hash.test && Boolean(testOut)}
          onPlayed={(m) => setHash({ m })}
          onDone={(tries, testedOut) => {
            setRecord({ tries, ...(testedOut !== undefined ? { testedOut } : {}) });
            setHash({ stage: hash.test ? 'done' : nextAfter('try'), m: 0 });
          }}
        />
      ) : null}
      {hash.stage === 'done' ? (
        <DoneStage
          {...props}
          record={record}
          test={hash.test && Boolean(testOut)}
          onAgain={() => {
            setRun((r) => r + 1);
            setHash({ stage: 'try', m: 0, test: false });
          }}
          onLearn={() => setHash({ stage: 'learn', m: 0, test: false })}
        />
      ) : null}
      {footer}
    </main>
  );
}

/** The ideas the moves show (`[%idea]` in their notes), as the catalogue knows them. */
function movesIdeas(data: OpeningData, moves: readonly LineMove[]) {
  return openingIdeas(data.progress.catalog, [...new Set(moves.flatMap((move) => move.note?.ideas ?? []))]);
}

/** The moves as the story tells them: each note with its ideas and symbols, and the refutation folded under it. */
function storyOf(
  data: OpeningData,
  moves: readonly LineMove[],
  refutations: NonNullable<LearnFlowProps['refutations']>,
): StoryMove[] {
  const opening = data.one.opening;
  const ideas = movesIdeas(data, moves);
  return moves.map((move, i) => {
    // A wrong move the author wrote where the next move is played (a `?` variation) folds under this one: it is the
    // tempting alternative from the position this move leaves, and what punishes it.
    const next = moves[i + 1];
    const refutation =
      next && (refutations === 'all' || (refutations === 'mine' && next.mine))
        ? opening.positions[next.before]?.refutations?.[0]
        : undefined;
    let epd = move.after;
    const refMoves = refutation
      ? [{ uci: refutation.uci }, ...refutation.then].flatMap((m) => {
          const played = playMove(epd, m.uci);
          if (!played) return [];
          epd = played.epd;
          return [{ san: played.san, uci: played.uci, after: played.epd }];
        })
      : [];
    return {
      san: move.san,
      uci: move.uci,
      after: move.after,
      ...(move.note
        ? {
            note: {
              ...(move.note.text ? { text: move.note.text } : {}),
              ...(move.note.tags ? { tags: move.note.tags } : {}),
              ideas: ideas.filter((idea) => move.note?.ideas?.includes(idea.id)),
            },
            ...(move.note.nag ? { nag: move.note.nag } : {}),
          }
        : {}),
      ...(refutation && refMoves.length
        ? { refutation: { moves: refMoves, ...(refutation.note?.text ? { text: refutation.note.text } : {}) } }
        : {}),
    };
  });
}

/**
 * Learn: the line story beside the board, the introduction first, then every move with its explanation. The arrow keys
 * (the board has them at once) and the board's controls step forward and back; the move shown is marked in the story,
 * and a move there goes to it. Nothing to play and nothing saved; at the end, Try it.
 */
function LearnStage({
  data,
  moves,
  lead,
  intro,
  story,
  refutations = 'all',
  m,
  onStep,
  onTry,
  onTest,
}: LearnFlowProps & { m: number; onStep: (m: number) => void; onTry: () => void; onTest?: () => void }) {
  const { one } = data;
  const side = one.opening.side;
  const [index, setIndexState] = useState(Math.min(m, moves.length));
  const setIndex = (next: number) => {
    setIndexState(next);
    onStep(next);
  };
  const positions = useMemo(
    () => [
      {
        epd: moves[0]!.before,
        ...(lead ? { lastMove: squares(lead.uci), ...(lead.note ? { marks: lead.note } : {}) } : {}),
        score: bakedScore(one.facts, moves[0]!.before),
        next: squares(moves[0]!.uci),
      },
      ...moves.map((move, i) => ({
        epd: move.after,
        lastMove: squares(move.uci),
        ...(move.note ? { marks: move.note } : {}),
        score: bakedScore(one.facts, move.after),
        ...(moves[i + 1] ? { next: squares(moves[i + 1]!.uci) } : {}),
      })),
    ],
    [moves, lead, one.facts],
  );
  const told = useMemo(() => storyOf(data, moves, refutations), [data, moves, refutations]);
  const atEnd = index >= moves.length;
  return (
    <BoardColumns
      fit
      board={
        <Board
          positions={positions}
          index={index}
          onIndex={setIndex}
          reveal="learn"
          orientation={side}
          flippable={false}
          caption={
            index === 0 ? (
              <p className="text-muted-foreground">
                Step through the moves with the arrow keys or the buttons under the board.
              </p>
            ) : undefined
          }
        />
      }
    >
      <LineStory
        follow
        moves={told}
        firstPly={moves[0]!.ply}
        side={side}
        intro={
          <>
            {intro}
            {onTest ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Button size="sm" variant="outline" onClick={onTest}>
                  <Target aria-hidden /> Test me instead
                </Button>
                <span className="text-muted-foreground">Every move right first time, no help, and it is known.</span>
              </div>
            ) : null}
          </>
        }
        {...(story?.start ? { start: story.start } : {})}
        {...(story?.end ? { end: story.end } : {})}
        {...(story?.grows ? { grows: story.grows } : {})}
        current={index - 1}
        onSelect={(i) => setIndex(i + 1)}
        evalAfter="words"
      />
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <Button variant={atEnd ? 'default' : 'outline'} onClick={onTry}>
          <Target aria-hidden /> Try it
        </Button>
        {atEnd ? <span className="text-sm text-muted-foreground">Now play your moves without help.</span> : null}
      </div>
    </BoardColumns>
  );
}

/**
 * Try: the learner plays their side alone; the other side plays the moves' replies. With `save`, every learner move is
 * saved as a card. Testing out records the test in the attempts log: passed when every move was right first time.
 */
function TryStage({
  data,
  item,
  moves,
  lead,
  practice,
  testOut,
  m,
  test,
  onPlayed,
  onDone,
}: LearnFlowProps & {
  m: number;
  test: boolean;
  onPlayed: (m: number) => void;
  onDone: (tries: TryRow[], testedOut?: boolean) => void;
}) {
  const { one } = data;
  const opening = one.opening;
  // Carry on from the moves already played (the hash's `m`), unless testing out, which runs them all. Read once: the
  // hash's `m` follows the moves played from here on.
  const [offset] = useState(() => (test ? 0 : Math.min(m, moves.length - 1)));
  const exercises = useMemo<Exercise[]>(() => {
    const before = offset > 0 ? moves[offset - 1]!.uci : lead?.uci;
    return [
      {
        id: item,
        mode: 'try',
        start: moves[offset]!.before,
        startPly: moves[offset]!.ply,
        ...(before ? { before } : {}),
        side: opening.side,
        grader: { kind: 'exact' },
        responder: { kind: 'scripted', script: moves.slice(offset).map((move) => move.uci) },
      },
    ];
  }, [opening, item, moves, lead, offset]);
  const session = useExerciseSession({ exercises, opening, facts: one.facts, save: practice.save });
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
    if (!test || !testOut) {
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
          ref: testOut.ref,
          result: passed ? 'right' : result?.shown ? 'shown' : 'wrong',
          tries: result?.attempt.tries ?? [],
          ms: result?.ms ?? 0,
          hint: Boolean(result?.hint),
          shown: Boolean(result?.shown),
        }),
      )
      .finally(() => onDone(session.tries, passed));
  }, [session.done, session.results, session.tries, test, testOut, onDone]);

  const mine = moves.slice(offset).filter((move) => move.mine).length;
  const done = session.played.filter((move) => move.mine).length;
  return (
    <ExerciseBoard
      session={session}
      aside={
        <ExercisePanel
          mode="step"
          prompt={test ? 'Test out: every move right first time' : practice.prompt}
          context={test ? 'Get every move right with no help and it is known.' : practice.context}
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
 * Done: the tries as the record, the ideas, where the moves leave you, whether it is known and, if not, which moves are
 * not yet, with Try again; then the page's own way on. Reads the log again, so it says what the answers just did.
 */
function DoneStage({
  data,
  item,
  moves,
  done,
  record,
  test,
  onAgain,
  onLearn,
}: LearnFlowProps & {
  record: { tries: TryRow[]; testedOut?: boolean };
  test: boolean;
  onAgain: () => void;
  onLearn: () => void;
}) {
  const opening = data.one.opening;
  // The answers of the Try just played are saved as it goes; read the log once they have landed.
  const fresh = useLoad(
    () =>
      new Promise<Awaited<ReturnType<typeof loadProgress>>>((resolve, reject) =>
        setTimeout(() => loadProgress().then(resolve, reject), siteConfig.timing.nextCard),
      ),
    [item, record],
  );
  const now: OpeningData = fresh.data
    ? {
        ...data,
        progress: fresh.data,
        one: fresh.data.openings.find((candidate) => candidate.opening.id === opening.id) ?? data.one,
      }
    : data;
  const known = done.known(now);
  const context: DoneContext = {
    data: now,
    known,
    loading: fresh.loading,
    test,
    ...(record.testedOut !== undefined ? { testedOut: record.testedOut } : {}),
  };
  const states = cardStates(now.progress.cards, now.progress.reviews);
  const notYet = moves.filter(
    (move) => move.mine && !['known', 'mastered'].includes(states.get(`move:${move.before}:${move.uci}`) ?? ''),
  );
  const words = done.words(context);
  const last = moves.at(-1)!;
  return (
    <div className="grid gap-6">
      <SessionSummary
        mode="step"
        headline={fresh.loading ? 'Saving your answers…' : words.headline}
        sentence={words.sentence}
        tries={record.tries}
        ideas={movesIdeas(data, moves)}
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
        {done.actions?.(context)}
        <Button variant="outline" onClick={onLearn}>
          <BookOpen aria-hidden /> {test ? 'Learn it' : 'Learn it again'}
        </Button>
        <Button asChild variant="outline">
          <a href={openingHref(opening.id)}>
            <ArrowLeft aria-hidden /> Back to the opening
          </a>
        </Button>
      </div>
      {done.after?.(context)}
    </div>
  );
}
