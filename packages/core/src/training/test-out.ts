/*
 * Testing out (docs/v2/library/training.md, "Gates"): a gate can be passed by taking its check without doing the
 * steps. The check is logged like any attempt; a step it covers counts as known from then on. One mechanism serves a
 * step's own test-out and a variation's checkpoint taken early: both are read from the attempts log, never stored.
 */

/** What a variation's checkpoint is recorded under in the attempts log (mode `checkpoint`). */
export const checkpointRef = (opening: string, variation: string) => `checkpoint:${opening}:${variation}`;

/** What an opening's final test is recorded under in the attempts log (mode `checkpoint`). */
export const finalTestRef = (opening: string) => `test:${opening}`;

/** What a step's own test-out is recorded under in the attempts log (mode `try`, result `right` when passed). */
export const stepTestOutRef = (opening: string, step: string) => `test-out:${opening}:${step}`;

/** What a clean Try of a whole line is recorded under (mode `try`, result `right`): it passes the steps teaching it. */
export const lineTestOutRef = (opening: string, line: string) => `test-out:${opening}:line:${line}`;

/** The little of an attempt row a test-out is read from. */
export type TestOutAttempt = { mode: string; ref: string; result: string };

/**
 * The steps of an opening known by a test-out: every step of a variation whose checkpoint was cleared at least once,
 * every step of the opening once its final test is cleared, every step with a passed test-out of its own (a clean Try
 * counts), and every step of a line whose clean Try passed.
 */
export function testedOutSteps(
  opening: { id: string; steps: readonly { id: string; variation: string; line?: string }[] },
  attempts: readonly TestOutAttempt[],
): Set<string> {
  const passed = new Set(attempts.filter((attempt) => attempt.result === 'right').map((attempt) => attempt.ref));
  const out = new Set<string>();
  const wholeOpening = passed.has(finalTestRef(opening.id));
  for (const step of opening.steps) {
    if (
      wholeOpening ||
      passed.has(checkpointRef(opening.id, step.variation)) ||
      passed.has(stepTestOutRef(opening.id, step.id)) ||
      (step.line !== undefined && passed.has(lineTestOutRef(opening.id, step.line)))
    )
      out.add(step.id);
  }
  return out;
}
