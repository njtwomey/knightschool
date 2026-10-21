import {
  isQuizCard,
  numberedLine,
  numberedMove,
  pathTo,
  playUci,
  type Card,
  type OpeningContent,
} from '@knightschool/core';
import { quizFor } from '@/features/quiz/store';

/** A card in words a learner recognises: "after 1. e4 e5 2. Nf3, play 2...Nc6", or the quiz question. */
export function describeCard(content: OpeningContent, card: Card): string {
  if (isQuizCard(card)) return quizFor(content, card)?.prompt ?? 'A question';
  const path = card.epd === content.opening.rootEpd ? [] : pathTo(content, card.epd);
  const move = playUci(card.epd, card.expectedUci).san;
  return path.length === 0
    ? `the first move: ${move}`
    : `after ${numberedLine(path.map((edge) => edge.san))}, play ${numberedMove(path.length, move)}`;
}
