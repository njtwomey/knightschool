import { testManifest } from '@/test-manifest';
import { buildOpening, newCard, parsePgn } from '@knightschool/core';
import { describe, expect, it } from 'vitest';
import { describeCard } from './describe-card';

const game = parsePgn(`[Event "x"]
[Opening "T"]
[Variation "main"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 *`);

const content = buildOpening(
  't',
  testManifest(),
  [{ id: 'main', kind: 'line', game, source: 'main.pgn' }],
  [
    {
      id: 'why',
      line: '1. e4 e5',
      prompt: 'Why e5?',
      accept: [{ keywords: [['centre']], all: false, feedback: 'ok', partial: false }],
      reveal: 'r',
      examples: { match: [], miss: [] },
    },
  ],
);

const card = (epd: string, expectedUci: string, id = `t:${epd}`) =>
  newCard({ id, openingId: 't', epd, expectedUci }, new Date());

describe('describeCard', () => {
  it('describes a move in the position it is asked in', () => {
    const afterNc6 = Object.values(content.nodes).find((n) => n.moves.some((m) => m.san === 'Bc4'))!;
    expect(describeCard(content, card(afterNc6.epd, 'f1c4'))).toBe('after 1. e4 e5 2. Nf3 Nc6, play 3. Bc4');
    expect(describeCard(content, card(content.opening.rootEpd, 'e2e4'))).toBe('the first move: e4');
  });

  it('numbers a Black move with an ellipsis', () => {
    const afterE4 = Object.values(content.nodes).find((n) => n.moves.some((m) => m.san === 'e5'))!;
    expect(describeCard(content, card(afterE4.epd, 'e7e5'))).toBe('after 1. e4, play 1... e5');
  });

  it('gives the question for a quiz card', () => {
    expect(describeCard(content, card(content.opening.rootEpd, '', 'quiz:t:why'))).toBe('Why e5?');
  });
});
