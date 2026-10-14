import { explainMove, nodeAt, type OpeningContent } from '@knightschool/core';
import { currentEpd, useBrowse } from './store';

const NAG_WORDS: Record<number, string> = {
  1: 'a good move',
  2: 'a mistake',
  3: 'a brilliant move',
  4: 'a blunder',
  5: 'an interesting move',
  6: 'a dubious move',
};

/** What the last move does, in order of trust: the author's note, then what the board shows. Nothing if there is nothing to say. */
export function PositionDetails({ content }: { content: OpeningContent }) {
  const path = useBrowse((state) => state.path);
  const node = nodeAt(content, currentEpd(content, path));
  const last = path.at(-1);
  const before = path.length > 1 ? path[path.length - 2]!.to : content.opening.rootEpd;
  const notes = last ? explainMove(before, last.uci, { edge: last }) : [];
  const verdict = last?.annotation?.nag.map((nag) => NAG_WORDS[nag]).find(Boolean);
  const move = last ? `${Math.floor((path.length - 1) / 2) + 1}${path.length % 2 ? '.' : '...'} ${last.san}` : null;

  return (
    <div className="grid gap-1.5 rounded-lg border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-base font-semibold">{move ?? 'Starting position'}</span>
        {verdict && <span className="text-muted-foreground">{verdict}</span>}
      </div>
      {node.name && <p className="text-muted-foreground">{node.name}</p>}
      {node.popularity !== undefined && (
        <p className="text-muted-foreground">
          {Math.round(node.popularity * 100)}% of games at 1000–1600 reach this position.
        </p>
      )}
      {notes.map((note) => (
        <p key={note.text} className={note.source === 'author' ? '' : 'text-muted-foreground'}>
          {note.text}
        </p>
      ))}
      {!last && <p className="text-muted-foreground">Use the arrows under the board, or tap a move in the list.</p>}
    </div>
  );
}
