import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ExternalLink, PageSection } from '@/components/shared/page-section';
import { to } from '@/router/location';

/** Every library the site ships or is built with, with its licence as declared by the installed package. */
const LIBRARIES: { name: string; use: string; licence: string; href: string }[] = [
  { name: 'React', use: 'The interface', licence: 'MIT', href: 'https://react.dev' },
  { name: 'Vite', use: 'Building and running the site', licence: 'MIT', href: 'https://vite.dev' },
  { name: 'Tailwind CSS', use: 'Styling', licence: 'MIT', href: 'https://tailwindcss.com' },
  { name: 'shadcn/ui and Radix UI', use: 'Interface components', licence: 'MIT', href: 'https://ui.shadcn.com' },
  { name: 'cmdk', use: 'Search menus', licence: 'MIT', href: 'https://github.com/pacocoursey/cmdk' },
  { name: 'Lucide', use: 'Icons', licence: 'ISC', href: 'https://lucide.dev' },
  { name: 'Apache ECharts', use: 'Charts', licence: 'Apache-2.0', href: 'https://echarts.apache.org' },
  {
    name: 'react-chessboard',
    use: 'The board',
    licence: 'MIT',
    href: 'https://github.com/Clariity/react-chessboard',
  },
  { name: 'chess.js', use: 'The rules of chess', licence: 'BSD-2-Clause', href: 'https://github.com/jhlywa/chess.js' },
  {
    name: '@mliebelt/pgn-parser',
    use: 'Reading PGN',
    licence: 'Apache-2.0',
    href: 'https://github.com/mliebelt/pgn-parser',
  },
  {
    name: 'ts-fsrs',
    use: 'Spaced repetition',
    licence: 'MIT',
    href: 'https://github.com/open-spaced-repetition/ts-fsrs',
  },
  { name: 'SQLite Wasm', use: 'The database in your browser', licence: 'Apache-2.0', href: 'https://sqlite.org/wasm' },
  { name: 'Zod', use: 'Checking data', licence: 'MIT', href: 'https://zod.dev' },
  { name: 'YAML', use: 'Reading content', licence: 'ISC', href: 'https://github.com/eemeli/yaml' },
];

/** Who and what the site is built on, and the licences (docs/v2/pages/credits.md). */
export function CreditsPage() {
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-8">
      <Breadcrumbs root={{ label: 'Credits', href: to('/credits') }} />
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Credits and licences</h1>
        <p className="text-muted-foreground">
          Knight School is free and open source, runs entirely in your browser, and stands on the work below.
        </p>
      </div>
      <PageSection title="Stockfish">
        <p>
          The engine is <ExternalLink href="https://stockfishchess.org">Stockfish</ExternalLink>, built for the browser
          by the <ExternalLink href="https://github.com/nmrugg/stockfish.js">stockfish.js</ExternalLink> project. It
          runs as a separate program and the site speaks to it over UCI. Stockfish is licensed under the{' '}
          <ExternalLink href="https://www.gnu.org/licenses/gpl-3.0.html">GNU General Public License v3.0</ExternalLink>;
          its source is at{' '}
          <ExternalLink href="https://github.com/official-stockfish/Stockfish">
            official-stockfish/Stockfish
          </ExternalLink>
          .
        </p>
      </PageSection>
      <PageSection title="Lichess">
        <p>
          What players at your level play comes from the{' '}
          <ExternalLink href="https://lichess.org/api#tag/Opening-Explorer">Lichess opening explorer</ExternalLink>, and
          the names of positions from the{' '}
          <ExternalLink href="https://github.com/lichess-org/chess-openings">chess-openings</ExternalLink> list (CC0).
          The puzzles come from the{' '}
          <ExternalLink href="https://database.lichess.org/#puzzles">Lichess puzzle database</ExternalLink> (CC0); the
          ones matching your openings ship with the site.
        </p>
      </PageSection>
      <PageSection title="Libraries">
        <ul className="grid gap-1">
          {LIBRARIES.map((library) => (
            <li key={library.name} className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span>
                <ExternalLink href={library.href}>{library.name}</ExternalLink>: {library.use.toLowerCase()}
              </span>
              <span className="tabular-nums">{library.licence}</span>
            </li>
          ))}
        </ul>
      </PageSection>
      <PageSection title="Licence">
        <p>
          Knight School&apos;s own code is MIT licensed, © 2026 Niall Twomey. The source is on{' '}
          <ExternalLink href="https://github.com/njtwomey/knightschool">GitHub</ExternalLink>.
        </p>
      </PageSection>
    </main>
  );
}
