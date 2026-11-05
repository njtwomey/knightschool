import { chosenScope } from '@knightschool/core';
import type { BuiltOpening } from '@knightschool/core/content';
import type { PracticeMode, PracticeSource, PracticeSourceId } from '@/components/practice/practice-config';
import { getSetting } from '@/data/settings';
import { to } from '@/router/location';

/*
 * Practice sources as one opening or one variation: `opening:<opening>` and `variation:<opening>/<variation>`, and
 * the addresses that start a mode on one at once (`/practice/<mode>/<opening>[/<variation>]`, docs/v2/pages/practice.md).
 */

export type PracticeScope = { opening: string; variation?: string };

export const openingSource = (opening: string): PracticeSourceId => `opening:${opening}`;
export const variationSource = (opening: string, variation: string): PracticeSourceId =>
  `variation:${opening}/${variation}`;

/** The opening (and variation) a source names, or null for the fixed sources (due, repertoire, everything, hardest). */
export function scopeOf(source: PracticeSourceId): PracticeScope | null {
  if (source.startsWith('opening:')) return { opening: source.slice('opening:'.length) };
  if (source.startsWith('variation:')) {
    const [opening, variation] = source.slice('variation:'.length).split('/');
    return opening && variation ? { opening, variation } : null;
  }
  return null;
}

/**
 * The fixed sources a mode's address can name in place of an opening: `/practice/drill/repertoire` starts a drill of the
 * repertoire at once, `/practice/review/due-all` everything due, ticked or not. Never opening ids.
 */
const ADDRESS_SOURCES: ReadonlySet<string> = new Set(['repertoire', 'due-all']);

export const sourceOfScope = (scope: PracticeScope): PracticeSourceId => {
  if (ADDRESS_SOURCES.has(scope.opening)) return scope.opening;
  return scope.variation ? variationSource(scope.opening, scope.variation) : openingSource(scope.opening);
};

/** The session that goes through everything in the repertoire: Review with its new moves, saved to the schedule. */
export const repertoireReviewHref = () => to('/practice/review');
/** The whole repertoire in a mode, started at once. */
export const repertoireHref = (mode: PracticeMode) => to(`/practice/${mode}/repertoire`);
/** Every card due, ticked or not. */
export const dueAllHref = () => to('/practice/review/due-all');

/** The address that starts a mode on a scope at once; the mode's own page for the fixed sources. */
export function modeHref(mode: PracticeMode, scope?: PracticeScope | null): string {
  if (!scope) return to(`/practice/${mode}`);
  return to(`/practice/${mode}/${scope.opening}${scope.variation ? `/${scope.variation}` : ''}`);
}

/** The modes with an address for the repertoire. */
const REPERTOIRE_MODES: readonly PracticeMode[] = ['review', 'drill', 'puzzles'];

/** The address that starts a mode on a source: as `modeHref`, and the repertoire where the mode has an address for it. */
export function sourceHref(mode: PracticeMode, source: PracticeSourceId): string {
  return source === 'repertoire' && REPERTOIRE_MODES.includes(mode)
    ? repertoireHref(mode)
    : modeHref(mode, scopeOf(source));
}

/**
 * The lines of an opening "My repertoire" holds, for modes that draw on lines (Speed, Name it); null when the source
 * is not limited to what is ticked (another source, or nothing ticked).
 */
export function tickedLines(opening: BuiltOpening, source: PracticeSourceId): ReadonlySet<string> | null {
  const picks = source === 'repertoire' ? getSetting('repertoire') : [];
  return picks.length ? chosenScope(opening, picks).lines : null;
}

/** Every opening and its variations as sources, each with what it holds in this mode (`count`). */
export function practiceSources(
  openings: readonly BuiltOpening[],
  count?: (scope: PracticeScope) => number | undefined,
): PracticeSource[] {
  const out: PracticeSource[] = [];
  for (const opening of openings) {
    const total = count?.({ opening: opening.id });
    out.push({
      id: openingSource(opening.id),
      name: opening.name,
      group: 'opening',
      ...(total !== undefined ? { count: total } : {}),
    });
  }
  for (const opening of openings) {
    for (const variation of opening.variations) {
      const total = count?.({ opening: opening.id, variation: variation.id });
      out.push({
        id: variationSource(opening.id, variation.id),
        name: variation.name ?? variation.id,
        group: 'variation',
        opening: opening.name,
        ...(total !== undefined ? { count: total } : {}),
      });
    }
  }
  return out;
}
