/**
 * How long feedback stays up, in milliseconds, for every session (Learn and Drill, Quiz, Name it, Speed) and the
 * pages around them. Nothing waits for a click when you are right: a tick shows and play carries on by itself.
 */
export const FEEDBACK_DELAYS = {
  /** A tick on the square of a right move, where play goes straight on (Speed). */
  correctBadge: 250,
  /** A cross on the square of a wrong move, which snaps back at once. */
  wrongBadge: 900,
  /** After a right move in Learn and Drill, before the line carries on. */
  afterCorrect: 350,
  /** Before the computer answers in Learn and Drill. */
  opponent: 500,
  /** After a right move in Quiz, before the next card. */
  nextCard: 700,
  /** A worded quiz answered right, long enough to read the explanation. */
  quizRight: 2200,
  /** A full-credit answer in Name it, before the next position. */
  guessFull: 2600,
  /** The countdown with the next line's name between lines of a fixed Speed run. */
  betweenLines: 5000,
  /** "Copied" on a copy button. */
  copied: 1800,
} as const;

/** A set of timeouts that can all be cancelled together: when a session stops, restarts or leaves the page. */
export function createTimers() {
  let pending: ReturnType<typeof setTimeout>[] = [];
  return {
    /** Runs `run` after `ms`, unless the set is cleared first. */
    later(ms: number, run: () => void) {
      const timer = setTimeout(() => {
        pending = pending.filter((other) => other !== timer);
        run();
      }, ms);
      pending.push(timer);
    },
    clear() {
      for (const timer of pending) clearTimeout(timer);
      pending = [];
    },
  };
}

export type Timers = ReturnType<typeof createTimers>;
