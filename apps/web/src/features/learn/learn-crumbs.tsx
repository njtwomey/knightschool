import { useMemo } from 'react';
import { StateBadge } from '@/components/progress/state-badge';
import { stepTitle, type StepData } from '@/components/openings/steps';
import type { Crumb, CrumbSibling } from '@/components/shared/breadcrumbs';
import { openingVariations, type OpeningData } from './opening-data';
import { OpeningCrumbs } from './opening-frame';
import { useOpenLocked } from './use-open-locked';
import { lineHref, stepHref, variationHref } from './views';

/** Where a Learn page sits in its opening: the variation, the step, the step's follow-up, or a line. */
export type LearnPlace = { variation?: string; step?: number; followUp?: number; line?: string };

/**
 * The trail of every Learn page inside an opening (docs/v2/navigation/trails.md): Learn › Opening › Variation › Step ›
 * follow-up, or Learn › Opening › Line. Every crumb is a menu of its siblings: the openings, the opening's variations,
 * the variation's steps with their follow-ups in under each, a step's follow-ups, the opening's lines. Locked items say
 * what opens them and still open, asking once per opening first, as the step rows do.
 */
export function LearnCrumbs({ data, at }: { data: OpeningData; at: LearnPlace }) {
  const { one, progress } = data;
  const opening = one.opening;
  const { gates, hrefOf, locked, opener, dialog } = useOpenLocked(opening);
  const variations = useMemo(() => openingVariations(data), [data]);
  const variation =
    variations.find((v) => v.id === at.variation) ??
    (at.step !== undefined ? variations.find((v) => v.steps.some((row) => row.number === at.step)) : undefined);
  const stepRow = variation?.steps.find((row) => row.number === at.step);
  const followUps = stepRow ? (variation?.followUps?.[stepRow.id] ?? []) : [];
  const followUpRow = at.followUp !== undefined ? followUps[at.followUp - 1] : undefined;

  // A step or follow-up in a menu: its state as a dot; locked ones say what opens them and ask once before opening.
  const item = (row: StepData, label: string): CrumbSibling => {
    const onSelect = opener(row);
    return {
      id: row.id,
      label,
      href: hrefOf(row),
      badge: <StateBadge state={row.state} of="step" size="dot" gates={gates} />,
      ...(row.followUp ? { indent: true } : {}),
      ...(locked(row)
        ? {
            locked: row.opensWhen
              ? `Opens when step ${row.opensWhen.number} (${row.opensWhen.name}) is known`
              : 'Opens once the step before is known',
            opens: true,
            ...(onSelect ? { onSelect } : {}),
          }
        : {}),
    };
  };

  const crumbs: Crumb[] = [];
  if (variation) {
    crumbs.push({
      label: variation.name,
      ...(at.step !== undefined ? { href: variationHref(opening.id, variation.id) } : {}),
      siblings: {
        current: variation.id,
        label: 'Variations',
        items: variations.map((v) => ({
          id: v.id,
          label: v.name,
          href: variationHref(opening.id, v.id),
          badge: <StateBadge state={v.state} of="variation" size="dot" gates={gates} />,
        })),
      },
    });
  }
  if (variation && stepRow) {
    crumbs.push({
      label: stepTitle(stepRow),
      ...(followUpRow ? { href: stepHref(opening.id, stepRow.number) } : {}),
      siblings: {
        current: stepRow.id,
        label: 'Steps',
        items: variation.steps.flatMap((row) => [
          item(row, stepTitle(row)),
          ...(variation.followUps?.[row.id] ?? []).map((f) => item(f, stepTitle(f))),
        ]),
      },
    });
  }
  if (followUpRow) {
    crumbs.push({
      label: stepTitle(followUpRow),
      siblings: {
        current: followUpRow.id,
        label: 'Follow-ups',
        items: followUps.map((f) => item(f, stepTitle(f))),
      },
    });
  }
  if (at.line) {
    const name = (id: string) => opening.lines.find((l) => l.id === id)?.name ?? id;
    crumbs.push({
      label: name(at.line),
      siblings: {
        current: at.line,
        label: 'Lines',
        items: opening.lines.map((l) => ({ id: l.id, label: l.name ?? l.id, href: lineHref(opening.id, l.id) })),
      },
    });
  }

  return (
    <>
      <OpeningCrumbs
        catalog={progress.catalog}
        opening={opening}
        crumbs={crumbs}
        {...(at.line ? { tab: 'lines' as const } : {})}
      />
      {dialog}
    </>
  );
}
