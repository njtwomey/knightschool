import {
  autoGrade,
  createScheduler,
  exerciseOver,
  expectedMove,
  gradeMove,
  judgeMove,
  moveCardId,
  playMove,
  popularReply,
  reduceAttempt,
  scriptedMove,
  sideToMove,
  startAttempt,
  type Attempt,
  type EvalEntry,
  type Exercise,
  type Verdict,
} from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardBadge, SystemArrow } from '@/components/board/board-surface';
import type { Feedback } from '@/components/board/board-feedback';
import type { Try as TryRow } from '@/components/chess/tries-table';
import { startEngine } from '@/data/engine/store';
import { learnerStore } from '@/data/learner';
import type { AttemptRow } from '@/data/learner-store';
import { siteConfig } from '@/data/site-config';

const scheduler = createScheduler(siteConfig.schedule);
const newId = () => crypto.randomUUID();

export type SessionOptions = {
  exercises: readonly Exercise[];
  /** The opening the exercises come from: its book replies (for the popular responder), refutations and comments. */
  opening?: BuiltOpening;
  facts?: OpeningFacts;
  /**
   * What is saved: `moves` schedules each learner move as a card (Try, Drill, Review of moves); `exercise` schedules
   * the exercise as one card (a puzzle); `none` is free practice, never saved (docs/v2/pages/practice.md).
   */
  save: 'moves' | 'exercise' | 'none';
  /**
   * Overrides of the base delays in milliseconds (config `timing`): Speed has the other side answer at once
   * (`opponent: 0`) and moves straight on to the next line (`next: 0`).
   */
  delays?: { opponent?: number; next?: number };
};

export type ExerciseResult = {
  id: string;
  right: boolean;
  tries: number;
  hint: boolean;
  shown: boolean;
  ms: number;
  /** Where it started and the moves played (UCI, both sides), for a page that shows or judges the game afterwards. */
  start: string;
  moves: string[];
  /** Every try of the exercise, for a page that writes its own attempt row (Play on). */
  attempt: Attempt;
};

type Played = { uci: string; san: string; epd: string; mine: boolean };

/**
 * Runs exercises one after another (docs/v2/hooks/use-exercise-session.md): the other side answers by itself, each
 * learner move is judged and graded (exact or tolerant), every try is kept, and answers are saved as `save` says.
 */
