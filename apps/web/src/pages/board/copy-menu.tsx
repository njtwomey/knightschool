import { fenAfter, pgnFor } from '@knightschool/core';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** How long "Copied" stays on the button. */
const COPIED_MS = 1500;

type What = 'FEN' | 'PGN' | 'link';

/** Copy the position shown (FEN), every move played (PGN), or a link to exactly this view. */
export function CopyMenu({ fen, moves, sans }: { fen: string; moves: string[]; sans: string[] }) {
  const [copied, setCopied] = useState<What | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!copied && !failed) return;
    const id = window.setTimeout(() => {
      setCopied(null);
      setFailed(false);
    }, COPIED_MS);
    return () => window.clearTimeout(id);
  }, [copied, failed]);

  const copy = async (what: What) => {
    const text = what === 'FEN' ? fenAfter(fen, moves) : what === 'PGN' ? pgnFor(fen, sans) : window.location.href;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setFailed(true);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 sm:h-8" aria-live="polite">
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? `Copied the ${copied}` : failed ? 'Could not copy' : 'Copy'}
          <ChevronDown aria-hidden className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => copy('FEN')}>FEN of this position</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy('PGN')}>PGN of the moves</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy('link')}>Link to this board</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
