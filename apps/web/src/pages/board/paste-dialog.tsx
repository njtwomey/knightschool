import { type LoadedGame } from '@knightschool/core';
import { loadGame } from '@knightschool/core/pgn';
import { ClipboardPaste } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Paste a FEN or a PGN onto the board. Text that is neither says why and stays to be fixed; a PGN that breaks part-way
 * loads the moves before the break, and the page says where it stopped.
 */
export function PasteDialog({ onLoad }: { onLoad: (game: LoadedGame) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const load = () => {
    const result = loadGame(text);
    if (!result.ok) {
      setProblem(result.problem);
      return;
    }
    onLoad(result.game);
    setOpen(false);
    setText('');
    setProblem(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setProblem(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 sm:h-8">
          <ClipboardPaste aria-hidden />
          Paste
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paste a position or a game</DialogTitle>
          <DialogDescription>A FEN puts that position on the board; a PGN plays its moves.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="board-paste" className="sr-only">
            FEN or PGN
          </Label>
          <Textarea
            id="board-paste"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setProblem(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                load();
              }
            }}
            placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bc4\nor rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'}
            className="min-h-40 font-mono text-sm"
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? 'board-paste-problem' : undefined}
            autoFocus
          />
          {problem ? (
            <p id="board-paste-problem" className="text-sm text-destructive">
              {problem}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={load} disabled={!text.trim()}>
            Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
