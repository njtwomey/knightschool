import { describe, expect, it } from 'vitest';
import { buildOpening, type BuiltOpening } from '../content/build-opening';
import { readLine } from '../content/line-pgn';
import { OpeningFile } from '../content/schema';
import { resolveLines } from '../content/theory';
import { drillBranches, drillScope, scopePositions } from '../sessions/drill';
import { siteConfig } from '../testing/site-config';
import { moveCards } from './cards';
import {
  chosenScope,
  chosenSteps,
  parsePick,
  pickedOpenings,
  setSteps,
  stepPick,
  tickState,
  toggleSteps,
  variationPick,
  withoutOpening,
} from './repertoire';

const line = (id: string, moves: string) => readLine(id, `[For "white"]\n[Kind "main"]\n\n${moves} *`);

const opening: BuiltOpening = buildOpening(
  'italian',
  OpeningFile.parse({
    name: 'Italian',
    side: 'white',
    start: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    level: 'first',
    summary: 'S.',
    about: { idea: 'I.', risks: 'R.', suits: 'S.' },
    variations: [
      { id: 'quiet', lines: ['main', 'side'] },
      { id: 'sharp', lines: ['knights'] },
    ],
  }),
  resolveLines([
    line('main', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. Bb3 Ba7 9. h3 h6'),
    line('side', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 d6 5. d4'),
    line('knights', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. c3'),
  ]),
  siteConfig.teach.stepMoves,
);
const ids = (variation: string) => opening.steps.filter((step) => step.variation === variation).map((step) => step.id);

describe('picks', () => {
  it('reads each kind, and a step id with a colon and slashes in it', () => {
    expect(parsePick('italian')).toEqual({ opening: 'italian' });
    expect(parsePick(variationPick('italian', 'quiet'))).toEqual({ opening: 'italian', variation: 'quiet' });
    expect(parsePick(stepPick('italian', 'main:1'))).toEqual({ opening: 'italian', step: 'main:1' });
    expect(parsePick('step:')).toBeNull();
    expect(parsePick('')).toBeNull();
  });

  it('lists the openings touched, once each', () => {
    expect(pickedOpenings(['a', stepPick('b', 'x:1'), variationPick('b', 'y')])).toEqual(['a', 'b']);
  });

  it('resolves an opening, a variation and a step to steps in path order', () => {
    expect(chosenSteps(opening, ['italian']).map((step) => step.id)).toEqual(opening.steps.map((step) => step.id));
    expect(chosenSteps(opening, [variationPick('italian', 'sharp')]).map((step) => step.id)).toEqual(ids('sharp'));
    expect(chosenSteps(opening, [stepPick('italian', 'main:1')]).map((step) => step.id)).toEqual(['main:1']);
    expect(chosenSteps(opening, ['other', stepPick('other', 'main:1')])).toEqual([]);
  });

  it('widens a step a recut has removed to the steps of its line', () => {
    const steps = chosenSteps(opening, [stepPick('italian', 'main:99')]);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((step) => step.line === 'main')).toBe(true);
  });

  it('drops a pick for a variation that has gone', () => {
    expect(chosenSteps(opening, [variationPick('italian', 'gone')])).toEqual([]);
  });
});

describe('ticking', () => {
  it('says how much of a group is chosen', () => {
    const chosen = new Set(['a']);
    expect(tickState(chosen, ['b'])).toBe('none');
    expect(tickState(chosen, ['a', 'b'])).toBe('some');
    expect(tickState(chosen, ['a'])).toBe('all');
  });

  it('keeps the smallest form: a whole variation, then the whole opening', () => {
    const quiet = toggleSteps(opening, [], ids('quiet'));
    expect(quiet).toEqual([variationPick('italian', 'quiet')]);
    expect(toggleSteps(opening, quiet, ids('sharp'))).toEqual(['italian']);
  });

  it('turns a partly ticked group on, then off', () => {
    const one = toggleSteps(opening, [], [ids('quiet')[0]!]);
    expect(one).toEqual([stepPick('italian', ids('quiet')[0]!)]);
    const all = toggleSteps(opening, one, ids('quiet'));
    expect(all).toEqual([variationPick('italian', 'quiet')]);
    expect(toggleSteps(opening, all, ids('quiet'))).toEqual([]);
  });

  it('takes one step off a whole opening', () => {
    const off = setSteps(opening, ['italian'], ids('sharp'), false);
    expect(off).toEqual([variationPick('italian', 'quiet')]);
  });

  it('leaves other openings alone', () => {
    const picks = toggleSteps(opening, ['london', stepPick('caro', 'a:1')], ids('sharp'));
    expect(picks).toEqual(['london', stepPick('caro', 'a:1'), variationPick('italian', 'sharp')]);
    expect(withoutOpening(picks, 'italian')).toEqual(['london', stepPick('caro', 'a:1')]);
  });
});

describe('what the picks hold', () => {
  it('holds the move cards of its steps', () => {
    const scope = chosenScope(opening, [variationPick('italian', 'sharp')]);
    const taught = moveCards(opening).filter((card) => ids('sharp').includes(card.step));
    expect(taught.length).toBeGreaterThan(0);
    expect([...scope.cards]).toEqual(taught.map((card) => card.id));
  });

  it('brings a step’s follow-ups with it', () => {
    const step = opening.steps.find((candidate) => candidate.line === 'side')!;
    const card = { id: 'move:x:e2e4', epd: 'x', uci: 'e2e4' };
    const withFollowUp = {
      ...opening,
      followUps: [{ id: 'f', step: step.id, index: 0, ply: 7, mistake: {}, line: [], cards: [card], notes: [] }],
    } as unknown as BuiltOpening;
    expect(chosenScope(withFollowUp, [stepPick('italian', step.id)]).cards.has(card.id)).toBe(true);
    expect(chosenScope(withFollowUp, [variationPick('italian', 'sharp')]).cards.has(card.id)).toBe(false);
  });

  it('sets no limit on a drill when every step is chosen', () => {
    expect(chosenScope(opening, ['italian']).ends).toBeUndefined();
  });

  it('limits a drill to the chosen lines, walking them from the start', () => {
    const { ends, lines } = chosenScope(opening, [variationPick('italian', 'sharp')]);
    expect([...lines]).toEqual(['knights']);
    const scope = drillScope(opening, undefined, { ends: ends! });
    expect(Object.values(scope.replies).flat()).toEqual(['g8f6', 'f8c5']);
    expect(drillBranches(opening, scope).length).toBe(1);
  });

  it('stops a drill at the last chosen step of a line', () => {
    const first = opening.steps.find((step) => step.line === 'main' && step.id !== 'setup')!;
    const { ends } = chosenScope(opening, [stepPick('italian', first.id)]);
    const positions = scopePositions(drillScope(opening, undefined, { ends: ends! }));
    const whole = scopePositions(drillScope(opening, 'quiet'));
    expect(positions.length).toBeGreaterThan(0);
    expect(positions.length).toBeLessThan(whole.length);
  });
});
