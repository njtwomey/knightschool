import type { Card } from '@knightschool/core';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { loadCatalog, loadOpening } from '@/data/content';
import { learnerStore } from '@/data/learner';
import { getSetting, whenSettingsReady } from '@/data/settings';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { askedOf, type Asked, type QuestionAnswer } from './asked';
import { QuestionRun } from './question-run';

const questionsHref = (opening?: string) => to(`/practice/questions${opening ? `/${opening}` : ''}`);

/**
 * The questions of the openings (or one), in schedule order: due first, then new, then the rest by when they fall
 * due, at most a session's worth (the learner's `review.sessionSize`).
 */
async function loadQuestions(only?: string): Promise<{ asked: Asked[]; name?: string }> {
  const [catalog] = await Promise.all([loadCatalog(), whenSettingsReady()]);
  const ids = catalog.openings.map((opening) => opening.id).filter((id) => !only || id === only);
  const openings = await Promise.all(ids.map((id) => loadOpening(id)));
  const store = await learnerStore();
  const cards = new Map((await store.cards.all()).map((card) => [card.id, card]));
  const now = Date.now();
  const rank = (card: Card | undefined) => (!card ? 1 : Date.parse(card.due) <= now ? 0 : 2);
  const asked = openings
    .flatMap((opening) => (opening.questions ?? []).map((question) => askedOf(opening, question)))
    .map((item) => ({ item, card: cards.get(item.cardId) }))
    .sort(
      (a, b) => rank(a.card) - rank(b.card) || (a.card && b.card ? Date.parse(a.card.due) - Date.parse(b.card.due) : 0),
    )
    .slice(0, getSetting('review.sessionSize'))
    .map(({ item }) => item);
  return { asked, name: only ? openings[0]?.name : undefined };
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

function QuestionSession({ asked, onAgain }: { asked: Asked[]; onAgain: () => void }) {
  const [answers, setAnswers] = useState<QuestionAnswer[] | null>(null);
  if (!answers) return <QuestionRun asked={asked} mode="review" save onDone={setAnswers} />;
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
