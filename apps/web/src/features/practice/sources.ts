import type { BuiltOpening } from '@knightschool/core/content';
import type { PracticeMode, PracticeSource, PracticeSourceId } from '@/components/practice/practice-config';
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

export const sourceOfScope = (scope: PracticeScope): PracticeSourceId =>
  scope.variation ? variationSource(scope.opening, scope.variation) : openingSource(scope.opening);

/** The address that starts a mode on a scope at once; the mode's own page for the fixed sources. */
export function modeHref(mode: PracticeMode, scope?: PracticeScope | null): string {
  if (!scope) return to(`/practice/${mode}`);
  return to(`/practice/${mode}/${scope.opening}${scope.variation ? `/${scope.variation}` : ''}`);
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
