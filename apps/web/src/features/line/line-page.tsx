import { namedPly, variantPath, type LineEdge, type OpeningContent, type Variant } from '@knightschool/core';
import { BookOpen, GitBranch, ListChecks, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { Page } from '@/components/page';
import { RichText } from '@/components/rich-text';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { loadOpening } from '@/data/content';
import { PlayBreadcrumbs } from '@/features/browse/breadcrumbs';
import { useBrowse } from '@/features/browse/store';
import { VariantTags } from '@/features/browse/tag-badge';
import { CourseIntro } from '@/features/course/course-intro';
import { PlayPage } from '@/features/play/play-page';
import { ReviewPage } from '@/features/review/review-page';
import { to } from '@/router/location';
import { lineHref, type LineTab } from './tabs';

/** One line's page: the tab decides what it shows. Learn, Drill and the every-branch drill are the play page. */
export function LinePage({ course, line, tab }: { course: string; line: string; tab: LineTab | 'branches' }) {
  if (tab === 'branches') return <PlayPage course={course} line={line} mode="branches" />;
  if (tab === 'learn') return <PlayPage course={course} line={line} mode="learn" />;
  if (tab === 'drill') return <PlayPage course={course} line={line} mode="practice" />;
  if (tab === 'quiz')
    return <ReviewPage scope={{ course, line }} header={<PlayBreadcrumbs course={course} line={line} tab="quiz" />} />;
  return <LineAbout course={course} line={line} />;
}

const KIND: Record<string, string> = {
  main: 'Main line',
  sideline: 'Sideline',
  rare: 'Rare',
  gambit: 'Gambit',
  'for-us': 'Trap to spring',
  'against-us': 'Trap to avoid',
};

const moveLabel = (ply: number, san: string, numbered: boolean) =>
  ply % 2 === 0 ? `${ply / 2 + 1}. ${san}` : numbered ? `${Math.floor(ply / 2) + 1}... ${san}` : san;

/** The line as paragraphs: a run of moves, then the comment on the last of them. */
type Paragraph = { moves: { ply: number; san: string }[]; comment?: string };

function paragraphsOf(path: LineEdge[], from: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let current: Paragraph = { moves: [] };
  for (let ply = from; ply < path.length; ply++) {
    const edge = path[ply]!;
    current.moves.push({ ply, san: edge.san });
    if (edge.annotation?.text) {
      paragraphs.push({ ...current, comment: edge.annotation.text });
      current = { moves: [] };
    }
  }
  if (current.moves.length) paragraphs.push(current);
  return paragraphs;
}

/**
 * The About tab: what the line is, told mostly in words. A picture of the position where the line becomes itself (the
 * deepest named position on it), where it grows from in the tree and what grows from it, the other courses that teach
 * it, and the line move by move with the reason for each commented move. Clicking a move puts it on the board.
 */
function LineAbout({ course, line }: { course: string; line: string }) {
  const index = useBrowse((state) => state.index);
  const [content, setContent] = useState<OpeningContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The page is mounted afresh for each line (App keys it by the address), so there is no stale course to clear.
    let live = true;
    loadOpening(course)
      .then((loaded) => live && setContent(loaded))
      .catch((caught: unknown) => live && setError(caught instanceof Error ? caught.message : String(caught)));
    return () => {
      live = false;
    };
  }, [course]);

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
  if (!content) return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  if (!variant)
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>No such line</AlertTitle>
          <AlertDescription>
            {content.opening.name} has no line called {line}.{' '}
            <a className="underline" href={to(`/course/${course}`)}>
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
  index: ReturnType<typeof useBrowse.getState>['index'];
}) {
  const { opening } = content;
  const course = opening.id;
  const side = opening.side;
  const path = useMemo(() => variantPath(content, variant.id), [content, variant.id]);
  const named = useMemo(() => namedPly(content, variant.id), [content, variant.id]);
  const [ply, setPly] = useState(named);

  const positions = [opening.rootEpd, ...path.map((edge) => edge.to)];
  const trigger = Math.max(0, positions.indexOf(opening.triggerEpd));
  const epd = positions[ply] ?? opening.rootEpd;
  const positionName = content.nodes[epd]?.name;
  const paragraphs = paragraphsOf(path, trigger);

  // Where the line sits in the tree: what it grows from and what grows from it, found in any course that lists them.
  const entry = index
    .find((candidate) => candidate.id === course)
    ?.lines.find((candidate) => candidate.id === variant.id);
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

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid min-w-0 content-start gap-6">
          <header className="grid gap-2">
            <h1 className="text-2xl font-semibold leading-tight">{variant.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{variant.eco}</Badge>
              {kind && <Badge variant="secondary">{KIND[kind]}</Badge>}
              {variant.alternative && <Badge variant="outline">Alternative: shown, not drilled</Badge>}
              <span className="text-sm text-muted-foreground">
                You play {side}. {variant.opponent && `${other} goes ${variant.opponent}.`}
              </span>
            </div>
            <VariantTags variant={variant} side={side} visible={8} />
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
          </div>

          <section className="grid gap-3" aria-labelledby="line-moves">
            <h2 id="line-moves" className="text-lg font-semibold">
              The line, move by move
            </h2>
            {trigger > 0 && (
              <p className="text-sm text-muted-foreground">
                The course starts after{' '}
                <MoveRun
                  moves={path.slice(0, trigger).map((edge, i) => ({ ply: i, san: edge.san }))}
                  ply={ply}
                  onPick={setPly}
                />
                .
              </p>
            )}
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="leading-relaxed">
                <MoveRun moves={paragraph.moves} ply={ply} onPick={setPly} />
                {paragraph.comment && (
                  <>
                    {' '}
                    <RichText text={paragraph.comment} />
                  </>
                )}
              </p>
            ))}
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
              <a href={to(`/course/${course}`)} className="underline">
                {opening.name}
              </a>
            </h2>
            <CourseIntro summary={opening.summary} about={opening.about} />
          </section>
        </div>

        <aside className="grid content-start gap-2 md:sticky md:top-20 md:self-start">
          <AppBoard
            id="line-about"
            previewable
            className="aspect-square w-full"
            epd={epd}
            orientation={side}
            interactive={false}
            lastMove={ply > 0 ? path[ply - 1]?.uci : undefined}
          />
          <p className="text-sm">
            <span className="font-medium">
              {ply === 0 ? 'The start' : `After ${moveLabel(ply - 1, path[ply - 1]!.san, true)}`}
            </span>
            {positionName && <span className="text-muted-foreground">: {positionName}</span>}
          </p>
          {ply !== named && (
            <Button variant="link" className="h-auto justify-start p-0 text-sm" onClick={() => setPly(named)}>
              Back to the position that names the line
            </Button>
          )}
        </aside>
      </div>
    </Page>
  );
}

/** Moves as small buttons: clicking one shows the position after it. The first move of a run carries its number. */
function MoveRun({
  moves,
  ply,
  onPick,
}: {
  moves: { ply: number; san: string }[];
  ply: number;
  onPick: (ply: number) => void;
}) {
  return (
    <>
      {moves.map((move, i) => (
        <span key={move.ply}>
          {i > 0 && ' '}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className={`h-auto px-0.5 font-mono font-medium hover:underline ${move.ply + 1 === ply ? 'bg-secondary' : ''}`}
            onClick={() => onPick(move.ply + 1)}
          >
            {moveLabel(move.ply, move.san, i === 0)}
          </Button>
        </span>
      ))}
    </>
  );
}
