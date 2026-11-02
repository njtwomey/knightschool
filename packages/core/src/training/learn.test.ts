import { describe, expect, it } from 'vitest';
import { playMove } from '../chess/play';
import { buildOpening } from '../content/build-opening';
import type { OpeningFacts } from '../content/facts';
import { readLine } from '../content/line-pgn';
import { OpeningFile } from '../content/schema';
import { resolveLines } from '../content/theory';
import { siteConfig } from '../testing/site-config';
import { opponentMistakes } from './mistakes';
import { START_EPD as START } from '../chess/epd';
import { followUpGain, followUpId, followUps, gainWords } from './follow-ups';

const playMoves = (epd: string, ucis: string[]) => ucis.reduce((at, uci) => playMove(at, uci)!.epd, epd);

describe('the opponent’s mistakes', () => {
  const main = readLine(
    'main',
    '[For "white"]\n[Kind "main"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 (4... h6 $2 { Too slow. } 5. d4) 5. d3 d6 *',
  );
  const opening = buildOpening(
    'italian',
    OpeningFile.parse({
      name: 'Italian',
      side: 'white',
      start: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
      level: 'first',
      summary: 'S.',
      about: { idea: 'I.', risks: 'R.', suits: 'S.' },
      variations: [{ id: 'v', lines: ['main'] }],
    }),
    resolveLines([main]),
    siteConfig.teach.stepMoves,
  );
  const start = opening.startEpd;
  const after = (uci: string) => playMove(start, uci)!.epd;
  const facts: OpeningFacts = {
    evals: {
      [start]: { depth: 20, lines: [{ cp: 30, pv: ['f8c5'] }] },
      [after('f8c5')]: { depth: 20, lines: [{ cp: 30, pv: ['c2c3'] }] },
      [after('f7f5')]: { depth: 20, lines: [{ cp: 350, pv: ['d2d3', 'f5e4'] }] },
      [after('a7a6')]: { depth: 20, lines: [{ cp: 60, pv: ['d2d3'] }] },
      [after('g7g5')]: { depth: 20, lines: [{ cp: 400, pv: ['f3g5'] }] },
    },
    counts: {
      [start]: {
        games: 1000,
        moves: [
          { uci: 'f8c5', san: 'Bc5', games: 600 },
          { uci: 'f7f5', san: 'f5', games: 200 },
          { uci: 'a7a6', san: 'a6', games: 150 },
          // A blunder, but too rare to be common (under coverage.minShare).
          { uci: 'g7g5', san: 'g5', games: 20 },
        ],
      },
    },
  };
  const config = { ...siteConfig.judge, ...siteConfig.coverage };
  const afterC3 = Object.entries(opening.positions).find(([, node]) => node.refutations?.length)![0];

  it('finds the band’s common mistakes, with the engine’s punishment, most common first', () => {
    const found = opponentMistakes(opening, [start], facts, config);
    expect(found.map((m) => [m.san, m.punish, m.authored])).toEqual([['f5', 'd2d3', false]]);
    expect(found[0]!.share).toBeCloseTo(0.2);
    expect(['mistake', 'blunder']).toContain(found[0]!.grade);
    expect(found[0]!.then).toEqual(['f5e4']);
  });

  it('takes the author’s refutations, with their note and the written punishment', () => {
    const found = opponentMistakes(opening, [afterC3], facts, config);
    expect(found.map((m) => [m.san, m.punish, m.authored, m.note?.text])).toEqual([['h6', 'd2d4', true, 'Too slow.']]);
  });

  it('never counts the opening’s own moves, nor positions where the learner moves', () => {
    const afterBc5 = after('f8c5');
    expect(opponentMistakes(opening, [afterBc5], facts, config)).toEqual([]);
    expect(opponentMistakes(opening, [start], undefined, config)).toEqual([]);
  });

  it('makes each mistake a follow-up of the step whose stretch reaches it, with the punishment as a card', () => {
    const found = followUps(opening, facts, { ...config, minShare: siteConfig.coverage.minShare });
    expect(found.map((f) => [f.mistake.san, f.step, f.index])).toEqual([
      ['f5', opening.steps[0]!.id, 0],
      ['h6', opening.steps[0]!.id, 1],
    ]);
    expect(found[0]!.id).toBe(followUpId(start, 'f7f5'));
    expect(found[0]!.line).toEqual(['f7f5', 'd2d3', 'f5e4']);
    expect(found[0]!.cards).toEqual([{ id: `move:${after('f7f5')}:d2d3`, epd: after('f7f5'), uci: 'd2d3' }]);
    expect(found[1]!.cards.map((card) => card.uci)).toEqual(['d2d4']);
    expect(found[0]!.ply).toBe(opening.startPly);
  });

  it('has no follow-ups without facts or refutations', () => {
    const plain = buildOpening(
      'plain',
      OpeningFile.parse({
        name: 'Italian',
        side: 'white',
        start: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
        level: 'first',
        summary: 'S.',
        about: { idea: 'I.', risks: 'R.', suits: 'S.' },
        variations: [{ id: 'v', lines: ['main'] }],
      }),
      resolveLines([readLine('main', '[For "white"]\n[Kind "main"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 *')]),
      siteConfig.teach.stepMoves,
    );
    expect(followUps(plain, undefined, { ...config, minShare: siteConfig.coverage.minShare })).toEqual([]);
  });
});

