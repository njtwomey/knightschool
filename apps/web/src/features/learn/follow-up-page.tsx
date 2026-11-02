import { followUpGain, formatPawns, gainWords, GRADE_INFO, type FollowUp } from '@knightschool/core';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { EvalWords } from '@/components/chess/eval-words';
import { MoveChip } from '@/components/chess/move-chip';
import { RichText } from '@/components/chess/rich-text';
import { stepLabel, stepTitle } from '@/components/openings/steps';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { LearnFlow } from './learn-flow';
import { bakedScore, lineMoves, type LineMove } from './model';
import { followUpMoves, openingFollowUps, openingVariations, type OpeningData } from './opening-data';
import { LearnCrumbs } from './learn-crumbs';
import { OpeningFrame } from './opening-frame';
import { useGates } from './use-learn';
import { followUpHref, openingHref, stepHref } from './views';

/*
 * A follow-up (docs/v2/pages/follow-up.md): after a step's main line, one of the opponent's common mistakes in its
 * stretch, taught through the same Learn flow as a step: Learn (why it is worth knowing, then the mistake and the
 * punishing line, each move with its note), Try (the learner plays the punishment; its moves are saved as cards and come
 * back in Review), Done.
 */

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
  const { one } = data;
  const opening = one.opening;
  const gates = useGates(opening.id);
  const variations = useMemo(() => openingVariations(data), [data]);
  const variation = variations.find((v) => v.steps.some((row) => row.number === n))!;
  const parent = variation.steps.find((row) => row.number === n)!;
  const row = variation.followUps?.[parent.id]?.[k - 1];
  const siblings = variation.followUps?.[parent.id] ?? [];
  const title = row ? stepTitle(row) : `Follow-up ${k}`;
  const label = row ? stepLabel(row) : String(k);
  const step = opening.steps.find((s) => s.id === followUp.step)!;
  const lead = lineMoves(opening, step.line)[followUp.ply - 1];
  const gain = gainWords(followUpGain(followUp, opening.side));
  // Each move with its note: the author's where written; else, for the mistake, its verdict and for the punishment,
  // what it wins.
  const moves = useMemo<LineMove[]>(
    () =>
      followUpMoves(followUp).map((move, i) => {
        const text =
          followUp.notes[i]?.text ??
          (i === 0
            ? whyBad(followUp)
            : i === 1
              ? `The punishment, the engine’s best${gain ? `: ${sideName(opening.side)} ${gain}` : ''}.`
              : undefined);
        const note = { ...followUp.notes[i], ...(text ? { text } : {}) };
        return { ...move, ...(Object.keys(note).length ? { note } : {}) };
      }),
    [followUp, gain, opening.side],
  );
  const mistake = moves[0]!;

  return (
    <LearnFlow
      data={data}
      item={followUp.id}
      remember
      passRef={followUp.id}
      crumbs={<LearnCrumbs data={data} at={{ step: n, followUp: k }} />}
      title={`${label}. ${title}`}
      subtitle={`A follow-up of step ${n}, ${stepTitle(parent)}: the mistake, then how to punish it.`}
      notice={() =>
        row?.state === 'locked' && gates ? (
          <Notice
            kind="reminder"
            text={`This follow-up opens once step ${n} is known: the main line first, then the mistakes to exploit.`}
            action={
              <Button asChild size="sm" variant="outline">
                <a href={stepHref(opening.id, n)}>Go to step {n}</a>
              </Button>
            }
          />
        ) : null
      }
      moves={moves}
      {...(lead ? { lead: { uci: lead.uci } } : {})}
      intro={<WorthKnowing data={data} followUp={followUp} moves={moves} gain={gain} />}
      refutations="none"
      practice={{
        prompt: `Punish ${sideName(opening.side === 'white' ? 'black' : 'white')}'s mistake`,
        context: (
          <span className="inline-flex flex-wrap items-baseline gap-1">
            <span>After</span>
            <MoveChip
              ply={mistake.ply}
              san={mistake.san}
              epd={mistake.after}
              {...squares(mistake.uci)}
              orientation={opening.side}
            />
            <span>play the punishment; the other side plays its replies.</span>
          </span>
        ),
        save: 'moves',
      }}
      done={{
        known: (now) => {
          const view = openingVariations(now)
            .flatMap((v) => Object.values(v.followUps ?? {}).flat())
            .find((candidate) => candidate.id === followUp.id);
          return view?.state === 'known' || view?.state === 'mastered';
        },
        words: ({ known }) => ({
          headline: known ? 'Known' : 'Not known yet',
          sentence: known
            ? 'The punishment right first time with no help, so this follow-up is known. It comes back in your reviews.'
            : 'A run with every move right first time and no help makes it known. Its moves are in your reviews either way.',
        }),
        actions: ({ known }) =>
          k < siblings.length ? (
            <Button asChild variant={known ? 'default' : 'outline'}>
              <a href={followUpHref(opening.id, n, k + 1)}>
                Next follow-up <ArrowRight aria-hidden />
              </a>
            </Button>
          ) : null,
      }}
    />
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
  moves: LineMove[];
  gain: string | null;
}) {
  const { one } = data;
  const side = one.opening.side;
  const [mistake, punish] = moves;
  const chip = (move: LineMove) => (
    <MoveChip
      ply={move.ply}
      san={move.san}
      epd={move.after}
      {...squares(move.uci)}
      mine={move.mine}
      orientation={side}
    />
  );
  // What the line wins: from the board; else the author's last word on the punishing line, which says what is won
  // (with the board's words, that note is left to its move in the story below).
  const summary = gain
    ? undefined
    : followUp.notes
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
