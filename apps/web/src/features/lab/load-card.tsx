import { epdToFen } from '@knightschool/core';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** A box to paste a PGN or FEN into, and the position on the board as FEN. `onLoad` says whether the text was read. */
export function LoadCard({ epd, onLoad }: { epd: string; onLoad: (text: string) => boolean }) {
  const [paste, setPaste] = useState('');
  const load = () => {
    if (onLoad(paste)) setPaste('');
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Load</CardTitle>
        <CardDescription>Paste a PGN or a FEN to put it on the board.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Label htmlFor="lab-paste" className="sr-only">
          PGN or FEN
        </Label>
        <Textarea
          id="lab-paste"
          rows={3}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          placeholder="1. e4 e5 2. Nf3 Nc6 …  or  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          className="font-mono text-sm"
        />
        <div>
          <Button variant="outline" disabled={!paste.trim()} onClick={load}>
            Load
          </Button>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="lab-fen">Position now (FEN)</Label>
          <Input
            id="lab-fen"
            readOnly
            value={epdToFen(epd)}
            className="font-mono text-xs"
            onFocus={(event) => event.target.select()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
