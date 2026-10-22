import { epdToFen } from '@knightschool/core';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FEEDBACK_DELAYS } from '@/lib/feedback';

/** The game as PGN, and the position on the board as FEN, to copy out. */
export function CopyCard({ pgn, epd, onProblem }: { pgn: string; epd: string; onProblem: (text: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(what: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), FEEDBACK_DELAYS.copied);
    } catch {
      onProblem('Your browser would not let me copy. Select the text and copy it by hand.');
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Copy</CardTitle>
        <CardDescription>
          The PGN has the start position in its header when it is not the usual one, so it reproduces exactly what is on
          the board.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Textarea
          readOnly
          rows={4}
          value={pgn}
          className="font-mono text-sm"
          aria-label="PGN"
          onFocus={(event) => event.target.select()}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void copy('pgn', pgn)}>
            <Copy aria-hidden /> {copied === 'pgn' ? 'Copied the PGN' : 'Copy PGN'}
          </Button>
          <Button variant="outline" onClick={() => void copy('fen', epdToFen(epd, 0, 1))}>
            <Copy aria-hidden /> {copied === 'fen' ? 'Copied the FEN' : 'Copy this position (FEN)'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
