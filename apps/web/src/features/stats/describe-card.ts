import { isQuizCard, pathTo, playUci, type Card, type OpeningContent } from '@knightschool/core';
import { quizFor } from '@/features/review/store';

const numbered = (moves: string[], from = 0) =>
  moves.map((san, i) => ((from + i) % 2 === 0 ? `${Math.floor((from + i) / 2) + 1}. ${san}` : san)).join(' ');

/** A card in words a learner recognises: "after 3. Bc4 Bc5, play c3", or the quiz question. */
export function describeCard(content: OpeningContent, card: Card): string {
  if (isQuizCard(card)) return quizFor(content, card)?.prompt ?? 'A question';
  const path = card.epd === content.opening.rootEpd ? [] : pathTo(content, card.epd);
  const move = playUci(card.epd, card.expectedUci).san;
  const number = `${Math.floor(path.length / 2) + 1}${path.length % 2 ? '...' : '.'}`;
  return path.length === 0
    ? `the first move: ${move}`
    : `after ${numbered(path.map((edge) => edge.san))}, play ${number} ${move}`;
}