export function useExerciseSession({ exercises, opening, facts, save, delays }: SessionOptions) {
  const [at, setAt] = useState(0);
  const [played, setPlayed] = useState<Played[]>([]);
  const [attempt, setAttempt] = useState<Attempt>(startAttempt);
  const [exerciseAttempt, setExerciseAttempt] = useState<Attempt>(startAttempt);
  const [tries, setTries] = useState<TryRow[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [badge, setBadge] = useState<BoardBadge | undefined>();
  const [arrows, setArrows] = useState<SystemArrow[]>([]);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [thinking, setThinking] = useState(false);
  /** A move a tolerant grader is waiting to hear about: it stays on the board while the engine judges it. */
  const [pending, setPending] = useState<{ uci: string; epd: string } | null>(null);
  const started = useRef(Date.now());
  const exerciseStarted = useRef(Date.now());
  const live = useRef(new Map<string, EvalEntry>());
  const session = useRef(newId());
  /** The exercise last finished, so finishing is done once each. */
  const finished = useRef(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const exercise = exercises[at];
  const triesBeforeShown = exercise?.tries ?? siteConfig.teach.triesBeforeShown;
  const epd = played.at(-1)?.epd ?? exercise?.start ?? '';
  const ply = played.length;
  const done = at >= exercises.length;
  const learnerTurn = Boolean(exercise && !done && !pending && sideToMove(epd) === exercise.side && !over());

  function over() {
    if (!exercise) return true;
    return exerciseOver(exercise, epd, ply, played.filter((move) => move.mine).length);
  }

  const evalOf = useCallback(
    (position: string): EvalEntry | null => {
      const baked = facts?.evals[position]?.lines[0];
      if (baked) {
        const score = baked.mate !== undefined ? { mate: baked.mate } : { cp: baked.cp ?? 0 };
        return { score, depth: facts!.evals[position]!.depth, source: 'baked', pv: baked.pv };
      }
      return live.current.get(position) ?? null;
    },
    [facts],
  );

  const judge = useCallback(
    (from: string, uci: string, expected: string | undefined): Verdict | 'needs' => {
      const node = opening?.positions[from];
      const judgement = judgeMove(from, uci, {
        expected: expected ? [{ uci: expected }] : undefined,
        refutations: node?.refutations?.map((r) => ({ uci: r.uci, note: r.note, then: r.then })),
        note: node?.moves.find((move) => move.uci === uci)?.note,
        evalOf,
        counts: facts?.counts[from],
        config: { ...siteConfig.judge, ...siteConfig.coverage },
      });
      return judgement.status === 'known' ? judgement.verdict : 'needs';
    },
    [opening, evalOf, facts],
  );

  const evaluateLive = useCallback(async (positions: string[]) => {
    const engine = await startEngine();
    for (const position of positions) {
      if (live.current.has(position)) continue;
      const result = await engine.evaluate(position, { depth: siteConfig.engine.liveDepth, multipv: 1 });
      const best = result.lines[0];
      if (best) live.current.set(position, { score: best.score, depth: result.depth, source: 'live', pv: best.pv });
    }
  }, []);

  const saveAnswer = useCallback(
    async (cardId: string, done: Attempt, mode: AttemptRow['mode']) => {
      if (save === 'none') return;
      const store = await learnerStore();
      const now = new Date();
      const rating = autoGrade(done, siteConfig.judge.easyWithinMs);
      const card = (await store.cards.get(cardId)) ?? scheduler.newCard(cardId, now);
      await store.cards.put(scheduler.review(card, rating, now));
      const ms = done.tries.reduce((sum, one) => sum + one.ms, 0);
      await store.reviews.add({ id: newId(), cardId, at: now.toISOString(), rating, ms, hint: done.hint });
      await store.attempts.add({
        id: newId(),
        at: now.toISOString(),
        session: session.current,
        mode,
        ref: cardId,
        result: done.shown ? 'shown' : done.tries.some((one) => one.outcome === 'wrong') ? 'wrong' : 'right',
        tries: done.tries,
        ms,
        hint: done.hint,
        shown: done.shown,
      });
    },
    [save],
  );

  // The other side answers by itself; a finished exercise moves on to the next.
  useEffect(() => {
    if (!exercise || done) return;
    if (over()) {
      if (finished.current === at) return;
      finished.current = at;
      const total = Date.now() - exerciseStarted.current;
      setResults((list) =>
        list.length > at
          ? list
          : [
              ...list,
              {
                id: exercise.id,
                right: !exerciseAttempt.shown && !exerciseAttempt.tries.some((t) => t.outcome === 'wrong'),
                tries: exerciseAttempt.tries.length,
                hint: exerciseAttempt.hint,
                shown: exerciseAttempt.shown,
                ms: total,
                start: exercise.start,
                moves: played.map((move) => move.uci),
                attempt: exerciseAttempt,
              },
            ],
      );
      if (save === 'exercise')
        void saveAnswer(exercise.id, exerciseAttempt, exercise.mode === 'puzzle' ? 'puzzle' : exercise.mode);
      if (at < exercises.length) {
        later(() => {
          setAt((i) => i + 1);
          setPlayed([]);
          setAttempt(startAttempt());
          setExerciseAttempt(startAttempt());
          setBadge(undefined);
          setArrows([]);
          exerciseStarted.current = Date.now();
          started.current = Date.now();
        }, delays?.next ?? siteConfig.timing.nextCard);
      }
      return;
    }
    if (learnerTurn || pending) return;
    let cancelled = false;
    const respond = async () => {
      let uci: string | undefined;
      if (exercise.responder.kind === 'scripted') uci = scriptedMove(exercise, ply);
      else if (exercise.responder.kind === 'popular') {
        const book = exercise.responder.replies?.[epd] ?? opening?.positions[epd]?.moves.map((move) => move.uci);
        uci = popularReply(facts?.counts[epd], book?.length ? book : undefined, Math.random());
      }
      if (!uci) {
        setThinking(true);
        const engine = await startEngine();
        const result = await engine.evaluate(epd, { depth: siteConfig.engine.liveDepth, multipv: 1 });
        uci = result.lines[0]?.pv[0];
        setThinking(false);
      }
      if (cancelled || !uci) return;
      const move = playMove(epd, uci);
      if (!move) return;
      setPlayed((list) => [...list, { uci: move.uci, san: move.san, epd: move.epd, mine: false }]);
      started.current = Date.now();
    };
    const timer = setTimeout(() => void respond(), delays?.opponent ?? siteConfig.timing.opponent);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [at, ply, done, learnerTurn, pending]);

  const advance = (move: { uci: string; san: string; epd: string }, finished: Attempt) => {
    if (save === 'moves' && exercise)
      void saveAnswer(
        moveCardId(epd, move.uci),
        finished,
        exercise.mode === 'checkpoint' ? 'checkpoint' : exercise.mode,
      );
    setPlayed((list) => [...list, { ...move, mine: true }]);
    setAttempt(startAttempt());
    started.current = Date.now();
  };

  const play = (from: string, to: string): boolean => {
    if (!exercise || !learnerTurn) return false;
    const move = playMove(epd, from + to) ?? playMove(epd, `${from}${to}q`);
    if (!move) return false;
    const ms = Date.now() - started.current;
    const expected = expectedMove(exercise, epd, ply);
    const verdict = move.uci === expected ? null : judge(epd, move.uci, expected);
    if (verdict === 'needs' && exercise.grader.kind === 'tolerant') {
      // A tolerant grade is the judgement itself: the move stays on the board until the engine has looked at it. A
      // move it cannot judge (the engine failed to start) counts as passed.
      setPending({ uci: move.uci, epd: move.epd });
      void evaluateLive([epd, move.epd].filter((position) => !evalOf(position)))
        .catch(() => undefined)
        .then(() => {
          const late = judge(epd, move.uci, expected);
          setPending(null);
          settle(exercise, move, from, to, ms, expected, late === 'needs' ? 'unjudged' : late);
        });
      return true;
    }
    return settle(exercise, move, from, to, ms, expected, verdict);
  };

  /** Grades a learner move once its judgement is in (or known to be coming later, for an exact grader). */
  const settle = (
    exercise: Exercise,
    move: NonNullable<ReturnType<typeof playMove>>,
    from: string,
    to: string,
    ms: number,
    expected: string | undefined,
    verdict: Verdict | 'needs' | 'unjudged' | null,
  ): boolean => {
    const settled = verdict && verdict !== 'needs' && verdict !== 'unjudged' ? verdict : null;
    const outcome = verdict === 'unjudged' ? 'right' : gradeMove(exercise, epd, ply, move.uci, settled);
    const next = reduceAttempt(attempt, { type: 'try', uci: move.uci, ms, outcome }, triesBeforeShown);
    setExerciseAttempt((a) => ({ ...a, tries: [...a.tries, ...next.tries.slice(-1)] }));
    const rowIndex = tries.length;
    setTries((rows) => [
      ...rows,
      {
        ply: ply,
        asked: expected ? (playMove(epd, expected)?.san ?? '?') : '(your choice)',
        played: move.san,
        grade:
          outcome === 'right' && move.uci === expected
            ? 'book'
            : (settled?.grade ?? (outcome === 'right' ? 'good' : 'inaccuracy')),
        costCp:
          move.uci === expected ? 0 : settled ? Math.round(settled.costVsLine?.cp ?? settled.cost?.cp ?? 0) : null,
        drop: move.uci === expected ? 0 : settled ? (settled.costVsLine?.drop ?? settled.cost?.drop ?? 0) : null,
        ms,
        hint: attempt.hint,
      },
    ]);
    const where = { ply, san: move.san, from, to };
    if (verdict === 'needs') {
      // Not in the shipped facts: the browser engine fills the grade in when it has it.
      const lineAfter = expected ? playMove(epd, expected)?.epd : undefined;
      void evaluateLive([epd, move.epd, ...(lineAfter ? [lineAfter] : [])]).then(() => {
        const late = judge(epd, move.uci, expected);
        if (late === 'needs') return;
        setTries((rows) =>
          rows.map((r, i) =>
            i === rowIndex
              ? {
                  ...r,
                  grade: late.grade,
                  costCp: Math.round(late.costVsLine?.cp ?? late.cost?.cp ?? 0),
                  drop: late.cost?.drop ?? 0,
                }
              : r,
          ),
        );
      });
    }
    if (outcome === 'right') {
      const note = opening?.positions[epd]?.moves.find((candidate) => candidate.uci === move.uci)?.note;
      setFeedback({
        kind: 'right',
        ...where,
        grade: move.uci === expected ? 'book' : (settled?.grade ?? 'good'),
        comment: note?.text,
      });
      setBadge({ square: to, kind: 'right' });
      advance(move, next);
      return true;
    }
    if (outcome === 'another') {
      setFeedback({
        kind: 'alternative',
        ...where,
        grade: settled!.grade,
        lineMove: playMove(epd, expected!)?.san ?? '',
        linePly: ply,
      });
      setBadge(undefined);
    } else {
      setFeedback({
        kind: 'wrong',
        ...where,
        grade: settled?.grade ?? 'inaccuracy',
        costCp: settled?.cost ? Math.round(settled.cost.cp) : undefined,
        authorNote: settled?.note?.text,
        refutation: settled?.refutation?.length ? runFrom(move.epd, settled.refutation) : undefined,
      });
      setBadge({ square: to, kind: 'wrong' });
    }
    setAttempt(next);
    // With no single right move (tolerant), the move shown after the tries run out is the engine's best.
    const shownMove = expected ?? (exercise.grader.kind === 'tolerant' ? evalOf(epd)?.pv?.[0] : undefined);
    if (next.shown && shownMove) {
      setArrows([{ from: shownMove.slice(0, 2), to: shownMove.slice(2, 4), kind: 'play' }]);
      setExerciseAttempt((a) => ({ ...a, shown: true }));
      later(() => {
        const shown = playMove(epd, shownMove)!;
        advance(shown, next);
        setArrows([]);
      }, siteConfig.timing.wrongBadge * 1.5);
    }
    return false;
  };

  const hint = () => {
    setAttempt((a) => reduceAttempt(a, { type: 'hint' }, triesBeforeShown));
    setExerciseAttempt((a) => ({ ...a, hint: true }));
  };
  const show = () => {
    const expected = exercise ? expectedMove(exercise, epd, ply) : undefined;
    if (!expected) return;
    const next = reduceAttempt(attempt, { type: 'show' }, triesBeforeShown);
    setAttempt(next);
    setExerciseAttempt((a) => ({ ...a, shown: true }));
    setArrows([{ from: expected.slice(0, 2), to: expected.slice(2, 4), kind: 'play' }]);
    later(() => {
      advance(playMove(epd, expected)!, next);
      setArrows([]);
    }, siteConfig.timing.wrongBadge * 1.5);
  };

  const last = played.at(-1);
  const expectedNow = exercise ? expectedMove(exercise, epd, ply) : undefined;
  return {
    exercise,
    index: at,
    total: exercises.length,
    done,
    /** The position on the board: with a move waiting for its judgement, the position after it. */
    epd: pending?.epd ?? epd,
    played,
    /** A move is on the board waiting for the engine's judgement (tolerant grading). */
    judging: Boolean(pending),
    lastMove: pending
      ? { from: pending.uci.slice(0, 2), to: pending.uci.slice(2, 4) }
      : last
        ? { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) }
        : exercise?.before
          ? { from: exercise.before.slice(0, 2), to: exercise.before.slice(2, 4) }
          : undefined,
    learnerTurn,
    thinking,
    hintSquare: attempt.hint && expectedNow ? expectedNow.slice(0, 2) : undefined,
    attempt,
    tries,
    results,
    feedback,
    badge,
    arrows,
    play,
    hint,
    show,
    canShow: Boolean(expectedNow) && exercise?.help !== false,
    triesBeforeShown,
  };
}

function runFrom(epd: string, ucis: readonly string[]) {
  const out: { san: string; uci: string; after: string }[] = [];
  let position = epd;
  for (const uci of ucis) {
    const move = playMove(position, uci);
    if (!move) break;
    out.push({ san: move.san, uci: move.uci, after: move.epd });
    position = move.epd;
  }
  return out;
}
