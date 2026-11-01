import { epdToFen, fenToEpd, replay, type Played } from '@knightschool/core';
import { Chess } from 'chess.js';
import { Fragment, useMemo, type ReactNode } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import type { Reveal } from '@/components/board/board';
import { cn } from '@/lib/utils';
import { IdeaBadge, type Idea } from './idea-badge';
import { MoveChip } from './move-chip';
import { PositionPreview } from './position-preview';

/*
 * The written syntax (explicit, so the build can check every reference):
 *
 *   [the position after Nxf7](FEN or EPD)   a position: hover shows it on the board, click pins it
 *   {4. Ng5 d5}  {3...Nf6}                  moves, resolved against the line the text belongs to
 *   [[d5]]  [[the bishop on b5|b5]]         a square (or several, "b5,c6"), lit on the board on hover
 *   [[idea:fork]]  [[a fork|idea:fork]]     an idea, as an inline badge
 *   [[board:FEN or EPD]]                    a small diagram (idea pages, introductions)
 *
 * Paragraphs are separated by a blank line. Anything that does not read is left as its plain words.
 */

/** The line a text belongs to: the position before `firstPly` and the moves from there. */
export type RichTextContext = {
  startEpd: string;
  firstPly?: number;
  moves: readonly { san: string; uci: string; after: string }[];
};

/** The board the text talks to. Without one, positions and moves open a small preview card instead. */
export type RichTextBoard = {
  /** Show a position as a preview; null returns the board to where it was. */
  onPreview: (epd: string | null) => void;
  /** Pin the board on a position until clicked again; null unpins. */
  onPin?: (epd: string | null) => void;
  pinned?: string | null;
  /** Light squares on the board's highlight layer; null clears them. */
  onLight?: (squares: string[] | null) => void;
  /** A move chip was clicked: go there. */
  onMove?: (ply: number, move: Played) => void;
  orientation?: 'white' | 'black';
};

type Node =
  | { type: 'text'; text: string }
  | { type: 'position'; label: string; epd: string }
  | { type: 'moves'; raw: string; firstPly: number; moves: Played[] }
  | { type: 'squares'; label: string; squares: string[] }
  | { type: 'idea'; label?: string; id: string }
  | { type: 'board'; epd: string };

const TOKEN = /\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)]+)\)|\{([^}]+)\}/g;
const SQUARE = /^[a-h][1-8]$/;

/** A FEN or EPD that chess.js accepts, as an EPD; null when it does not read as a position. */
function asEpd(text: string): string | null {
  const fields = text.trim().split(/\s+/);
  const fen = fields.length === 4 ? epdToFen(fields.join(' ')) : fields.join(' ');
  try {
    return fenToEpd(new Chess(fen).fen());
  } catch {
    return null;
  }
}

/** "4. Ng5 d5" or "3...Nf6" against the line: its first ply and the moves played, or null when it does not fit. */
function resolveMoves(raw: string, context: RichTextContext | undefined): { firstPly: number; moves: Played[] } | null {
  if (!context) return null;
  const match = /^\s*(\d+)\s*(\.\.\.|\.)\s*(.+)$/.exec(raw);
  if (!match) return null;
  const firstPly = (Number(match[1]) - 1) * 2 + (match[2] === '...' ? 1 : 0);
  const sans = match[3]!
    .split(/\s+/)
    .filter((word) => word && !/^\d+\.(\.\.)?$/.test(word))
    .map((word) => word.replace(/^\d+\.(\.\.)?/, ''));
  const base = context.firstPly ?? 0;
  const index = firstPly - base;
  if (index < 0 || index > context.moves.length) return null;
  const epd = index === 0 ? context.startEpd : context.moves[index - 1]!.after;
  const moves = replay(epd, sans);
  return moves.length === sans.length && moves.length > 0 ? { firstPly, moves } : null;
}

/** The text as nodes; exported for tests and for plain-text use (search results). */
export function parseRichText(text: string, context?: RichTextContext): Node[] {
  const nodes: Node[] = [];
  let at = 0;
  for (const match of text.matchAll(TOKEN)) {
    const [whole, inner, label, target, moves] = match;
    const index = match.index;
    if (index > at) nodes.push({ type: 'text', text: text.slice(at, index) });
    at = index + whole.length;
    if (inner !== undefined) {
      const bar = inner.indexOf('|');
      const words = bar >= 0 ? inner.slice(0, bar) : undefined;
      const ref = (bar >= 0 ? inner.slice(bar + 1) : inner).trim();
      if (ref.startsWith('idea:')) {
        nodes.push({ type: 'idea', id: ref.slice(5).trim(), label: words });
        continue;
      }
      if (ref.startsWith('board:')) {
        const epd = asEpd(ref.slice(6));
        nodes.push(epd ? { type: 'board', epd } : { type: 'text', text: words ?? '' });
        continue;
      }
      const squares = ref.split(/\s*,\s*/);
      nodes.push(
        squares.every((square) => SQUARE.test(square))
          ? { type: 'squares', label: words ?? ref, squares }
          : { type: 'text', text: words ?? ref },
      );
    } else if (label !== undefined) {
      const epd = asEpd(target!);
      nodes.push(epd ? { type: 'position', label, epd } : { type: 'text', text: label });
    } else {
      const resolved = resolveMoves(moves!, context);
      nodes.push(resolved ? { type: 'moves', raw: moves!, ...resolved } : { type: 'text', text: moves! });
    }
  }
  if (at < text.length) nodes.push({ type: 'text', text: text.slice(at) });
  return nodes;
}

