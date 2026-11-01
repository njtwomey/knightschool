import { describe, expect, it } from 'vitest';
import { buildQuestions, movetextSans, type QuestionEntry } from './questions';

const question = (over: Partial<QuestionEntry> = {}): QuestionEntry => ({
  id: 'why-c3',
  at: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3',
  ask: 'What does 4.c3 prepare?',
  answers: [['d4']],
  examples: { right: ['it prepares d4'], wrong: ['it attacks the bishop'] },
  explain: 'With a pawn on c3, d4 takes the centre and hits the bishop.',
  ...over,
});

describe('movetextSans', () => {
  it('drops move numbers and a result', () => {
    expect(movetextSans('1. e4 e5 2. Nf3 Nc6 3... Nf6 *')).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Nf6']);
  });
});

describe('buildQuestions', () => {
  it('replays the position and keeps what the app needs', () => {
    const [built] = buildQuestions('italian', [{ id: 'piano', questions: [question()] }]);
    expect(built).toMatchObject({
      id: 'why-c3',
      variation: 'piano',
      sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3'],
    });
    expect(built!.moves.at(-1)).toBe('c2c3');
    expect(built!.epd.split(' ')[1]).toBe('b');
    expect(built).not.toHaveProperty('examples');
  });

  it.each([
    [{ at: '1. e4 e5 2. Ke3' }, /"Ke3" \(move 3 of "at"\) is not legal/],
    [{ examples: { right: ['it attacks f7'], wrong: [] } }, /right example "it attacks f7" is not accepted/],
    [{ examples: { right: ['d4'], wrong: ['so d4 can follow'] } }, /wrong example "so d4 can follow" is accepted/],
  ])('fails the build with a clear message: %o', (over, message) => {
    expect(() => buildQuestions('italian', [{ id: 'piano', questions: [question(over)] }])).toThrow(message);
  });

  it('refuses a question id used twice', () => {
    expect(() =>
      buildQuestions('italian', [
        { id: 'a', questions: [question()] },
        { id: 'b', questions: [question()] },
      ]),
    ).toThrow(/listed twice/);
  });
});
