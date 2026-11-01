import {
  autoGrade,
  createScheduler,
  judgeMove,
  moveCardId,
  playMove,
  reduceAttempt,
  startAttempt,
  type Attempt,
  type EvalEntry,
  type Verdict,
} from '@knightschool/core';
import type { BuiltOpening, BuiltStep, OpeningFacts } from '@knightschool/core/content';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardBadge, SystemArrow } from '@/components/board/board-surface';
import type { Feedback } from '@/components/board/board-feedback';
import type { Try as TryRow } from '@/components/chess/tries-table';
import { startEngine } from '@/data/engine/store';
import { learnerStore } from '@/data/learner';
import { siteConfig } from '@/data/site-config';
import { stepMoves, type LineMove } from './model';

const scheduler = createScheduler(siteConfig.schedule);
const newId = () => crypto.randomUUID();

type Phase = 'playing' | 'done';

/**
 * The Try stage of a step: the learner plays their moves without help; the opponent answers by itself. Each move is
 * judged (docs/v2/library/judge.md): Book goes on, a sound move that is not the line's asks again without using a try,
 * a wrong one snaps back with why. Every try is kept; each answer is graded and scheduled (FSRS) and logged.
 */
export function useTry(opening: BuiltOpening, step: BuiltStep, facts: OpeningFacts | undefined) {
  const { moves } = useMemo(() => stepMoves(opening, step), [opening, step]);
  const [index, setIndex] = useState(0); // the next move of `moves` to be played
  const [attempt, setAttempt] = useState<Attempt>(startAttempt);
  const [tries, setTries] = useState<TryRow[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [badge, setBadge] = useState<BoardBadge | undefined>();
  const [arrows, setArrows] = useState<SystemArrow[]>([]);
  const [phase, setPhase] = useState<Phase>('playing');
  const started = useRef(Date.now());
  const live = useRef(new Map<string, EvalEntry>());
  const session = useRef(newId());

  const evalOf = useCallback(
    (epd: string): EvalEntry | null => {
      const baked = facts?.evals[epd];
      if (baked?.lines[0]) {
        const best = baked.lines[0];
        const score = best.mate !== undefined ? { mate: best.mate } : { cp: best.cp ?? 0 };
        return { score, depth: baked.depth, source: 'baked', pv: best.pv };
      }
      return live.current.get(epd) ?? null;
    },
    [facts],
  );

  const judge = useCallback(
    (move: LineMove, uci: string): Verdict | 'needs' => {
      const position = opening.positions[move.before];
      const judgement = judgeMove(move.before, uci, {
        expected: [{ uci: move.uci }],
        refutations: position?.refutations?.map((r) => ({ uci: r.uci, note: r.note, then: r.then })),
        evalOf,
        counts: facts?.counts[move.before],
        config: { ...siteConfig.judge, ...siteConfig.coverage },
      });
      return judgement.status === 'known' ? judgement.verdict : 'needs';
    },
    [opening, evalOf, facts],
  );

  /** Asks the browser engine for positions the shipped facts lack, then fills in the try's grade. */
  const evaluateLive = useCallback(async (epds: string[], onDone: () => void) => {
    const engine = await startEngine();
    for (const epd of epds) {
      if (live.current.has(epd)) continue;
      const result = await engine.evaluate(epd, { depth: siteConfig.engine.liveDepth, multipv: 1 });
      const best = result.lines[0];
      if (best) live.current.set(epd, { score: best.score, depth: result.depth, source: 'live', pv: best.pv });
    }
    onDone();
  }, []);

  const record = useCallback(async (move: LineMove, done: Attempt) => {
    const store = await learnerStore();
    const id = moveCardId(move.before, move.uci);
    const now = new Date();
    const card = (await store.cards.get(id)) ?? scheduler.newCard(id, now);
    const rating = autoGrade(done, siteConfig.judge.easyWithinMs);
    await store.cards.put(scheduler.review(card, rating, now));
    const ms = done.tries.reduce((sum, one) => sum + one.ms, 0);
    await store.reviews.add({ id: newId(), cardId: id, at: now.toISOString(), rating, ms, hint: done.hint });
    await store.attempts.add({
      id: newId(),
      at: now.toISOString(),
      session: session.current,
      mode: 'try',
      ref: id,
      result: done.shown ? 'shown' : done.tries.some((one) => one.outcome === 'wrong') ? 'wrong' : 'right',
      tries: done.tries,
      ms,
      hint: done.hint,
      shown: done.shown,
    });
  }, []);

  // The opponent's moves play themselves, after the configured pause.
  useEffect(() => {
    const move = moves[index];
    if (phase !== 'playing') return;
    if (!move) {
      setPhase('done');
      return;
    }
    if (move.mine) return;
    const timer = setTimeout(() => {
      setIndex((i) => i + 1);
      started.current = Date.now();
    }, siteConfig.timing.opponent);
    return () => clearTimeout(timer);
  }, [index, moves, phase]);

  const advance = (move: LineMove, done: Attempt) => {
    void record(move, done);
    setAttempt(startAttempt());
    setArrows([]);
    setIndex((i) => i + 1);
    started.current = Date.now();
  };

  const play = (from: string, to: string): boolean => {
    const move = moves[index];
    if (!move?.mine || phase !== 'playing') return false;
    const played = playMove(move.before, from + to) ?? playMove(move.before, `${from}${to}q`);
    if (!played) return false;
    const ms = Date.now() - started.current;
    const verdict = played.uci === move.uci ? null : judge(move, played.uci);
    const outcome =
      played.uci === move.uci ? 'right' : verdict !== 'needs' && verdict?.offRepertoire ? 'another' : 'wrong';
    const next = reduceAttempt(
      attempt,
      { type: 'try', uci: played.uci, ms, outcome },
      siteConfig.teach.triesBeforeShown,
    );
    const row: TryRow = {
      ply: move.ply,
      asked: move.san,
      played: played.san,
      grade: outcome === 'right' ? 'book' : verdict && verdict !== 'needs' ? verdict.grade : 'inaccuracy',
      costCp:
        outcome === 'right'
          ? 0
          : verdict && verdict !== 'needs'
            ? Math.round(verdict.costVsLine?.cp ?? verdict.cost?.cp ?? 0)
            : null,
      drop:
        outcome === 'right'
          ? 0
          : verdict && verdict !== 'needs'
            ? (verdict.costVsLine?.drop ?? verdict.cost?.drop ?? 0)
            : null,
      ms,
      hint: attempt.hint,
    };
    const rowIndex = tries.length;
    setTries((rows) => [...rows, row]);
    const where = { ply: move.ply, san: played.san, from, to };
    if (outcome === 'right') {
      setFeedback({ kind: 'right', ...where, grade: 'book', comment: move.note?.text });
      setBadge({ square: to, kind: 'right' });
      advance(move, next);
      return true;
    }
    if (verdict === 'needs') {
      // Not in the shipped facts: show the cross now, fill in the grade when the browser engine answers.
      const after = played.epd;
      void evaluateLive([move.before, after, move.after], () => {
        const settled = judge(move, played.uci);
        if (settled === 'needs') return;
        setTries((rows) =>
          rows.map((r, i) =>
            i === rowIndex
              ? { ...r, grade: settled.grade, costCp: Math.round(settled.cost?.cp ?? 0), drop: settled.cost?.drop ?? 0 }
              : r,
          ),
        );
      });
    }
    if (outcome === 'another') {
      setFeedback({
        kind: 'alternative',
        ...where,
        grade: (verdict as Verdict).grade,
        lineMove: move.san,
        linePly: move.ply,
      });
      setBadge(undefined);
    } else {
      const settled = verdict && verdict !== 'needs' ? verdict : null;
      setFeedback({
        kind: 'wrong',
        ...where,
        grade: settled?.grade ?? 'inaccuracy',
        costCp: settled?.cost ? Math.round(settled.cost.cp) : undefined,
        authorNote: settled?.note?.text,
        refutation: settled?.refutation?.length ? replayRun(played.epd, settled.refutation, move.ply + 1) : undefined,
      });
      setBadge({ square: to, kind: 'wrong' });
    }
    setAttempt(next);
    if (next.shown) {
      setArrows([{ from: move.uci.slice(0, 2), to: move.uci.slice(2, 4), kind: 'play' }]);
      setTimeout(() => advance(move, next), siteConfig.timing.wrongBadge * 1.5);
    }
    return false;
  };

  const hint = () => setAttempt((a) => reduceAttempt(a, { type: 'hint' }, siteConfig.teach.triesBeforeShown));
  const show = () => {
    const move = moves[index];
    if (!move?.mine) return;
    const next = reduceAttempt(attempt, { type: 'show' }, siteConfig.teach.triesBeforeShown);
    setAttempt(next);
    setArrows([{ from: move.uci.slice(0, 2), to: move.uci.slice(2, 4), kind: 'play' }]);
    setTimeout(() => advance(move, next), siteConfig.timing.wrongBadge * 1.5);
  };

  const current = moves[Math.min(index, moves.length) - 1];
  const asking = moves[index];
  return {
    moves,
    index,
    epd: current ? current.after : (moves[0]?.before ?? opening.startEpd),
    lastMove: current ? { from: current.uci.slice(0, 2), to: current.uci.slice(2, 4) } : undefined,
    asking: asking?.mine && phase === 'playing' ? asking : undefined,
    hintSquare: attempt.hint && asking ? asking.uci.slice(0, 2) : undefined,
    attempt,
    tries,
    feedback,
    badge,
    arrows,
    phase,
    play,
    hint,
    show,
  };
}

function replayRun(epd: string, ucis: readonly string[], firstPly: number) {
  const out: { san: string; uci: string; after: string }[] = [];
  let at = epd;
  for (const uci of ucis) {
    const played = playMove(at, uci);
    if (!played) break;
    out.push({ san: played.san, uci: played.uci, after: played.epd });
    at = played.epd;
  }
  void firstPly;
  return out;
}
