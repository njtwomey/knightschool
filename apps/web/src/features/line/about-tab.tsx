import { namedPly, numberedMove, type OpeningContent, type Variant, variantPath } from '@knightschool/core';
import { BookOpen, GitBranch, GitFork, ListChecks, PenLine, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLineStepper } from '@/components/board/line-stepper';
import { StudyBoard } from '@/components/board/study-board';
import { PlayBreadcrumbs } from '@/components/breadcrumbs/course-breadcrumbs';
import { EcoLink } from '@/components/eco-link';
import { MoveList } from '@/components/move-list';
import { Page } from '@/components/page';
import { PageFallback } from '@/components/page-fallback';
import { kindLabel } from '@/components/tags/hints';
import { VariantTags } from '@/components/tags/tag-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/data/catalog-store';
import { loadOpening } from '@/data/content';
import { CourseIntro } from '@/features/course/course-intro';
import { useAsync } from '@/hooks/use-async';
import { courseHref, lineEditHref, lineHref } from '@/router/hrefs';
import { to } from '@/router/location';

/**
 * The About tab: what the line is, told mostly in words. A picture of the position where the line becomes itself (the
 * deepest named position on it), where it grows from in the tree and what grows from it, the other courses that teach
 * it, and the line move by move with the reason for each commented move. Clicking a move puts it on the board.
 */
export function LineAbout({ course, line }: { course: string; line: string }) {
  const index = useCatalog((state) => state.index);
  // The page is mounted afresh for each line (App keys it by the address), so there is no stale course to clear.
  const { data: content, error } = useAsync(() => loadOpening(course), [course]);

  if (error)
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>Could not open this line</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Page>
    );
  const variant = content?.opening.variants.find((candidate) => candidate.id === line);
  if (!content) return <PageFallback />;
  if (!variant)
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>No such line</AlertTitle>
          <AlertDescription>
            {content.opening.name} has no line called {line}.{' '}
            <a className="underline" href={to(courseHref(course))}>
              See its lines
            </a>
          </AlertDescription>
        </Alert>
      </Page>
    );
  return <About key={variant.id} content={content} variant={variant} index={index} />;
}

