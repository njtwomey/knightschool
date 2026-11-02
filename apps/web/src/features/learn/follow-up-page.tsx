import { followUpGain, formatPawns, gainWords, GRADE_INFO, type Exercise, type FollowUp } from '@knightschool/core';
import { ArrowLeft, ArrowRight, Eye, RotateCcw, Target } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '@/components/board/board';
import { BoardColumns } from '@/components/shared/board-columns';
import { BoardNotes } from '@/components/board/board-notes';
import { MoveChip } from '@/components/chess/move-chip';
import type { Try as TryRow } from '@/components/chess/tries-table';
import { MoveTable } from '@/components/chess/move-table';
import { EvalWords } from '@/components/chess/eval-words';
import { RichText } from '@/components/chess/rich-text';
import { stepLabel, stepTitle, type StepData } from '@/components/openings/steps';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { SessionSummary } from '@/components/practice/session-summary';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { siteConfig } from '@/data/site-config';
import { ExerciseBoard } from '@/features/practice/exercise-board';
import { loadProgress } from '@/features/practice/progress';
import { useExerciseSession } from '@/features/practice/use-exercise-session';
import { useLoad } from '@/hooks/use-load';
import { bakedScore, lineMoves } from './model';
import { followUpMoves, openingFollowUps, openingVariations, type OpeningData } from './opening-data';
import { OpeningCrumbs, OpeningFrame } from './opening-frame';
import { rememberStage } from './stage-memory';
import { useGates } from './use-learn';
import { followUpHref, openingHref, stepHref, variationHref } from './views';

/*
 * A follow-up (docs/v2/pages/follow-up.md): after a step's main line, one of the opponent's common mistakes in its
 * stretch. First shown (the mistake, why it is bad, the punishing line, stepped with the keys), then tried (the learner
 * plays the punishment; its moves are saved as cards and come back in Review), then Done.
 */

type Stage = 'read' | 'try' | 'done';
const STAGES: Stage[] = ['read', 'try', 'done'];
const STAGE_LABEL: Record<Stage, string> = { read: 'Read', try: 'Try', done: 'Done' };

const readStage = (): Stage => {
  const stage = new URLSearchParams(window.location.hash.slice(1)).get('stage') as Stage | null;
  return stage && STAGES.includes(stage) ? stage : 'read';
};
const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
const sideName = (side: 'white' | 'black') => (side === 'white' ? 'White' : 'Black');

/** Why the mistake is bad, in one sentence with one verdict: the author's note, or the grade, how common, the cost. */
function whyBad(followUp: FollowUp): string {
  const { mistake } = followUp;
  if (mistake.note?.text) return mistake.note.text;
  const grade = GRADE_INFO[mistake.grade].name.toLowerCase();
  const article = /^[aeiou]/.test(grade) ? 'An' : 'A';
  const share =
    mistake.share !== undefined ? `, played in ${Math.round(mistake.share * 100)}% of games at your level` : '';
  const cost = mistake.costCp ? `; it gives away about ${formatPawns(mistake.costCp, { signed: false })} pawns` : '';
  return `${article} ${grade}${share}${cost}.`;
}

export function FollowUpPage({ id, n, k }: { id: string; n: number; k: number }) {
  return (
    <OpeningFrame id={id}>
      {(data) => {
        const step = data.one.opening.steps[n - 1];
        const followUp = step
          ? openingFollowUps(data).filter((candidate) => candidate.step === step.id)[k - 1]
          : undefined;
        if (!step || !followUp) {
          return (
            <main className="mx-auto max-w-7xl px-4 py-8">
              <Notice
                kind="problem"
                text={`Step ${n} of the ${data.one.opening.name} has no follow-up ${k}.`}
                action={
                  <Button asChild size="sm" variant="outline">
                    <a href={step ? stepHref(id, n) : openingHref(id)}>{step ? `Back to step ${n}` : 'Back'}</a>
                  </Button>
                }
              />
            </main>
          );
        }
        return <FollowUpView key={followUp.id} data={data} followUp={followUp} n={n} k={k} />;
      }}
    </OpeningFrame>
  );
}