/** The text with its markup removed, for places that show plain words. */
export function plainText(text: string, context?: RichTextContext): string {
  return parseRichText(text, context)
    .map((node) => {
      if (node.type === 'text') return node.text;
      if (node.type === 'position' || node.type === 'squares') return node.label;
      if (node.type === 'moves') return node.raw.trim();
      if (node.type === 'idea') return node.label ?? node.id;
      return '';
    })
    .join('');
}

function PositionLink({
  label,
  epd,
  board,
  plain,
}: {
  label: string;
  epd: string;
  board?: RichTextBoard;
  plain?: boolean;
}) {
  if (plain) return <>{label}</>;
  const pinned = board?.pinned === epd;
  const link = (
    <a
      href="#"
      role="button"
      aria-pressed={board?.onPin ? pinned : undefined}
      onClick={(event) => {
        event.preventDefault();
        board?.onPin?.(pinned ? null : epd);
      }}
      onMouseEnter={() => board?.onPreview(epd)}
      onMouseLeave={() => board?.onPreview(null)}
      onFocus={() => board?.onPreview(epd)}
      onBlur={() => board?.onPreview(null)}
      className={cn(
        'rounded-sm text-foreground underline decoration-dotted decoration-muted-foreground underline-offset-4',
        'hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        pinned && 'bg-accent decoration-solid',
      )}
    >
      {label}
    </a>
  );
  if (board) return link;
  return <PositionPreview position={{ epd, caption: label }}>{link}</PositionPreview>;
}

function Moves({
  node,
  board,
  plain,
  side,
}: {
  node: Extract<Node, { type: 'moves' }>;
  board?: RichTextBoard;
  plain?: boolean;
  side?: 'white' | 'black';
}) {
  if (plain) return <>{node.raw.trim()}</>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-0.5">
      {node.moves.map((move, i) => {
        const ply = node.firstPly + i;
        return (
          <MoveChip
            key={`${ply}-${move.uci}`}
            ply={ply}
            san={move.san}
            epd={move.epd}
            from={move.from}
            to={move.to}
            mine={side ? (ply % 2 === 0) === (side === 'white') : false}
            numbered={i === 0 ? 'always' : 'white'}
            preview={!board}
            onSelect={board?.onMove ? () => board.onMove?.(ply, move) : undefined}
            onHover={
              board
                ? (hovering) => {
                    board.onPreview(hovering ? move.epd : null);
                    board.onLight?.(hovering ? [move.from, move.to] : null);
                  }
                : undefined
            }
            orientation={board?.orientation}
          />
        );
      })}
    </span>
  );
}

/**
 * Written text with positions, moves, squares and ideas inline, each hoverable and tied to the board beside it
 * (docs/v2/components/rich-text.md).
 */
export function RichText({
  text,
  context,
  board,
  ideas = {},
  side,
  plain,
  reveal,
  hideAtTest,
  className,
}: {
  text: string;
  context?: RichTextContext;
  board?: RichTextBoard;
  /** The ideas named in text can be found in, by id. */
  ideas?: Record<string, Idea>;
  /** The learner's side, whose moves are bold. */
  side?: 'white' | 'black';
  /** Search results and card summaries: positions as plain words, moves as plain text. */
  plain?: boolean;
  /** Following the part that holds it: hidden at `test` when it would give the answer away. */
  reveal?: Reveal;
  hideAtTest?: boolean;
  className?: string;
}) {
  const paragraphs = useMemo(
    () =>
      text
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => parseRichText(paragraph, context)),
    [text, context],
  );
  if (reveal === 'test' && hideAtTest) return null;
  const render = (node: Node, key: number): ReactNode => {
    switch (node.type) {
      case 'text':
        return <Fragment key={key}>{node.text}</Fragment>;
      case 'position':
        return <PositionLink key={key} label={node.label} epd={node.epd} board={board} plain={plain} />;
      case 'moves':
        return <Moves key={key} node={node} board={board} plain={plain} side={side} />;
      case 'squares':
        return plain || !board?.onLight ? (
          <Fragment key={key}>{node.label}</Fragment>
        ) : (
          <span
            key={key}
            tabIndex={0}
            className="cursor-default rounded-sm bg-mark-target/15 px-0.5 font-medium ring-mark-target/40 hover:ring-1 focus-visible:ring-2 focus-visible:outline-none"
            onMouseEnter={() => board.onLight?.(node.squares)}
            onMouseLeave={() => board.onLight?.(null)}
            onFocus={() => board.onLight?.(node.squares)}
            onBlur={() => board.onLight?.(null)}
          >
            {node.label}
          </span>
        );
      case 'idea':
        return plain ? (
          <Fragment key={key}>{node.label ?? ideas[node.id]?.name ?? node.id}</Fragment>
        ) : (
          <IdeaBadge
            key={key}
            idea={ideas[node.id]}
            name={node.label ?? ideas[node.id]?.name ?? node.id}
            size="inline"
          />
        );
      case 'board':
        return plain ? null : (
          <span key={key} className="my-2 block">
            <BoardThumb epd={node.epd} className="w-48" id={`rich-board-${key}`} />
          </span>
        );
    }
  };
  return (
    <div className={cn('grid content-start gap-2 text-sm leading-relaxed', className)}>
      {paragraphs.map((nodes, i) => (
        // A div, not a p: an inline diagram is a block.
        <div key={i}>{nodes.map(render)}</div>
      ))}
    </div>
  );
}