function About({
  content,
  variant,
  index,
}: {
  content: OpeningContent;
  variant: Variant;
  index: ReturnType<typeof useCatalog.getState>['index'];
}) {
  const { opening } = content;
  const course = opening.id;
  const side = opening.side;
  const path = useMemo(() => variantPath(content, variant.id), [content, variant.id]);
  const named = useMemo(() => namedPly(content, variant.id), [content, variant.id]);
  const [ply, setPly] = useState(named);
  const stepper = useLineStepper({ length: path.length, index: ply, setIndex: setPly });

  const positions = [opening.rootEpd, ...path.map((edge) => edge.to)];
  const trigger = Math.max(0, positions.indexOf(opening.triggerEpd));
  const epd = positions[ply] ?? opening.rootEpd;
  const positionName = content.nodes[epd]?.name;

  // Where the line sits in the tree: what it grows from and what grows from it, found in any course that lists them.
  const entry = index
    .find((candidate) => candidate.id === course)
    ?.lines.find((candidate) => candidate.id === variant.id);
  const authored = index.find((candidate) => candidate.id === course)?.authored === true;
  const homeOf = (lineId: string) =>
    index.find((candidate) => candidate.id === course && candidate.lines.some((l) => l.id === lineId)) ??
    index.find((candidate) => candidate.lines.some((l) => l.id === lineId));
  const parent = entry?.branch;
  const parentHome = parent ? homeOf(parent.parent) : undefined;
  const parentName = parentHome?.lines.find((l) => l.id === parent!.parent)?.name ?? parent?.parent;
  const children = [
    ...new Map(
      index.flatMap((candidate) =>
        candidate.lines
          .filter((l) => l.branch?.parent === variant.id)
          .map((l) => [l.id, { course: homeOf(l.id)?.id ?? candidate.id, line: l }] as const),
      ),
    ).values(),
  ];
  const alsoIn = (entry?.alsoIn ?? []).flatMap((id) => index.filter((candidate) => candidate.id === id));
  const kind = variant.whose ?? variant.weight;
  const other = side === 'white' ? 'Black' : 'White';

  return (
    <Page className="gap-6">
      <PlayBreadcrumbs course={course} line={variant.id} tab="about" />

      <div className="grid gap-x-8 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:grid-rows-[auto_1fr]">
        <div className="grid min-w-0 content-start gap-6">
          <header className="grid gap-2">
            <h1 className="text-2xl font-semibold leading-tight">{variant.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <EcoLink eco={variant.eco} course={course} line={variant.id} />
              {kind && <Badge variant="secondary">{kindLabel(kind)}</Badge>}
              {variant.alternative && <Badge variant="outline">Alternative: shown, not drilled</Badge>}
              <span className="text-sm text-muted-foreground">
                You play {side}. {variant.opponent && `${other} goes ${variant.opponent}.`}
              </span>
            </div>
            <VariantTags variant={variant} side={side} visible={8} />
            {variant.description && <p className="max-w-prose leading-relaxed">{variant.description}</p>}
          </header>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={to(lineHref(course, variant.id, 'learn'))}>
                <BookOpen aria-hidden /> Learn the line
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={to(lineHref(course, variant.id, 'drill'))}>
                <Target aria-hidden /> Drill it
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={to(lineHref(course, variant.id, 'quiz'))}>
                <ListChecks aria-hidden /> Quiz yourself
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={to(lineHref(course, variant.id, 'tree'))}>
                <GitFork aria-hidden /> See it in the tree
              </a>
            </Button>
            {authored && (
              <Button asChild variant="outline">
                <a href={to(lineEditHref(course, variant.id))}>
                  <PenLine aria-hidden /> Edit
                </a>
              </Button>
            )}
          </div>
        </div>

        <aside className="grid content-start gap-2 md:sticky md:top-20 md:col-start-2 md:row-span-2 md:row-start-1 md:self-start">
          <StudyBoard
            id="line-about"
            previewable
            size="aside"
            epd={epd}
            orientation={side}
            interactive={false}
            lastMove={ply > 0 ? path[ply - 1]?.uci : undefined}
            stepper={stepper}
            controls={{ flip: true }}
            caption={
              <p>
                <span className="font-medium">
                  {ply === 0 ? 'The start' : `After ${numberedMove(ply - 1, path[ply - 1]!.san)}`}
                </span>
                {positionName && <span className="text-muted-foreground">: {positionName}</span>}
              </p>
            }
            below={
              ply !== named && (
                <Button variant="link" className="h-auto justify-start p-0 text-sm" onClick={() => setPly(named)}>
                  Back to the position that names the line
                </Button>
              )
            }
          />
        </aside>

        <div className="grid min-w-0 content-start gap-6">
          <section className="grid gap-3" aria-labelledby="line-moves">
            <h2 id="line-moves" className="text-lg font-semibold">
              The line, move by move
            </h2>
            {trigger > 0 && (
              <p className="text-sm text-muted-foreground">
                The course starts after{' '}
                <MoveList
                  layout="inline"
                  moves={path.slice(0, trigger).map((edge, i) => ({ ply: i, san: edge.san }))}
                  current={ply - 1}
                  onSelect={(at) => setPly(at + 1)}
                />
                .
              </p>
            )}
            <MoveList
              layout="paragraphs"
              label="The line"
              moves={path.slice(trigger).map((edge, i) => ({
                ply: trigger + i,
                san: edge.san,
                tags: edge.annotation?.tags,
                comment: edge.annotation?.text,
              }))}
              current={ply - 1}
              onSelect={(at) => setPly(at + 1)}
            />
          </section>

          {(parent || children.length > 0 || alsoIn.length > 0) && (
            <section className="grid gap-2 text-sm" aria-labelledby="line-tree">
              <h2 id="line-tree" className="text-lg font-semibold">
                <GitBranch className="mr-1 inline size-4" aria-hidden /> In the tree
              </h2>
              {parent && (
                <p>
                  Grows out of{' '}
                  {parentHome ? (
                    <a className="font-medium underline" href={to(lineHref(parentHome.id, parent.parent))}>
                      {parentName}
                    </a>
                  ) : (
                    parentName
                  )}{' '}
                  after <span className="font-mono">{parent.after}</span>.
                </p>
              )}
              {children.length > 0 && (
                <p>
                  Branching from it:{' '}
                  {children.map(({ course: home, line: child }, i) => (
                    <span key={child.id}>
                      {i > 0 && ', '}
                      <a className="underline" href={to(lineHref(home, child.id))}>
                        {child.name}
                      </a>{' '}
                      <span className="text-muted-foreground">after {child.branch!.after}</span>
                    </span>
                  ))}
                  .
                </p>
              )}
              {alsoIn.length > 0 && (
                <p>
                  Also in{' '}
                  {alsoIn.map((other, i) => (
                    <span key={other.id}>
                      {i > 0 && ', '}
                      <a className="underline" href={to(lineHref(other.id, variant.id))}>
                        {other.name}
                      </a>
                    </span>
                  ))}
                  .
                </p>
              )}
            </section>
          )}

          <section className="grid gap-3" aria-labelledby="line-course">
            <h2 id="line-course" className="text-lg font-semibold">
              The course:{' '}
              <a href={to(courseHref(course))} className="underline">
                {opening.name}
              </a>
            </h2>
            <CourseIntro summary={opening.summary} about={opening.about} />
          </section>
        </div>
      </div>
    </Page>
  );
}
