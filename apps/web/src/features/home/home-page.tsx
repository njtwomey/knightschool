import { Page } from '@/components/page';
import { playUci, START_EPD } from '@knightschool/core';
import { ArrowRight, Library, Search, Telescope, Timer } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { Button } from '@/components/ui/button';
import { useStorage } from '@/data/storage';
import { useProgress } from '@/features/courses/progress';
import { to } from '@/router/location';

// The Giuoco Piano: a line worth watching, played over and over on the front page, with the idea of each move.
const SHOWCASE: { uci: string; why: string }[] = [
  { uci: 'e2e4', why: 'White takes the centre.' },
  { uci: 'e7e5', why: 'Black takes the centre too.' },
  { uci: 'g1f3', why: 'Attacks the e5 pawn and develops a piece.' },
  { uci: 'b8c6', why: 'Defends it and develops.' },
  { uci: 'f1c4', why: 'Aims at f7, Black’s weak spot.' },
  { uci: 'f8c5', why: 'Black mirrors it.' },
  { uci: 'c2c3', why: 'Prepares d4 to build a big centre.' },
  { uci: 'g8f6', why: 'Counter-attacks the e4 pawn.' },
  { uci: 'd2d4', why: 'Strikes at the centre.' },
  { uci: 'e5d4', why: 'Black takes the pawn.' },
  { uci: 'c3d4', why: 'White takes back and attacks the bishop.' },
  { uci: 'c5b4', why: 'Black checks, saving the bishop.' },
  { uci: 'b1c3', why: 'Blocks the check and develops.' },
  { uci: 'f6e4', why: 'Takes a pawn: the Moscow Gambit, full of tricks.' },
];

/** The showcase line as positions with their move text, worked out once. */
function useShowcase() {
  return useMemo(() => {
    let epd = START_EPD;
    const frames = [{ epd, label: 'Start', why: 'The usual starting position.' }];
    SHOWCASE.forEach(({ uci, why }, i) => {
      const move = playUci(epd, uci);
      epd = move.epd;
      frames.push({ epd, label: `${Math.floor(i / 2) + 1}${i % 2 ? '...' : '.'} ${move.san}`, why });
    });
    return frames;
  }, []);
}

/** A board that plays through the showcase line by itself, and stands still for anyone who prefers no motion. */
function HeroBoard() {
  const frames = useShowcase();
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [step, setStep] = useState(still ? frames.length - 1 : 0);

  useEffect(() => {
    if (still) return;
    const timer = setInterval(() => setStep((current) => (current + 1) % (frames.length + 3)), 1100);
    return () => clearInterval(timer);
  }, [still, frames.length]);

  const frame = frames[Math.min(step, frames.length - 1)]!;
  return (
    <div className="grid w-full max-w-md gap-3 justify-self-center">
      <div className="rounded-2xl border bg-card p-3 shadow-lg">
        <AppBoard
          id="home-hero"
          className="aspect-square w-full"
          epd={frame.epd}
          orientation="white"
          interactive={false}
          coordinates={false}
          lastMove={step > 0 ? SHOWCASE[Math.min(step, SHOWCASE.length) - 1]?.uci : undefined}
        />
      </div>
      <p className="flex min-h-10 items-baseline gap-3 text-sm" aria-live="off">
        <span className="w-16 shrink-0 font-mono font-medium">{frame.label}</span>
        <span className="text-muted-foreground">{frame.why}</span>
      </p>
      <div className="flex items-center justify-end text-sm">
        <a
          href={to('/play/vs-e5-italian/giuoco-piano/about')}
          className="flex items-center gap-1 font-medium hover:underline"
        >
          Learn this line <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function Tile({ value, label, href }: { value: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="rounded-xl border bg-card p-4 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </a>
  );
}

function Feature({
  href,
  icon,
  title,
  children,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="group grid content-start gap-2 rounded-2xl border bg-card p-5 outline-none transition-colors hover:border-primary/60 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary [&_svg]:size-6">
        {icon}
      </span>
      <h3 className="flex items-center justify-between text-lg font-semibold">
        {title}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </a>
  );
}

/** The front door: the icon, what this is for, a board that is already playing, and where you are. */
export function HomePage() {
  const storage = useStorage((state) => state.storage);
  const learned = useProgress((state) => state.learned);
  const [due, setDue] = useState<number | null>(null);

  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    void useProgress.getState().refresh();
    storage.storage.cards
      .countDue(new Date().toISOString())
      .then((count) => !cancelled && setDue(count))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const moves = Object.values(learned).reduce((sum, n) => sum + n, 0);
  const courses = Object.values(learned).filter((n) => n > 0).length;

  return (
    <Page className="gap-10">
      <section className="grid items-center gap-8 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-background p-6 md:grid-cols-[1.1fr_1fr] md:p-10">
        <div className="grid gap-5">
          <img
            src={`${import.meta.env.BASE_URL}icon.svg`}
            alt="Knight School: a knight wearing a graduation cap"
            className="size-24 rounded-3xl shadow-lg ring-1 ring-primary/30"
          />
          <div className="grid gap-2">
            <h1 className="text-5xl font-semibold tracking-tight">Knight School</h1>
            <p className="text-xl text-muted-foreground">Learn chess openings, and actually keep them.</p>
          </div>
          <p className="max-w-lg text-muted-foreground">
            Every move comes with the reason for it, then a quiz brings it back just before you would forget. Traps,
            gambits and the famous ideas are in here too. It all runs in your browser and stays on this device.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={to('/search')}>
                <Search aria-hidden /> Start learning
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={to('/quiz')}>
                <Library aria-hidden /> Quiz{due ? ` (${due})` : ''}
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href={to('/name')}>
                <Telescope aria-hidden /> Name That Opening
              </a>
            </Button>
          </div>
        </div>
        <HeroBoard />
      </section>

      <section className="grid gap-3" aria-label="Your progress">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Where you are</h2>
          <a href={to('/profile')} className="text-sm font-medium hover:underline">
            Open your overview
          </a>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Tile value={due === null ? '–' : String(due)} label="due in the quiz" href={to('/quiz')} />
          <Tile value={String(moves)} label="moves learned" href={to('/profile')} />
          <Tile value={String(courses)} label="courses started" href={to('/profile')} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="What you can do">
        <Feature href={to('/search')} icon={<Search aria-hidden />} title="Search what there is to learn">
          Openings, single lines and motifs like the Traxler and the Fried Liver. Search by name, or play the moves on a
          board.
        </Feature>
        <Feature href={to('/quiz')} icon={<Library aria-hidden />} title="Quiz yourself">
          Short sessions of the moves that are due, from every course you are learning.
        </Feature>
        <Feature href={to('/speed')} icon={<Timer aria-hidden />} title="Test your speed">
          Play lines you know against the clock. The other side replies instantly, and you get your average time per
          move.
        </Feature>
        <Feature href={to('/name')} icon={<Telescope aria-hidden />} title="Name that opening">
          A position comes up. Say where it came from, and get half a point for the opening alone.
        </Feature>
      </section>
    </Page>
  );
}
