import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { playMove, replay } from '../chess/play';
import { siteConfig } from '../testing/site-config';
import { judgeDeviation, judgeMove, type EvalEntry, type JudgeFacts } from './judge';

const config = { ...siteConfig.judge, ...siteConfig.coverage };
// The Giuoco Piano after 3...Bc5: White to move.
const here = replay(START_EPD, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']).at(-1)!.epd;
const after = (uci: string) => playMove(here, uci)!.epd;

/** Evaluations by move from `here` (White's view), plus the position itself. */
function evals(scores: Record<string, number>, position = 30): JudgeFacts['evalOf'] {
  const table = new Map<string, EvalEntry>([[here, { score: { cp: position }, depth: 20, source: 'baked' }]]);
  for (const [uci, cp] of Object.entries(scores)) {
    table.set(after(uci), { score: { cp }, depth: 20, source: 'baked', pv: ['h7h6', 'g5f3', 'g8f6', 'd2d3'] });
  }
  return (epd) => table.get(epd) ?? null;
}

const facts = (more: Partial<JudgeFacts>): JudgeFacts => ({
  expected: [{ uci: 'c2c3' }],
  evalOf: evals({ c2c3: 30, f3g5: -60, e1g1: 25, d2d4: -10 }),
  config,
  ...more,
});

const known = (judgement: ReturnType<typeof judgeMove>) => {
  if (judgement.status !== 'known') throw new Error('expected a verdict');
  return judgement.verdict;
};

describe('judgeMove', () => {
  it('calls the opening’s own move Book', () => {
    expect(known(judgeMove(here, 'c2c3', facts({}))).grade).toBe('book');
  });

  it('takes the author’s grade and refutation first', () => {
    const verdict = known(
      judgeMove(
        here,
        'f3g5',
        facts({ refutations: [{ uci: 'f3g5', note: { text: 'Too early.', nag: [2] }, then: [{ uci: 'g8h6' }] }] }),
      ),
    );
    expect(verdict).toMatchObject({
      grade: 'mistake',
      source: 'author',
      refutation: ['g8h6'],
      note: { text: 'Too early.' },
    });
    expect(verdict.cost?.cp).toBe(90);
  });

  it('grades from the drop in winning chances when the author says nothing', () => {
    const verdict = known(judgeMove(here, 'f3g5', facts({})));
    expect(verdict.grade).toBe('inaccuracy');
    expect(verdict.refutation).toEqual(['h7h6', 'g5f3', 'g8f6', 'd2d3']);
  });

  it('marks a sound move that is not the line’s as off the repertoire', () => {
    const verdict = known(judgeMove(here, 'e1g1', facts({})));
    expect(verdict).toMatchObject({ grade: 'best', offRepertoire: true });
    expect(verdict.costVsLine?.cp).toBe(5);
  });

  it('asks for the evaluations it is missing', () => {
    const judgement = judgeMove(here, 'b1c3', facts({}));
    expect(judgement).toEqual({ status: 'needs', epds: [after('b1c3')] });
  });

  it('calls a weak reply to the opponent’s blunder a Miss', () => {
    const verdict = known(judgeMove(here, 'f3g5', facts({ previous: { grade: 'blunder', side: 'black' } })));
    expect(verdict.grade).toBe('miss');
  });

  it('says how often a move is played and whether it is a common mistake', () => {
    const verdict = known(
      judgeMove(
        here,
        'd2d4',
        facts({
          evalOf: evals({ c2c3: 30, d2d4: -200 }),
          counts: { games: 1000, moves: [{ uci: 'd2d4', games: 250 }] },
        }),
      ),
    );
    expect(verdict).toMatchObject({ grade: 'blunder', share: 0.25, common: true });
  });
});

describe('judgeDeviation', () => {
  it.each([
    [40, 30, 'kept'],
    [40, -150, 'gave away'],
    [0, 300, 'gained'],
  ] as const)('from %i to %i is %s for White', (from, to, outcome) => {
    expect(judgeDeviation({ cp: from }, { cp: to }, 'white', 0.1)).toBe(outcome);
  });
});
