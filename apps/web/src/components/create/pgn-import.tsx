import { FileUp, Link2, ClipboardPaste } from 'lucide-react';
import { useId, useState } from 'react';
import { MoveRun } from '@/components/chess/move-run';
import { FilterToggle, type FilterOption } from '@/components/finding/filter-toggle';
import { EmptyState } from '@/components/shared/empty-state';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { findRows, type FoundRow } from './pgn-rows';
import { ProblemsList } from './problems-list';

export type { FoundRow } from './pgn-rows';

const SIDES: FilterOption<'white' | 'black'>[] = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
];

export type ImportOpening = { id: string; name: string; side: 'white' | 'black' };

export type PgnImportProps = {
  /** An opening to add to, or none for a new one. */
  target?: ImportOpening;
  /** Your openings, to pick from when there is no target. */
  openings: ImportOpening[];
  /** A comment already written for this move (one comment per move): the existing one stays. */
  existingComment?: (before: string, uci: string) => string | null;
  /** Where these moves leave a line already in the tree ("Starts after 4.c3 in Giuoco Piano main"). */
  joinsAt?: (ucis: string[]) => string | null;
  /** Fetches a public study's PGN; defaults to Lichess's export. */
  fetchStudy?: (url: string) => Promise<string>;
  offline?: boolean;
  /** One undoable action: "import 4 lines from Two Knights study". */
  onImport: (
    rows: FoundRow[],
    into: ImportOpening | { new: true; name: string; side: 'white' | 'black' },
    label: string,
  ) => void;
  /** Starts with this text in the paste box (and reads it). */
  initialText?: string;
};

const STUDY = /lichess\.org\/study\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?/;

