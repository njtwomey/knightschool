import { Download, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStorage } from '@/data/storage';

type Stats = { cards: number; reviews: number; quizAttempts: number };

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

export function DataSection() {
  const { status, error, storage } = useStorage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Bumped after each action so the counts are read again.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = storage ? await storage.storage.stats() : null;
      if (!cancelled) setStats(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [storage, version]);

  async function run(action: () => Promise<string>) {
    try {
      setMessage({ ok: true, text: await action() });
      setVersion((current) => current + 1);
    } catch (failure) {
      setMessage({ ok: false, text: failure instanceof Error ? failure.message : String(failure) });
    }
  }

  async function importFile(file: File) {
    if (!storage) return;
    await run(async () => {
      if (/\.(sqlite|db)$/i.test(file.name)) {
        await storage.importSqlite(new Uint8Array(await file.arrayBuffer()));
        return `Replaced your data with ${file.name}.`;
      }
      const report = await storage.importJson(JSON.parse(await file.text()));
      const total = Object.values(report).reduce((sum, n) => sum + n, 0);
      return `Merged ${total} rows from ${file.name}. Newer copies win; nothing was deleted.`;
    });
    if (fileInput.current) fileInput.current.value = '';
  }

  if (status !== 'ready' || !storage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>Progress is saved in this browser, on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'opening' || status === 'idle' ? (
            <p className="text-sm text-muted-foreground">Opening your data…</p>
          ) : (
            <Alert variant={status === 'paused' ? 'default' : 'destructive'}>
              <AlertTitle>{status === 'paused' ? 'Open in another tab' : 'Your data is not available'}</AlertTitle>
              <AlertDescription className="grid gap-2">
                {error}
                {status === 'paused' && (
                  <Button size="sm" className="w-fit" onClick={() => void useStorage.getState().open()}>
                    Use Knight School in this tab
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>
          Saved in this browser, on this device.{' '}
          {stats && `${stats.cards} cards, ${stats.reviews} reviews, ${stats.quizAttempts} quiz answers.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              run(async () => {
                download(
                  `knightschool-${today()}.json`,
                  JSON.stringify(await storage.exportJson(), null, 2),
                  'application/json',
                );
                return 'Exported a readable JSON copy.';
              })
            }
          >
            <Download aria-hidden /> Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              run(async () => {
                download(`knightschool-${today()}.sqlite`, await storage.exportSqlite(), 'application/vnd.sqlite3');
                return 'Exported the SQLite database file.';
              })
            }
          >
            <Download aria-hidden /> Export database
          </Button>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="import-file">
            <Upload className="size-4" aria-hidden /> Import
          </Label>
          <Input
            id="import-file"
            ref={fileInput}
            type="file"
            accept=".json,.sqlite,.db,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
          />
          <p className="text-xs text-muted-foreground">
            A JSON file is merged into what you have. A database file replaces everything.
          </p>
        </div>
        {message && (
          <Alert variant={message.ok ? 'default' : 'destructive'} role="status">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-fit">
              <Trash2 aria-hidden /> Delete all my data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete everything?</AlertDialogTitle>
              <AlertDialogDescription>
                Every card, review and setting stored on this device is removed. Export first if you want a copy.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my data</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  run(async () => {
                    await storage.wipe();
                    return 'Deleted everything on this device.';
                  })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
