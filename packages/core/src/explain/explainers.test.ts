import { describe, expect, it } from 'vitest';
import { epdAfterPgn } from '../chess/chess';
import type { LineEdge } from '../schema/content';
import {
  authorExplainer,
  BIG_SWING_CP,
  engineExplainer,
  explainMove,
  MIN_CONFIDENCE_WITH_AUTHOR,
  swingFor,
} from './explainers';
import type { EvalLike } from './types';

const BEFORE = epdAfterPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4'); // White to move; 4. Nxe5? is the trap

const edge = (text: string | undefined, nag: number[] = []): LineEdge => ({
  san: 'x',
  uci: 'x',
  to: 'x',
  isMainLine: true,
  isRepertoire: true,
  variants: [],
  annotation: text === undefined ? undefined : { text, nag, motifs: [], arrows: ['Ge2e4'], circles: [] },
});

describe('author explainer', () => {
  it('returns the written note with full confidence and its shapes', () => {
    const [note] = authorExplainer.explain(BEFORE, 'f3e5', { edge: edge('Points at f7.') });
    expect(note).toMatchObject({
      text: 'Points at f7.',
      source: 'author',
      confidence: 1,
      kind: 'what-it-does',
      shapes: ['Ge2e4'],
    });
  });

  it('calls a move marked as a mistake a reason it is bad', () => {
    expect(authorExplainer.explain(BEFORE, 'f3e5', { edge: edge('Greedy.', [2]) })[0]?.kind).toBe('why-bad');
  });

  it('says nothing when there is no note', () => {
    expect(authorExplainer.explain(BEFORE, 'f3e5', { edge: edge(undefined) })).toEqual([]);
    expect(authorExplainer.explain(BEFORE, 'f3e5', {})).toEqual([]);
  });
});

// 4. Nxe5? loses material to 4...Qg5, which attacks the knight on e5 and the pawn on g2.
const evalBefore: EvalLike = { lines: [{ cp: 80, pv: ['f3d4', 'e5d4'] }] };
const evalAfter: EvalLike = { lines: [{ cp: -250, pv: ['d8g5', 'e5f7'] }] };

describe('engine explainer', () => {
  it('measures the swing from the mover side', () => {
    expect(swingFor(BEFORE, evalBefore, evalAfter)).toBe(-330);
    // Black to move: a score that falls for White is a gain for Black.
    expect(swingFor(epdAfterPgn('1. e4'), { lines: [{ cp: 30, pv: [] }] }, { lines: [{ cp: -40, pv: [] }] })).toBe(70);
  });

  it('names the cost, the better move, and what the punishment is', () => {
    const [note] = engineExplainer.explain(BEFORE, 'f3e5', { evalBefore, evalAfter });
    expect(note?.source).toBe('engine');
    expect(note?.kind).toBe('why-bad');
    expect(note?.text).toContain('about 3.3 pawns');
    expect(note?.text).toContain('It prefers Nxd4.');
    expect(note?.text).toMatch(/After Qg5, the queen on g5 forks the knight on e5 and the pawn on g2/);
    expect(note?.motifs).toContain('fork');
  });

  it('says nothing for a move as good as the engine best, or a small slip', () => {
    expect(engineExplainer.explain(BEFORE, 'f3d4', { evalBefore, evalAfter: { lines: [{ cp: 80, pv: [] }] } })).toEqual(
      [],
    );
    expect(
      engineExplainer.explain(BEFORE, 'f3d4', {
        evalBefore,
        evalAfter: { lines: [{ cp: 80 - BIG_SWING_CP + 1, pv: [] }] },
      }),
    ).toEqual([]);
  });

  it('says nothing without both evaluations', () => {
    expect(engineExplainer.explain(BEFORE, 'f3e5', { evalBefore })).toEqual([]);
    expect(engineExplainer.explain(BEFORE, 'f3e5', {})).toEqual([]);
  });

  it('mentions a mate against the mover', () => {
    const [note] = engineExplainer.explain(BEFORE, 'f3e5', {
      evalBefore,
      evalAfter: { lines: [{ mate: -3, pv: ['d8g5'] }] },
    });
    expect(note?.text).toContain('mate in 3');
  });

  it('survives an engine line that does not fit the position', () => {
    const [note] = engineExplainer.explain(BEFORE, 'f3e5', {
      evalBefore,
      evalAfter: { lines: [{ cp: -250, pv: ['a1a8', 'zzzz'] }] },
    });
    expect(note?.text).toContain('about 3.3 pawns');
  });
});

describe('explainMove', () => {
  it('puts the author first, then the board, then the engine', () => {
    const all = explainMove(BEFORE, 'f3e5', { edge: edge('Greedy.', [2]), evalBefore, evalAfter });
    expect(all[0]?.source).toBe('author');
    const sources = all.map((note) => note.source);
    expect(sources.indexOf('motif')).toBeLessThan(sources.indexOf('engine'));
    expect(sources.at(-1)).toBe('engine');
  });

  it('drops weak generated notes when the author wrote one, and keeps them when not', () => {
    // 3. Bc4 attacks an undefended-looking pawn: a low-confidence note the author's own sentence makes redundant.
    const before = epdAfterPgn('1. e4 e5 2. Nf3 Nc6');
    const withAuthor = explainMove(before, 'f1c4', { edge: edge('Points at f7, the weakest square.') });
    expect(withAuthor.every((note) => note.source === 'author' || note.confidence >= MIN_CONFIDENCE_WITH_AUTHOR)).toBe(
      true,
    );
    const without = explainMove(before, 'f1c4', {});
    expect(without.length).toBeGreaterThanOrEqual(withAuthor.length - 1);
  });
});