describe('what a follow-up wins', () => {
  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. h3 Bh5: the Legal Mate.
  const legal = playMoves(START, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'd7d6', 'b1c3', 'c8g4', 'h2h3', 'g4h5']);
  it('counts material won by kind, and says it in words', () => {
    // 6.Nxe5 Bxd1?? 7.Bxf7+ Ke7 8.Nd5#: the line ends in mate.
    const mate = followUpGain(
      { mistake: { epd: legal } as never, line: ['f3e5', 'h5d1', 'c4f7', 'e8e7', 'c3d5'] },
      'white',
    );
    expect(mate.mate).toBe(true);
    expect(gainWords(mate)).toBe('mates');
    // 6.Nxe5 dxe5 7.Qxh5: a bishop and a pawn for a knight.
    const material = followUpGain({ mistake: { epd: legal } as never, line: ['f3e5', 'd6e5', 'd1h5'] }, 'white');
    expect(material.pieces).toEqual({ b: 1, n: -1, p: 1 });
    expect(gainWords(material)).toBe('wins a bishop and a pawn for a knight');
  });

  it('says nothing when nothing is won', () => {
    const quiet = followUpGain({ mistake: { epd: legal } as never, line: ['e1g1', 'g8f6'] }, 'white');
    expect(quiet.pieces).toEqual({});
    expect(gainWords(quiet)).toBeNull();
  });
});

describe('a written refutation', () => {
  const main = readLine(
    'main',
    '[For "white"]\n[Kind "main"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 (4... h6 $2 { Too slow. } 5. d4 { Takes the centre. } exd4 6. cxd4) 5. d3 *',
  );
  const opening = buildOpening(
    'notes',
    OpeningFile.parse({
      name: 'Italian',
      side: 'white',
      start: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
      level: 'first',
      summary: 'S.',
      about: { idea: 'I.', risks: 'R.', suits: 'S.' },
      variations: [{ id: 'v', lines: ['main'] }],
    }),
    resolveLines([main]),
    siteConfig.teach.stepMoves,
  );
  it('keeps the note on every move of the punishing line, and the follow-up carries them', () => {
    const refutation = Object.values(opening.positions).flatMap((node) => node.refutations ?? [])[0]!;
    expect(refutation.then.map((move) => move.note?.text)).toEqual(['Takes the centre.', undefined, undefined]);
    const [followUp] = followUps(opening, undefined, {
      ...siteConfig.judge,
      ...siteConfig.coverage,
      minShare: siteConfig.coverage.minShare,
    });
    expect(followUp!.notes.map((note) => note?.text)).toEqual(['Too slow.', 'Takes the centre.', undefined, undefined]);
    expect(followUp!.cards.map((card) => card.uci)).toEqual(['d2d4', 'c3d4']);
  });
});
