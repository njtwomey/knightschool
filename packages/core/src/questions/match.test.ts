import { describe, expect, it } from 'vitest';
import { answerWords, matchAnswer } from './match';

describe('answerWords', () => {
  it.each([
    ['Nxe5', ['knight', 'take', 'e5']],
    ['6.Nxe5!', ['knight', 'take', 'e5']],
    ['the knight takes on e5', ['knight', 'take', 'e5']],
    ['Knight captures e5', ['knight', 'take', 'e5']],
    ['exd5', ['take', 'd5']],
    ['Bxf7+', ['bishop', 'take', 'f7', 'check']],
    ['Nd5#', ['knight', 'd5', 'mate']],
    ['O-O', ['castle']],
    ['0-0-0', ['castle', 'queenside']],
    ['nf3', ['knight', 'f3']],
    ['bxc3', ['take', 'c3']],
    ['Bxc3', ['bishop', 'take', 'c3']],
    ['e8=Q', ['e8', 'promote', 'queen']],
    ['Prépares the centre', ['prepare', 'centre']],
    ["it's the bishop's diagonal", ['bishop', 'diagonal']],
    ['pieces, pawns.', ['piece', 'pawn']],
  ])('%s', (text, words) => expect(answerWords(text)).toEqual(words));
});

describe('matchAnswer', () => {
  const nxe5 = [
    ['Nxe5', 'mate'],
    ['queen', 'sacrifice|offer|gives'],
  ];
  it.each([
    // keywords all present, in either group
    ['Nxe5 and if he takes the queen it is mate', nxe5, true],
    ['knight takes e5, Bxd1 walks into checkmate', nxe5, true],
    ['White gives up the queen', nxe5, true],
    ['White offers his queen', nxe5, true],
    // a missing keyword
    ['Nxe5 wins a pawn', nxe5, false],
    ['the knight goes to e5', nxe5, false],
    // small slips on long words, none on short ones or squares
    ['Nxe5 then checkmaet', nxe5, true],
    ['Nxe5 and mat', nxe5, false],
    ['Nxe4 and mate', nxe5, false],
    // synonyms and spelling
    [['Prepares d4'].join(), [['prepare', 'd4']], true],
    ['so the pawn can go to d4 when ready', [['prepare', 'd4']], true],
    ['controls the center', [['centre']], true],
    ['protects e4', [['defend', 'e4']], true],
    ['guards the e4 pawn', [['defend', 'e4']], true],
    // phrases must appear in a row
    ['takes on f7', [['takes f7']], true],
    ['f7 takes', [['takes f7']], false],
    // empty
    ['', nxe5, false],
  ] as const)('%s', (text, answers, expected) =>
    expect(matchAnswer(text, answers as unknown as string[][])).toBe(expected),
  );
});