async function lichessStudy(url: string): Promise<string> {
  const match = STUDY.exec(url);
  if (!match) throw new Error('That is not a Lichess study address.');
  const address = `https://lichess.org/api/study/${match[1]}${match[2] ? `/${match[2]}` : ''}.pgn?comments=true&variations=true`;
  const response = await fetch(address);
  if (!response.ok)
    throw new Error(response.status === 404 ? 'No public study at that address.' : 'Lichess did not answer.');
  return response.text();
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function becomes(row: FoundRow): string {
  const { lines, refutations, comments, marks, symbols } = row.counts;
  return [
    plural(lines, 'line'),
    refutations ? plural(refutations, 'refutation') : null,
    comments ? plural(comments, 'comment') : null,
    marks ? plural(marks, 'mark') : null,
    symbols ? plural(symbols, 'symbol') : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Bringing moves written elsewhere into Create: a pasted PGN, a .pgn file, or a public Lichess study. Shows what it
 * found before anything is saved, then imports it as one undoable action (docs/v2/components/pgn-import.md).
 */
export function PgnImport({
  target,
  openings,
  existingComment,
  joinsAt,
  fetchStudy = lichessStudy,
  offline = false,
  onImport,
  initialText = '',
}: PgnImportProps) {
  const id = useId();
  const [text, setText] = useState(initialText);
  const [source, setSource] = useState(initialText ? 'the pasted PGN' : '');
  const [rows, setRows] = useState<FoundRow[] | null>(() =>
    initialText ? findRows(initialText, existingComment, joinsAt) : null,
  );
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(rows?.map((row) => row.id)));
  const [studyUrl, setStudyUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [into, setInto] = useState<string>(target?.id ?? 'new');
  const [newName, setNewName] = useState('');
  const [newSide, setNewSide] = useState<'white' | 'black'>('white');

  const read = (pgn: string, from: string) => {
    setError(null);
    const found = findRows(pgn, existingComment, joinsAt);
    if (found.length === 0) {
      setRows(null);
      setError('No moves found. Paste the PGN with its moves, such as 1. e4 e5 2. Nf3.');
      return;
    }
    setRows(found);
    setTicked(new Set(found.map((row) => row.id)));
    setSource(from);
  };

  const chosen = rows?.filter((row) => ticked.has(row.id)) ?? [];
  const lineCount = chosen.reduce((sum, row) => sum + row.counts.lines, 0);
  const destination =
    into === 'new'
      ? newName.trim()
        ? { new: true as const, name: newName.trim(), side: newSide }
        : null
      : (openings.find((opening) => opening.id === into) ?? target ?? null);

  return (
    <div className="grid gap-4">
      <Tabs defaultValue="paste">
        <TabsList>
          <TabsTrigger value="paste">
            <ClipboardPaste aria-hidden /> Paste
          </TabsTrigger>
          <TabsTrigger value="file">
            <FileUp aria-hidden /> File
          </TabsTrigger>
          <TabsTrigger value="study">
            <Link2 aria-hidden /> Lichess study
          </TabsTrigger>
        </TabsList>
        <TabsContent value="paste" className="grid gap-2">
          <Label htmlFor={`${id}-paste`} className="sr-only">
            PGN
          </Label>
          <Textarea
            id={`${id}-paste`}
            rows={6}
            value={text}
            className="font-mono text-xs"
            placeholder={
              '[Event "Fried Liver"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 (5... Na5) 6. Nxf7'
            }
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            className="justify-self-start"
            size="sm"
            disabled={!text.trim()}
            onClick={() => read(text, 'the pasted PGN')}
          >
            Read it
          </Button>
        </TabsContent>
        <TabsContent value="file" className="grid gap-2">
          <Label htmlFor={`${id}-file`}>A .pgn file</Label>
          <Input
            id={`${id}-file`}
            type="file"
            accept=".pgn,application/x-chess-pgn,text/plain"
            className="max-w-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) read(await file.text(), file.name);
            }}
          />
        </TabsContent>
        <TabsContent value="study" className="grid gap-2">
          {offline ? (
            <EmptyState kind="offline" size="part" text="Needs a connection. Paste and File still work." />
          ) : (
            <>
              <Label htmlFor={`${id}-study`}>A public study’s address</Label>
              <div className="flex max-w-xl gap-2">
                <Input
                  id={`${id}-study`}
                  value={studyUrl}
                  placeholder="https://lichess.org/study/…"
                  onChange={(event) => setStudyUrl(event.target.value)}
                />
                <Button
                  size="sm"
                  className="h-auto"
                  disabled={!STUDY.test(studyUrl) || reading}
                  onClick={async () => {
                    setReading(true);
                    try {
                      read(await fetchStudy(studyUrl), 'the Lichess study');
                    } catch (failure) {
                      setError(failure instanceof Error ? failure.message : 'Could not reach Lichess.');
                    } finally {
                      setReading(false);
                    }
                  }}
                >
                  {reading ? 'Reading…' : 'Read it'}
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {error ? <Notice kind="error" text={error} /> : null}

      {rows ? (
        <section className="grid gap-3" aria-label="What was found">
          <h3 className="text-sm font-medium">
            Found in {source}: {plural(rows.length, 'game')}
          </h3>
          <ul className="grid gap-2">
            {rows.map((row) => {
              const main = row.lines.find((line) => line.kind === 'main')!;
              const on = ticked.has(row.id);
              return (
                <li key={row.id} className={cn('grid gap-2 rounded-lg border p-3', !on && 'opacity-60')}>
                  <div className="flex flex-wrap items-start gap-3">
                    <Checkbox
                      id={`${id}-${row.id}`}
                      checked={on}
                      className="mt-0.5"
                      onCheckedChange={(next) => {
                        const set = new Set(ticked);
                        if (next === true) set.add(row.id);
                        else set.delete(row.id);
                        setTicked(set);
                      }}
                    />
                    <div className="grid min-w-0 flex-1 gap-1">
                      <Label htmlFor={`${id}-${row.id}`} className="font-medium">
                        {row.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {plural(Math.ceil(row.plies / 2), 'move')} · becomes {becomes(row)}
                        {row.joins ? ` · ${row.joins}` : ''}
                      </p>
                      <div className="text-sm">
                        <MoveRun
                          moves={main.moves
                            .slice(0, 12)
                            .map((move) => ({ san: move.san, uci: move.uci, after: move.epd }))}
                          firstPly={main.startPly}
                        />
                        {main.moves.length > 12 ? <span className="text-muted-foreground"> …</span> : null}
                      </div>
                    </div>
                  </div>
                  <ProblemsList problems={row.problems} className="border-dashed" />
                </li>
              );
            })}
          </ul>

          <div className="grid gap-3 rounded-lg border p-3">
            {target ? (
              <p className="text-sm">
                Into <span className="font-medium">{target.name}</span>, as{' '}
                {target.side === 'white' ? 'White' : 'Black'}.
              </p>
            ) : (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-into`}>Into which opening</Label>
                  <Select value={into} onValueChange={setInto}>
                    <SelectTrigger id={`${id}-into`} className="w-full sm:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">A new opening</SelectItem>
                      {openings.map((opening) => (
                        <SelectItem key={opening.id} value={opening.id}>
                          {opening.name} ({opening.side === 'white' ? 'White' : 'Black'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {into === 'new' ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor={`${id}-name`}>Name</Label>
                      <Input
                        id={`${id}-name`}
                        value={newName}
                        placeholder={rows[0]?.name ?? 'My opening'}
                        className="w-64"
                        onChange={(event) => setNewName(event.target.value)}
                      />
                    </div>
                    <FilterToggle
                      label="Written for"
                      size="sm"
                      value={newSide}
                      options={SIDES}
                      onChange={setNewSide}
                      className="self-end"
                    />
                  </div>
                ) : null}
              </>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={lineCount === 0 || !destination}
                onClick={() =>
                  destination && onImport(chosen, destination, `import ${plural(lineCount, 'line')} from ${source}`)
                }
              >
                Import {plural(lineCount, 'line')}
              </Button>
              {!destination && lineCount > 0 ? (
                <p className="text-sm text-muted-foreground">Name the new opening first.</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
