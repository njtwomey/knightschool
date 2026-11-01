import { createScheduler, matchAnswer, quizCardId, replay, START_EPD, type Card } from '@knightschool/core';
import type { BuiltOpening, BuiltQuestion } from '@knightschool/core/content';
import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '@/components/board/board';
import { MoveRun } from '@/components/chess/move-run';
import { AnswerInput, type AnswerVerdict } from '@/components/practice/answer-input';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { loadCatalog, loadOpening } from '@/data/content';
import { learnerStore } from '@/data/learner';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';

const scheduler = createScheduler(siteConfig.schedule);
const newId = () => crypto.randomUUID();

const questionsHref = (opening?: string) => to(`/practice/questions${opening ? `/${opening}` : ''}`);

type Asked = { opening: BuiltOpening; question: BuiltQuestion; cardId: string };

/**
 * The questions of the openings (or one), in schedule order: due first, then new, then the rest by when they fall
 * due, at most a session's worth (config `schedule.sessionSize`).
 */
async function loadQuestions(only?: string): Promise<{ asked: Asked[]; name?: string }> {
  const catalog = await loadCatalog();
  const ids = catalog.openings.map((opening) => opening.id).filter((id) => !only || id === only);
  const openings = await Promise.all(ids.map((id) => loadOpening(id)));
  const store = await learnerStore();
  const cards = new Map((await store.cards.all()).map((card) => [card.id, card]));
  const now = Date.now();
  const rank = (card: Card | undefined) => (!card ? 1 : Date.parse(card.due) <= now ? 0 : 2);
  const asked = openings
    .flatMap((opening) =>
      (opening.questions ?? []).map((question) => ({ opening, question, cardId: quizCardId(opening.id, question.id) })),
    )
    .map((item) => ({ item, card: cards.get(item.cardId) }))
    .sort(
      (a, b) => rank(a.card) - rank(b.card) || (a.card && b.card ? Date.parse(a.card.due) - Date.parse(b.card.due) : 0),
    )
    .slice(0, siteConfig.schedule.sessionSize.default)
    .map(({ item }) => item);
  return { asked, name: only ? openings[0]?.name : undefined };
}

/** A typed answer on the schedule: matched is Good, missed is Again; logged as a review attempt. */
async function saveAnswer(cardId: string, matched: boolean, ms: number, session: string) {
  const store = await learnerStore();
  const now = new Date();
  const rating = matched ? 'good' : 'again';
  const card = (await store.cards.get(cardId)) ?? scheduler.newCard(cardId, now);
  await store.cards.put(scheduler.review(card, rating, now));
  await store.reviews.add({ id: newId(), cardId, at: now.toISOString(), rating, ms, hint: false });
  await store.attempts.add({
    id: newId(),
    at: now.toISOString(),
    session,
    mode: 'review',
    ref: cardId,
    result: matched ? 'right' : 'wrong',
    tries: [],
    ms,
    hint: false,
    shown: false,
  });
}

/**
 * Questions in words (v1's quizzes): a position, a question, a typed answer matched by keyword groups, then the
 * explanation and Next. Each question is a card, `quiz:<opening>:<id>`, scheduled with FSRS. `/practice/questions`
 * asks every opening's; `/practice/questions/<opening>` one opening's.
 */
export function QuestionsPage({ opening }: { opening?: string }) {
  const [round, setRound] = useState(0);
  const data = useLoad(() => loadQuestions(opening), [opening, round]);
  const crumbs = [
    { label: 'Questions', href: opening ? questionsHref() : undefined },
    ...(data.data?.name ? [{ label: data.data.name }] : []),
  ];
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs root={{ label: 'Practice', href: to('/practice') }} crumbs={crumbs} />
      {data.error ? (
        <p className="text-destructive">{data.error}</p>
      ) : !data.data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : data.data.asked.length === 0 ? (
        <EmptyState
          kind="new"
          text="No questions here yet."
          action={{ label: 'All openings', href: to('/openings') }}
        />
      ) : (
        <QuestionSession key={round} asked={data.data.asked} onAgain={() => setRound((n) => n + 1)} />
      )}
    </main>
  );
}

type Answer = { matched: boolean; typed: string };

function QuestionSession({ asked, onAgain }: { asked: Asked[]; onAgain: () => void }) {
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const session = useRef(newId());
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [at]);
  const current = asked[at];
  const answer = answers[at];

  if (!current) {
    const right = answers.filter((a) => a.matched).length;
    return (
      <div className="grid max-w-3xl gap-4">
        <SessionSummary
          mode="review"
          headline={`Questions done: ${answers.length}`}
          sentence={`${right} answered, ${answers.length - right} missed. Missed questions come back soon.`}
          figures={[
            { value: String(right), label: 'answered' },
            { value: String(answers.length - right), label: 'to see again soon' },
          ]}
        />
        <div>
          <Button variant="outline" onClick={onAgain}>
            <RotateCcw aria-hidden /> Ask again
          </Button>
        </div>
      </div>
    );
  }

  const respond = (typed: string, matched: boolean) => {
    setAnswers((list) => [...list, { matched, typed }]);
    void saveAnswer(current.cardId, matched, Date.now() - shownAt.current, session.current);
  };
  const next = () => setAt((i) => i + 1);
  return (
    <QuestionView
      key={current.cardId}
      asked={current}
      answer={answer}
      progress={{ done: at, total: asked.length }}
      onAnswer={(typed) => respond(typed, matchAnswer(typed, current.question.answers))}
      onGiveUp={() => respond('', false)}
      onNext={next}
    />
  );
}

function QuestionView({
  asked,
  answer,
  progress,
  onAnswer,
  onGiveUp,
  onNext,
}: {
  asked: Asked;
  answer?: Answer;
  progress: { done: number; total: number };
  onAnswer: (text: string) => void;
  onGiveUp: () => void;
  onNext: () => void;
}) {
  const { opening, question } = asked;
  const run = useMemo(
    () => replay(START_EPD, question.moves).map((move) => ({ san: move.san, uci: move.uci, after: move.epd })),
    [question],
  );
  const last = question.moves.at(-1);
  const variation = opening.variations.find((v) => v.id === question.variation);
  const verdict: AnswerVerdict | null = answer
    ? answer.matched
      ? { credit: 'full', message: 'that is the idea.' }
      : { credit: 'none', message: answer.typed ? 'not quite what the question is after.' : 'here is the answer.' }
    : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <Board
        positions={[
          { epd: question.epd, lastMove: last ? { from: last.slice(0, 2), to: last.slice(2, 4) } : undefined },
        ]}
        index={0}
        reveal={answer ? 'answered' : 'study'}
        evalBar={false}
        orientation={opening.side}
        caption={<MoveRun moves={run} side={opening.side} />}
      />
      <ExercisePanel
        mode="review"
        prompt={question.ask}
        context={`${opening.name}${variation?.name ? `, ${variation.name}` : ''}`}
        progress={progress}
        result={answer ? (answer.matched ? 'right' : 'missed') : null}
        explanation={answer ? question.explain : null}
        onNext={answer ? onNext : undefined}
        className="self-start"
      >
        <AnswerInput
          key={answer ? 'answered' : 'asking'}
          placeholder="Your answer, in a few words"
          verdict={verdict}
          answered={answer?.typed}
          onAnswer={onAnswer}
          onGiveUp={onGiveUp}
        />
      </ExercisePanel>
    </div>
  );
}
