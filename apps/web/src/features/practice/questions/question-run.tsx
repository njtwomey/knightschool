import { matchAnswer, replay, START_EPD } from '@knightschool/core';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Board } from '@/components/board/board';
import { MoveRun } from '@/components/chess/move-run';
import { AnswerInput, type AnswerVerdict } from '@/components/practice/answer-input';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { BoardColumns } from '@/components/shared/board-columns';
import type { PracticeMode } from '@/components/practice/practice-config';
import type { AttemptRow } from '@/data/learner-store';
import { saveQuestionAnswer, type Asked, type QuestionAnswer } from './asked';

/*
 * Questions in words (v1's quizzes), asked one after another: a position, a question, a typed answer matched by
 * keyword groups, then the explanation and Next. The one way every page asks them: the Questions mode, Review (question
 * cards) and a checkpoint.
 */

/**
 * Asks `asked` in turn and calls `onDone` with every answer once the last is read. `save` schedules each answer (as an
 * attempt in `logMode`); free practice saves nothing. `progress` offsets the count when the questions follow other
 * exercises in one session; `aside` sits above the panel (the mode's own line).
 */
export function QuestionRun({
  asked,
  mode,
  save,
  logMode = 'review',
  progress,
  aside,
  onDone,
}: {
  asked: readonly Asked[];
  mode: PracticeMode | 'step';
  save: boolean;
  logMode?: AttemptRow['mode'];
  progress?: { done: number; total: number };
  aside?: ReactNode;
  onDone: (answers: QuestionAnswer[]) => void;
}) {
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [session] = useState(() => crypto.randomUUID());
  const shownAt = useRef(0);
  const finished = useRef(false);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [at]);
  useEffect(() => {
    if (at < asked.length || finished.current) return;
    finished.current = true;
    onDone(answers);
  }, [at, asked.length, answers, onDone]);
  const current = asked[at];
  if (!current) return null;
  const answer = answers[at];
  const respond = (typed: string) => {
    const done: QuestionAnswer = {
      cardId: current.cardId,
      typed,
      matched: Boolean(typed) && matchAnswer(typed, current.question.answers),
      ms: Date.now() - shownAt.current,
    };
    setAnswers((list) => [...list, done]);
    if (save) void saveQuestionAnswer(done, session, logMode);
  };
  return (
    <QuestionView
      key={current.cardId}
      asked={current}
      mode={mode}
      answer={answer}
      aside={aside}
      progress={progress ? { done: progress.done + at, total: progress.total } : { done: at, total: asked.length }}
      onAnswer={respond}
      onGiveUp={() => respond('')}
      onNext={() => setAt((i) => i + 1)}
    />
  );
}

function QuestionView({
  asked,
  mode,
  answer,
  aside,
  progress,
  onAnswer,
  onGiveUp,
  onNext,
}: {
  asked: Asked;
  mode: PracticeMode | 'step';
  answer?: QuestionAnswer;
  aside?: ReactNode;
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
    <BoardColumns
      board={
        <Board
          positions={[
            { epd: question.epd, lastMove: last ? { from: last.slice(0, 2), to: last.slice(2, 4) } : undefined },
          ]}
          index={0}
          reveal={answer ? 'answered' : 'test'}
          evalBar={false}
          orientation={opening.side}
          caption={<MoveRun moves={run} side={opening.side} />}
        />
      }
    >
      {aside}
      <ExercisePanel
        mode={mode}
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
    </BoardColumns>
  );
}
