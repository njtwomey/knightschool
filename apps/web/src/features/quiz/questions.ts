import {
  cardFits,
  isQuizCard,
  type Card,
  type LineEdge,
  nodeAt,
  type OpeningContent,
  pathTo,
  type Quiz,
} from '@knightschool/core';

export const quizFor = (content: OpeningContent | undefined, card: Card): Quiz | undefined =>
  content?.quizzes.find((quiz) => card.id === `quiz:${content.opening.id}:${quiz.id}`);

export type MoveQuestion = {
  kind: 'move';
  card: Card;
  content: OpeningContent;
  /** The move that was just played to reach this position (the opponent's), if any. */
  lastEdge: LineEdge | undefined;
  /** How the position was reached, as moves from the start. */
  path: LineEdge[];
  expected: LineEdge;
};

export type QuizQuestion = { kind: 'quiz'; card: Card; content: OpeningContent; quiz: Quiz };

type SessionQuestion = MoveQuestion | QuizQuestion;

/** What the board and panel need for the card being asked. */
export function currentQuestion(state: {
  queue: Card[];
  index: number;
  contents: Record<string, OpeningContent>;
}): SessionQuestion | null {
  const card = state.queue[state.index];
  const content = card ? state.contents[card.openingId] : undefined;
  if (!card || !content || !cardFits(content, card)) return null;
  if (isQuizCard(card)) {
    const quiz = quizFor(content, card);
    return quiz ? { kind: 'quiz', card, content, quiz } : null;
  }
  const expected = nodeAt(content, card.epd).moves.find((move) => move.uci === card.expectedUci)!;
  const path = card.epd === content.opening.rootEpd ? [] : pathTo(content, card.epd);
  return { kind: 'move', card, content, lastEdge: path.at(-1), path, expected };
}
