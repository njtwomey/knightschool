import { dueCards, numberedMove, START_EPD } from '@knightschool/core';
import { ArrowRight, BookOpen, Dumbbell, Route, Search, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { CardLink, LINKED_CARD } from '@/components/shared/card-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { loadOpening } from '@/data/content';
import { learnerStore } from '@/data/learner';
import { siteConfig } from '@/data/site-config';
import { lineMoves } from '@/features/learn/model';
import { lineHref } from '@/features/learn/views';
import { useLoad } from '@/hooks/use-load';
import { cn } from '@/lib/utils';
import { to } from '@/router/location';

/** The line the front page plays by itself: the Italian's main line, with its own notes. */
const SHOWCASE = { opening: 'italian-white', line: 'giuoco-main' };

const firstSentence = (text: string) => text.match(/^.*?[.?!](?=\s|$)/)?.[0] ?? text;

/** A board that plays through the showcase line by itself, and stands still for anyone who prefers no motion. */
function HeroBoard() {
  const moves = useLoad(async () => lineMoves(await loadOpening(SHOWCASE.opening), SHOWCASE.line), []).data;
  const count = moves?.length ?? 0;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (still || !count) return;
    // A short rest on the last position before it starts again.
    const timer = setInterval(() => setStep((at) => (at + 1) % (count + 4)), siteConfig.timing.homeMove);
    return () => clearInterval(timer);
  }, [still, count]);
  const at = Math.min(still ? count : step, count);
  const move = at > 0 ? moves?.[at - 1] : undefined;
  return (
    <div className="grid w-full max-w-md gap-3 justify-self-center">
      <div className="rounded-2xl border bg-card p-3 shadow-lg">
        <BoardThumb
          id="home-hero"
          epd={move?.after ?? START_EPD}
          orientation="white"
          className="w-full"
          {...(move ? { lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) } } : {})}
        />
      </div>
      <p className="flex min-h-14 items-baseline gap-3 text-sm" aria-live="off">
        <span className="w-16 shrink-0 font-mono font-medium">{move ? numberedMove(move.ply, move.san) : 'Start'}</span>
        <span className="text-muted-foreground">{move?.note?.text ? firstSentence(move.note.text) : ''}</span>
      </p>
      <div className="flex justify-end text-sm">
        <a
          href={lineHref(SHOWCASE.opening, SHOWCASE.line)}
          className="flex items-center gap-1 font-medium hover:underline"
        >
          Learn this line <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function Feature({
  href,
  icon: Icon,
  title,
  children,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn(LINKED_CARD, 'gap-2 p-5')}>
      <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary [&_svg]:size-6">
        <Icon aria-hidden />
      </span>
      <h3 className="text-lg font-semibold">
        <CardLink href={href}>{title}</CardLink>
      </h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </Card>
  );
}

/** Where a returning learner is, read from the database alone, so the front page stays quick. */
function WhereYouAre() {
  const cards = useLoad(async () => {
    const store = await learnerStore();
    const all = await store.cards.all();
    return { total: all.length, due: dueCards(all, new Date()).length };
  }, []).data;
  if (!cards?.total) return null;
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <p className="text-sm">
        <span className="font-medium tabular-nums">{cards.due}</span> due today,{' '}
        <span className="font-medium tabular-nums">{cards.total}</span> {cards.total === 1 ? 'move' : 'moves'} in your
        reviews.
      </p>
      <Button asChild size="sm">
        <a href={to('/today')}>
          Continue <ArrowRight aria-hidden />
        </a>
      </Button>
    </section>
  );
}

/** The front door: the icon, what this is for, a board that is already playing, and what there is (first-visit.md). */
export function HomePage() {
  return (
    <main className="mx-auto grid max-w-7xl gap-10 px-4 py-8">
      <section className="grid items-center gap-8 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-background p-6 md:grid-cols-[1.1fr_1fr] md:p-10">
        <div className="grid gap-5">
          <img
            src={to('/icon.svg')}
            alt="Knight School: a knight wearing a graduation cap"
            className="size-24 rounded-3xl shadow-lg ring-1 ring-primary/30"
          />
          <div className="grid gap-2">
            <h1 className="text-5xl font-semibold tracking-tight">Knight School</h1>
            <p className="text-xl text-muted-foreground">Learn chess openings and remember them.</p>
          </div>
          <p className="max-w-lg text-muted-foreground">
            Every move comes with the reason for it. Learn the main line, then how to punish common mistakes. Reviews
            bring moves back before you forget them.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={to('/openings')}>
                <BookOpen aria-hidden /> Start learning
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={to('/practice')}>
                <Dumbbell aria-hidden /> Practise
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">No account needed. Your progress stays on this device.</p>
        </div>
        <HeroBoard />
      </section>
      <WhereYouAre />
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="What you can do">
        <Feature href={to('/openings')} icon={BookOpen} title="Learn an opening">
          Go through each line move by move, with the reason for each one. Then play it yourself.
        </Feature>
        <Feature href={to('/practice')} icon={Dumbbell} title="Practise">
          Review what you have learned, drill your lines, and solve puzzles.
        </Feature>
        <Feature href={to('/openings/italian-white/map')} icon={Route} title="See the map">
          See every line of an opening as a tree, with common mistakes marked.
        </Feature>
        <Feature href={to('/explore/search')} icon={Search} title="Search">
          Find an opening by name, or play moves on a board to find it.
        </Feature>
      </section>
    </main>
  );
}