function FollowUpView({ data, followUp, n, k }: { data: OpeningData; followUp: FollowUp; n: number; k: number }) {
  const { one, progress } = data;
  const opening = one.opening;
  const gates = useGates(opening.id);
  const [stage, setStageState] = useState<Stage>(readStage);
  const [record, setRecord] = useState<TryRow[]>([]);
  const [run, setRun] = useState(0);
  const setStage = (next: Stage) => {
    setStageState(next);
    window.history.replaceState(null, '', `#stage=${next}`);
  };
  useEffect(() => rememberStage(opening.id, followUp.id, stage), [opening.id, followUp.id, stage]);
  const variations = useMemo(() => openingVariations(data), [data]);
  const variation = variations.find((v) => v.steps.some((row) => row.number === n))!;
  const parent = variation.steps.find((row) => row.number === n)!;
  const row = variation.followUps?.[parent.id]?.[k - 1];
  const siblings = variation.followUps?.[parent.id] ?? [];
  const title = row ? stepTitle(row) : `Follow-up ${k}`;

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <OpeningCrumbs
        catalog={progress.catalog}
        opening={opening}
        crumbs={[
          { label: variation.name, href: variationHref(opening.id, variation.id) },
          { label: `Step ${n}`, href: stepHref(opening.id, n) },
          {
            label: `Follow-up ${row ? stepLabel(row) : k}`,
            siblings: {
              current: followUp.id,
              label: 'Follow-ups',
              items: siblings.map((sibling, i) => ({
                id: sibling.id,
                label: `${stepLabel(sibling)}: ${stepTitle(sibling)}`,
                href: followUpHref(opening.id, n, i + 1),
              })),
            },
          },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {row ? stepLabel(row) : k}. {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            A follow-up of step {n}, {stepTitle(parent)}: the mistake, then how to punish it.
          </p>
        </div>
        <Tabs value={stage} onValueChange={(value) => setStage(value as Stage)}>
          <TabsList aria-label="Stages">
            {STAGES.map((name) => (
              <TabsTrigger key={name} value={name}>
                {STAGE_LABEL[name]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {row?.state === 'locked' && gates ? (
        <Notice
          kind="reminder"
          text={`This follow-up opens once step ${n} is known: the main line first, then the mistakes to exploit.`}
          action={
            <Button asChild size="sm" variant="outline">
              <a href={stepHref(opening.id, n)}>Go to step {n}</a>
            </Button>
          }
        />
      ) : null}
      {stage === 'read' ? <ReadStage data={data} followUp={followUp} onTry={() => setStage('try')} /> : null}
      {stage === 'try' ? (
        <TryStage
          key={run}
          data={data}
          followUp={followUp}
          onDone={(tries) => {
            setRecord(tries);
            setStage('done');
          }}
        />
      ) : null}
      {stage === 'done' ? (
        <DoneStage
          data={data}
          followUp={followUp}
          row={row}
          n={n}
          k={k}
          more={siblings.length}
          record={record}
          onAgain={() => {
            setRun((r) => r + 1);
            setStage('try');
          }}
          onShow={() => setStage('read')}
        />
      ) : null}
    </main>
  );
}

/**
 * Read: why the follow-up is worth knowing (the evaluation before the mistake, after it and after the punishment, and
 * what the punishing line wins), then the mistake and the line, stepped with the arrow keys, each note with its move.
 */
function ReadStage({ data, followUp, onTry }: { data: OpeningData; followUp: FollowUp; onTry: () => void }) {
  const { one } = data;
  const opening = one.opening;
  const moves = useMemo(() => followUpMoves(followUp), [followUp]);
  const step = opening.steps.find((s) => s.id === followUp.step)!;
  const lead = lineMoves(opening, step.line)[followUp.ply - 1];
  const gain = gainWords(followUpGain(followUp, opening.side));
  // Each move's note: the author's where written; else, for the mistake, its verdict and for the punishment, what it wins.
  const notes = (i: number) =>
    followUp.notes[i]?.text ??
    (i === 0
      ? whyBad(followUp)
      : i === 1
        ? `The punishment, the engine’s best${gain ? `: ${sideName(opening.side)} ${gain}` : ''}.`
        : undefined);
  const positions = useMemo(
    () => [
      {
        epd: followUp.mistake.epd,
        ...(lead ? { lastMove: squares(lead.uci) } : {}),
        score: bakedScore(one.facts, followUp.mistake.epd),
      },
      ...moves.map((move, i) => ({
        epd: move.after,
        lastMove: squares(move.uci),
        ...(followUp.notes[i] ? { marks: followUp.notes[i] } : {}),
        score: bakedScore(one.facts, move.after),
      })),
    ],
    [moves, followUp, lead, one.facts],
  );
  const [index, setIndex] = useState(0);
  const at = moves[index - 1];
  return (
    <BoardColumns
      board={
        <Board
          positions={positions}
          index={index}
          onIndex={setIndex}
          reveal="study"
          orientation={opening.side}
          flippable={false}
        />
      }
    >
      <WorthKnowing data={data} followUp={followUp} moves={moves} gain={gain} />
      <BoardNotes
        move={
          at
            ? {
                ply: at.ply,
                san: at.san,
                ...(notes(index - 1) ? { comment: notes(index - 1) } : {}),
                ...(followUp.notes[index - 1] ? { marks: followUp.notes[index - 1] } : {}),
              }
            : undefined
        }
        startText="Step forward with the right arrow key to see the mistake, then the punishment."
        side={opening.side}
      />
      <MoveTable
        moves={moves.map((move) => ({ san: move.san, uci: move.uci, after: move.after }))}
        current={index - 1}
        onSelect={(i) => setIndex(i + 1)}
        side={opening.side}
        firstPly={followUp.ply}
      />
      <div>
        <Button onClick={onTry}>
          <Target aria-hidden /> Try the punishment
        </Button>
      </div>
    </BoardColumns>
  );
}

/**
 * Why a follow-up is worth knowing, in words and numbers: the evaluation before the mistake, after it and after the
 * punishment (a missing one says so, never a number carried over), and what the punishing line wins. With nothing the
 * board can show and no author's note, it says so: `make content-check` lists those as gaps.
 */
function WorthKnowing({
  data,
  followUp,
  moves,
  gain,
}: {
  data: OpeningData;
  followUp: FollowUp;
  moves: ReturnType<typeof followUpMoves>;
  gain: string | null;
}) {
  const { one } = data;
  const side = one.opening.side;
  const [mistake, punish] = moves;
  const chip = (move: (typeof moves)[number]) => (
    <MoveChip
      ply={move.ply}
      san={move.san}
      epd={move.after}
      {...squares(move.uci)}
      mine={move.mine}
      orientation={side}
    />
  );
  // What the line wins: from the board, and the author's last word on the punishing line (it says what is won and why).
  const summary = followUp.notes
    .slice(1)
    .reverse()
    .find((note) => note?.text)?.text;
  const won = gain
    ? `${sideName(side)} ${gain}.`
    : summary || followUp.mistake.note?.text
      ? null
      : 'The opening does not say yet what this wins.';
  return (
    <section className="grid gap-2 rounded-lg border p-3" aria-labelledby="worth-knowing">
      <h2 id="worth-knowing" className="text-sm font-semibold">
        Why it is worth knowing
      </h2>
      {won ? <p className="text-sm">{won}</p> : null}
      {summary ? (
        <RichText
          text={summary}
          context={{ startEpd: followUp.mistake.epd, firstPly: followUp.ply, moves }}
          side={side}
          className="text-sm"
        />
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Before the mistake</dt>
        <dd>
          <EvalWords score={bakedScore(one.facts, followUp.mistake.epd)} />
        </dd>
        {mistake ? (
          <>
            <dt className="inline-flex items-baseline gap-1 text-muted-foreground">After {chip(mistake)}</dt>
            <dd>
              <EvalWords score={bakedScore(one.facts, mistake.after)} />
            </dd>
          </>
        ) : null}
        {punish ? (
          <>
            <dt className="inline-flex items-baseline gap-1 text-muted-foreground">After {chip(punish)}</dt>
            <dd>
              <EvalWords score={bakedScore(one.facts, punish.after)} />
            </dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}

/** Try: the mistake has been played; the learner plays the punishing line, the other side its replies. Saved as cards. */
function TryStage({
  data,
  followUp,
  onDone,
}: {
  data: OpeningData;
  followUp: FollowUp;
  onDone: (tries: TryRow[]) => void;
}) {
  const { one } = data;
  const opening = one.opening;
  const moves = useMemo(() => followUpMoves(followUp), [followUp]);
  const exercises = useMemo<Exercise[]>(
    () => [
      {
        id: followUp.id,
        mode: 'try',
        start: moves[0]!.after,
        startPly: followUp.ply + 1,
        before: followUp.mistake.uci,
        side: opening.side,
        grader: { kind: 'exact' },
        responder: { kind: 'scripted', script: followUp.line.slice(1) },
      },
    ],
    [followUp, moves, opening],
  );
  const session = useExerciseSession({ exercises, opening, facts: one.facts, save: 'moves' });
  const finished = useRef(false);
  useEffect(() => {
    if (!session.done || finished.current) return;
    finished.current = true;
    onDone(session.tries);
  }, [session.done, session.tries, onDone]);
  const mistake = moves[0]!;
  const done = session.played.filter((move) => move.mine).length;
  return (
    <ExerciseBoard
      session={session}
      aside={
        <ExercisePanel
          mode="step"
          prompt={`Punish ${sideName(opening.side === 'white' ? 'black' : 'white')}'s mistake`}
          context={
            <span className="inline-flex flex-wrap items-baseline gap-1">
              <MoveChip
                ply={mistake.ply}
                san={mistake.san}
                epd={mistake.after}
                {...squares(mistake.uci)}
                orientation={opening.side}
              />
              <span>has been played. {whyBad(followUp)}</span>
            </span>
          }
          tries={{
            left: session.triesBeforeShown - session.attempt.tries.filter((t) => t.outcome === 'wrong').length,
            total: session.triesBeforeShown,
          }}
          help={{ hint: session.attempt.hint, shown: session.attempt.shown }}
          progress={{ done, total: followUp.cards.length }}
        />
      }
    />
  );
}

/** Done: the tries, whether the follow-up is known, and the way on. Reads the log again once the answers have landed. */
function DoneStage({
  data,
  followUp,
  row,
  n,
  k,
  more,
  record,
  onAgain,
  onShow,
}: {
  data: OpeningData;
  followUp: FollowUp;
  row?: StepData;
  n: number;
  k: number;
  more: number;
  record: TryRow[];
  onAgain: () => void;
  onShow: () => void;
}) {
  const opening = data.one.opening;
  const fresh = useLoad(
    () =>
      new Promise<Awaited<ReturnType<typeof loadProgress>>>((resolve, reject) =>
        setTimeout(() => loadProgress().then(resolve, reject), siteConfig.timing.nextCard),
      ),
    [followUp.id, record],
  );
  const freshData = fresh.data
    ? { ...data, progress: fresh.data, one: fresh.data.openings.find((o) => o.opening.id === opening.id) ?? data.one }
    : data;
  const view = openingVariations(freshData)
    .flatMap((v) => Object.values(v.followUps ?? {}).flat())
    .find((candidate) => candidate.id === followUp.id);
  const known = view?.state === 'known' || view?.state === 'mastered';
  const label = row ? stepLabel(row) : String(k);
  return (
    <div className="grid gap-6">
      <SessionSummary
        mode="step"
        headline={
          fresh.loading ? 'Saving your answers…' : known ? `Follow-up ${label} is known` : `Follow-up ${label} done`
        }
        sentence={
          known
            ? 'The punishment has been right twice running. It comes back in your reviews.'
            : `A move is known once it has been right ${siteConfig.judge.knownAfterRight} times running. Its moves are in your reviews either way.`
        }
        tries={record}
        evalAfter={
          bakedScore(data.one.facts, followUpMoves(followUp).at(-1)?.after ?? followUp.mistake.epd) ?? undefined
        }
      />
      <div className="flex flex-wrap gap-2">
        {!known ? (
          <Button onClick={onAgain}>
            <RotateCcw aria-hidden /> Try again
          </Button>
        ) : null}
        {k < more ? (
          <Button asChild variant={known ? 'default' : 'outline'}>
            <a href={followUpHref(opening.id, n, k + 1)}>
              Next follow-up <ArrowRight aria-hidden />
            </a>
          </Button>
        ) : null}
        <Button variant="outline" onClick={onShow}>
          <Eye aria-hidden /> Read it again
        </Button>
        <Button asChild variant="outline">
          <a href={openingHref(opening.id)}>
            <ArrowLeft aria-hidden /> Back to the opening
          </a>
        </Button>
      </div>
    </div>
  );
}
