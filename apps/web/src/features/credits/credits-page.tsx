import { Page } from '@/components/page';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const LIBRARIES: { name: string; use: string; licence: string; href: string }[] = [
  { name: 'React', use: 'The interface', licence: 'MIT', href: 'https://react.dev' },
  { name: 'Vite', use: 'Building and running the site', licence: 'MIT', href: 'https://vite.dev' },
  { name: 'Tailwind CSS', use: 'Styling', licence: 'MIT', href: 'https://tailwindcss.com' },
  { name: 'shadcn/ui and Radix UI', use: 'Interface components', licence: 'MIT', href: 'https://ui.shadcn.com' },
  { name: 'Lucide', use: 'Icons', licence: 'ISC', href: 'https://lucide.dev' },
  {
    name: 'react-chessboard',
    use: 'The board, and its default piece drawings',
    licence: 'MIT',
    href: 'https://github.com/Clariity/react-chessboard',
  },
  {
    name: 'chess.js',
    use: 'Chess rules and move checking',
    licence: 'BSD-2-Clause',
    href: 'https://github.com/jhlywa/chess.js',
  },
  {
    name: '@mliebelt/pgn-parser',
    use: 'Reading PGN with variations and comments',
    licence: 'Apache-2.0',
    href: 'https://github.com/mliebelt/pgn-parser',
  },
  {
    name: 'ts-fsrs',
    use: 'Spaced-repetition scheduling (FSRS)',
    licence: 'MIT',
    href: 'https://github.com/open-spaced-repetition/ts-fsrs',
  },
  { name: 'SQLite WASM', use: 'The database in your browser', licence: 'Apache-2.0', href: 'https://sqlite.org/wasm' },
  {
    name: 'Drizzle ORM',
    use: 'Database queries and migrations',
    licence: 'Apache-2.0',
    href: 'https://orm.drizzle.team',
  },
  { name: 'Zod', use: 'Checking data', licence: 'MIT', href: 'https://zod.dev' },
  { name: 'Zustand', use: 'Screen state', licence: 'MIT', href: 'https://zustand.docs.pmnd.rs' },
];

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-primary"
    >
      {children}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

export function CreditsPage() {
  return (
    <Page className="gap-6">
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">Credits</h2>
        <p className="text-muted-foreground">
          Knight School is free software under the MIT licence. It stands on the work below.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Stockfish</CardTitle>
          <CardDescription>The chess engine behind the evaluation bar and "Measure this line".</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>
            Stockfish is a separate program licensed under the GNU General Public License, version 3. Knight School does
            not include its code in the site's own code: the engine file is loaded into a background worker from{' '}
            <code>/engine/</code>, and the site talks to it only by sending it text commands (the UCI protocol). This
            build is the lite, single-threaded Stockfish 19 from the{' '}
            <Link href="https://github.com/nmrugg/stockfish.js">stockfish.js</Link> project.
          </p>
          <ul className="grid gap-1">
            <li>
              Licence text:{' '}
              <a
                className="underline underline-offset-4 hover:text-primary"
                href={`${import.meta.env.BASE_URL}engine/COPYING.txt`}
              >
                COPYING.txt
              </a>{' '}
              (also at <Link href="https://www.gnu.org/licenses/gpl-3.0.html">gnu.org</Link>)
            </li>
            <li>
              Source code: <Link href="https://github.com/official-stockfish/Stockfish">Stockfish</Link> and{' '}
              <Link href="https://github.com/nmrugg/stockfish.js">stockfish.js</Link>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Libraries</CardTitle>
          <CardDescription>Everything else the site is built from.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Used for</TableHead>
                <TableHead>Licence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LIBRARIES.map((library) => (
                <TableRow key={library.name}>
                  <TableCell className="whitespace-normal font-medium">
                    <Link href={library.href}>{library.name}</Link>
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{library.use}</TableCell>
                  <TableCell>{library.licence}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>
            Opening names and ECO codes come from the{' '}
            <Link href="https://github.com/lichess-org/chess-openings">Lichess chess-openings list</Link> (CC0, public
            domain). Move popularity, when shown, comes from the{' '}
            <Link href="https://lichess.org/api#tag/Opening-Explorer">Lichess opening explorer</Link>, whose game data
            is CC0.
          </p>
          <p>
            Course lines and notes are original to Knight School. The piece drawings are the default set that ships with
            react-chessboard.
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}
