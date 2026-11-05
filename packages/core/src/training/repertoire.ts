import type { BuiltOpening, BuiltStep } from '../content/build-opening';
import { moveCards } from './cards';

/*
 * What the learner has chosen to learn (docs/v2/stores/repertoire.md): the `repertoire` setting, a list of picks. The
 * unit is the step: it is the chunk learned and tested at once, every move card belongs to a step, and each step sits in
 * exactly one variation and one line, so ticking a variation or a line is ticking its steps and neither can overlap
 * another. A pick says what is chosen and nothing else: it makes no cards and changes no progress.
 *
 * Picks are kept in their smallest form, so a whole opening or variation grows with the content:
 * - `<opening>`: the whole opening (v1's `enrolled` reads straight in);
 * - `variation:<opening>/<variation>`: every step of a variation;
 * - `step:<opening>/<step>`: one step. Step ids are `<line>:<n>` and a recut can change `n`, but a line's id is
 *   permanent (docs/v2/schemas/upgrades.md), so a step that has gone widens to the steps of its line.
 */

export const variationPick = (opening: string, variation: string) => `variation:${opening}/${variation}`;
export const stepPick = (opening: string, step: string) => `step:${opening}/${step}`;

export type ParsedPick = { opening: string; variation?: string; step?: string };

export function parsePick(pick: string): ParsedPick | null {
  const kind = /^(variation|step):/.exec(pick)?.[1];
  if (!kind) return pick ? { opening: pick } : null;
  const rest = pick.slice(kind.length + 1);
  const cut = rest.indexOf('/');
  if (cut <= 0 || cut === rest.length - 1) return null;
  return { opening: rest.slice(0, cut), [kind]: rest.slice(cut + 1) };
}

/** The opening ids the picks touch, in the order they were first picked. */
export const pickedOpenings = (picks: readonly string[]): string[] => [
  ...new Set(picks.flatMap((pick) => parsePick(pick)?.opening ?? [])),
];

function stepsOfStepPick(opening: BuiltOpening, id: string): BuiltStep[] {
  const exact = opening.steps.filter((step) => step.id === id);
  if (exact.length) return exact;
  const line = id.slice(0, id.lastIndexOf(':'));
  return opening.steps.filter((step) => step.line === line);
}

/** The steps of an opening the picks choose, in path order. */
export function chosenSteps(opening: BuiltOpening, picks: readonly string[]): BuiltStep[] {
  const chosen = new Set<string>();
  for (const pick of picks) {
    const parsed = parsePick(pick);
    if (parsed?.opening !== opening.id) continue;
    const steps = parsed.step
      ? stepsOfStepPick(opening, parsed.step)
      : parsed.variation
        ? opening.steps.filter((step) => step.variation === parsed.variation)
        : opening.steps;
    for (const step of steps) chosen.add(step.id);
  }
  return opening.steps.filter((step) => chosen.has(step.id));
}

/** How much of a group of steps is chosen: what its tick shows. */
export type TickState = 'none' | 'some' | 'all';

export function tickState(chosen: ReadonlySet<string>, stepIds: readonly string[]): TickState {
  const on = stepIds.filter((id) => chosen.has(id)).length;
  return on === 0 ? 'none' : on === stepIds.length ? 'all' : 'some';
}

/** The chosen steps as the fewest picks that say the same. */
function smallestPicks(opening: BuiltOpening, chosen: ReadonlySet<string>): string[] {
  if (!chosen.size) return [];
  if (opening.steps.every((step) => chosen.has(step.id))) return [opening.id];
  return opening.variations.flatMap((variation) => {
    const steps = opening.steps.filter((step) => step.variation === variation.id);
    if (steps.length && steps.every((step) => chosen.has(step.id))) return [variationPick(opening.id, variation.id)];
    return steps.filter((step) => chosen.has(step.id)).map((step) => stepPick(opening.id, step.id));
  });
}

/** The picks with `stepIds` added or taken off; other openings' picks stay as they are. */
export function setSteps(
  opening: BuiltOpening,
  picks: readonly string[],
  stepIds: readonly string[],
  on: boolean,
): string[] {
  const chosen = new Set(chosenSteps(opening, picks).map((step) => step.id));
  for (const id of stepIds) {
    if (on) chosen.add(id);
    else chosen.delete(id);
  }
  return [...picks.filter((pick) => parsePick(pick)?.opening !== opening.id), ...smallestPicks(opening, chosen)];
}

/** One click on a tick: every step on when any is off, else every step off. */
export function toggleSteps(opening: BuiltOpening, picks: readonly string[], stepIds: readonly string[]): string[] {
  const chosen = new Set(chosenSteps(opening, picks).map((step) => step.id));
  return setSteps(opening, picks, stepIds, tickState(chosen, stepIds) !== 'all');
}

/** The picks without anything of one opening. */
export const withoutOpening = (picks: readonly string[], opening: string): string[] =>
  picks.filter((pick) => parsePick(pick)?.opening !== opening);

/** What the picks mean for an opening in practice (none of it stored). */
export type ChosenScope = {
  steps: readonly BuiltStep[];
  /** The move cards of those steps and their follow-ups, by card id; a follow-up comes with the step it hangs off. */
  cards: ReadonlySet<string>;
  lines: ReadonlySet<string>;
  variations: ReadonlySet<string>;
  /** Limits a drill (`drillScope`'s `ends`): each line, up to its last chosen ply; none when every step is chosen. */
  ends?: ReadonlyMap<string, number>;
};

export function chosenScope(opening: BuiltOpening, picks: readonly string[]): ChosenScope {
  const steps = chosenSteps(opening, picks);
  const ids = new Set(steps.map((step) => step.id));
  const cards = new Set(moveCards(opening).flatMap((card) => (ids.has(card.step) ? [card.id] : [])));
  for (const followUp of opening.followUps ?? []) {
    if (ids.has(followUp.step)) for (const card of followUp.cards) cards.add(card.id);
  }
  const ends = new Map<string, number>();
  for (const step of steps) ends.set(step.line, Math.max(ends.get(step.line) ?? 0, step.to));
  return {
    steps,
    cards,
    lines: new Set(steps.map((step) => step.line)),
    variations: new Set(steps.map((step) => step.variation)),
    ...(steps.length < opening.steps.length ? { ends } : {}),
  };
}
