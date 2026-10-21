import type { OpeningContent, Side, Variant } from '@knightschool/core';
import { BookOpen, Eye, Target } from 'lucide-react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { IconAction } from '@/features/browse/icon-action';
import { useBrowse } from '@/features/browse/store';
import { VariantTags } from '@/features/browse/tag-badge';
import { TagLegend } from '@/features/browse/tag-legend';
import { to } from '@/router/location';

type Group = { title: string; note?: string; variants: Variant[] };

/** The lines and traps of a course in the order a learner needs them: what they will meet most, then the tricks. */
function groupsOf(all: Variant[]): Group[] {
  // A course that names its own sections shows them in the order they first appear; anything unnamed follows.
  const titled = [...new Set(all.flatMap((variant) => (variant.section ? [variant.section] : [])))];
  const sections: Group[] = titled.map((title) => ({
    title,
    variants: all.filter((variant) => variant.section === title),
  }));
  return [...sections, ...kindGroups(all.filter((variant) => !variant.section))];
}

function kindGroups(variants: Variant[]): Group[] {
  const lines = variants.filter((variant) => variant.kind === 'line');
  const traps = variants.filter((variant) => variant.kind === 'refutation');
  const normal = lines.filter((variant) => !variant.alternative);
  const pick = (weight: Variant['weight']) => normal.filter((variant) => variant.weight === weight);
  return [
    { title: 'Main lines', variants: pick('main') },
    {
      title: 'Gambits you will meet',
      note: 'The opponent offers material. Learn the safe way to meet it.',
      variants: pick('gambit'),
    },
    { title: 'Sidelines', variants: pick('sideline') },
    {
      title: 'Rare lines',
      note: 'Left out of your quiz unless you turn on rare lines in Settings.',
      variants: pick('rare'),
    },
    {
      title: 'Other ways to play it',
      note: 'A second answer to a position the main lines already answer. Shown, never drilled.',
      variants: lines.filter((variant) => variant.alternative),
    },
    {
      title: 'Traps to avoid',
      note: 'What the opponent tries, and the natural mistake. Your answer to each is in the lines above.',
      variants: traps.filter((variant) => variant.whose === 'against-us'),
    },
    {
      title: 'Traps you can spring',
      note: 'What to do if the opponent slips. These come up as quiz questions.',
      variants: traps.filter((variant) => variant.whose !== 'against-us'),
    },
  ].filter((group) => group.variants.length > 0);
}

/** One section of rows: a name, what the opponent does to reach it, its tags, and the three things you can do with it. */
function Section({ group, courseId, side }: { group: Group; courseId: string; side: Side }) {
  const showLine = useBrowse((state) => state.showLine);
  return (
    <section className="grid gap-1 rounded-xl border bg-card p-3">
      <header className="px-1">
        <h3 className="font-semibold leading-tight">{group.title}</h3>
        {group.note && <p className="text-xs text-muted-foreground">{group.note}</p>}
      </header>
      <Table>
        <TableBody>
          {group.variants.map((variant) => (
            <TableRow key={variant.id} className="relative">
              <TableCell className="whitespace-normal py-1.5">
                <a
                  href={to(`/play/${courseId}/${variant.id}/learn`)}
                  className='font-medium outline-none after:absolute after:inset-0 after:content-[""] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50'
                >
                  {variant.name}
                </a>{' '}
                <span className="text-xs text-muted-foreground">{variant.eco}</span>
                {variant.opponent && (
                  <p className="text-xs text-muted-foreground">
                    after <span className="font-mono">{variant.opponent}</span>
                  </p>
                )}
                <div className="relative z-10 mt-1 w-fit md:hidden">
                  <VariantTags variant={variant} side={side} visible={2} />
                </div>
              </TableCell>
              <TableCell className="hidden py-1.5 md:table-cell">
                <div className="relative z-10 w-fit">
                  <VariantTags variant={variant} side={side} />
                </div>
              </TableCell>
              <TableCell className="relative z-10 w-px whitespace-nowrap py-1.5 text-right">
                <IconAction label="Show on board" onClick={() => showLine(variant.id)}>
                  <Eye aria-hidden />
                </IconAction>
                <IconAction label="Learn it first" href={to(`/play/${courseId}/${variant.id}/learn`)}>
                  <BookOpen aria-hidden />
                </IconAction>
                {!variant.alternative && (
                  <IconAction label="Practise" href={to(`/play/${courseId}/${variant.id}/practice`)}>
                    <Target aria-hidden />
                  </IconAction>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function LinesTable({ content }: { content: OpeningContent }) {
  const groups = groupsOf(content.opening.variants);
  return (
    <div className="grid gap-3">
      <TagLegend variants={content.opening.variants} side={content.opening.side} />
      {groups.map((group) => (
        <Section key={group.title} group={group} courseId={content.opening.id} side={content.opening.side} />
      ))}
    </div>
  );
}
