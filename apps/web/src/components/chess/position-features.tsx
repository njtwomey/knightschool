import { epdToFen, MARK_MEANINGS, parseIcon, type MarkColour, type Side } from '@knightschool/core';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { Pin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MARK_RGB } from '@/components/board/colours';
import type { BoardPosition, BoardProps, Reveal } from '@/components/board/board';
import type { SystemArrow } from '@/components/board/board-surface';
import { SquareIconGlyph } from '@/components/board/square-icon';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GRADE_TEXT } from './grade-style';

/*
 * A few cheap features, found by looking at the board with chess.js. A stand-in for core's `positionFeatures`
 * (docs/v2/library/features.md), which does not exist yet; the shapes match so the component can switch over.
 */

export type FeatureKind = 'mate' | 'hanging' | 'attacked' | 'pin' | 'skewer' | 'check' | 'king' | 'material' | 'file';

export type Feature = {
  id: string;
  kind: FeatureKind;
  /** The side it is good for; null when it favours neither. */
  favours: Side | null;
  colour: MarkColour;
  text: string;
  /** What the board lights on hover, in the feature's colour. */
  squares: string[];
  arrows: { from: string; to: string }[];
  /** Square icons drawn on the board on hover (`pin@f6`, core `SQUARE_ICONS`); the first is the list item's icon. */
  icons?: string[];
};

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const SIDE: Record<Color, Side> = { w: 'white', b: 'black' };
const SIDE_NAME: Record<Side, string> = { white: 'White', black: 'Black' };
const other = (colour: Color): Color => (colour === 'w' ? 'b' : 'w');
const FILES = 'abcdefgh';

type Placed = { square: Square; type: PieceSymbol; color: Color };

function pieces(chess: Chess): Placed[] {
  return chess.board().flatMap((row) => row.flatMap((cell) => (cell ? [cell] : [])));
}

/** Attacked and undefended, or attacked by something cheaper (v1's rule: no exchange count). */
function loose(chess: Chess, all: Placed[], inCheck: boolean): Feature[] {
  const found: Feature[] = [];
  const checkers = inCheck
    ? chess.attackers(all.find((p) => p.type === 'k' && p.color === chess.turn())!.square, other(chess.turn()))
    : [];
  for (const piece of all) {
    if (piece.type === 'k') continue;
    const enemy = other(piece.color);
    const attackers = chess.attackers(piece.square, enemy);
    if (attackers.length === 0) continue;
    // In check only the answer to the check matters: the checking piece is the only loose piece worth naming.
    if (inCheck && piece.color === chess.turn()) continue;
    if (inCheck && piece.color !== chess.turn() && !checkers.includes(piece.square)) continue;
    const defended = chess.attackers(piece.square, piece.color).length > 0;
    const cheapest = attackers
      .map((square) => ({ square, piece: chess.get(square)! }))
      .sort((a, b) => VALUE[a.piece.type] - VALUE[b.piece.type])[0]!;
    const by = `the ${NAME[cheapest.piece.type]} on ${cheapest.square}`;
    const base = {
      favours: SIDE[enemy],
      colour: 'R' as const,
      squares: [piece.square, cheapest.square],
      arrows: [{ from: cheapest.square, to: piece.square }],
    };
    if (!defended) {
      found.push({
        ...base,
        icons: [`hanging@${piece.square}`],
        id: `hanging-${piece.square}`,
        kind: 'hanging',
        text: `The ${NAME[piece.type]} on ${piece.square} is undefended and attacked by ${by}.`,
      });
    } else if (VALUE[cheapest.piece.type] < VALUE[piece.type]) {
      found.push({
        ...base,
        icons: [`attack@${piece.square}`],
        id: `attacked-${piece.square}`,
        kind: 'attacked',
        text: `The ${NAME[piece.type]} on ${piece.square} is attacked by ${by}, a cheaper piece.`,
      });
    }
  }
  return found;
}

const RAYS = {
  b: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  r: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
} as const;

/** Along each line from every queen, rook and bishop: the first enemy piece and the one behind it. */
function pinsAndSkewers(chess: Chess, all: Placed[]): Feature[] {
  const found: Feature[] = [];
  for (const slider of all) {
    if (slider.type !== 'b' && slider.type !== 'r' && slider.type !== 'q') continue;
    const rays = slider.type === 'q' ? [...RAYS.b, ...RAYS.r] : RAYS[slider.type];
    for (const [df, dr] of rays) {
      const hits: Placed[] = [];
      let file = FILES.indexOf(slider.square[0]!) + df;
      let rank = Number(slider.square[1]) + dr;
      while (file >= 0 && file < 8 && rank >= 1 && rank <= 8 && hits.length < 2) {
        const square = `${FILES[file]}${rank}` as Square;
        const piece = chess.get(square);
        if (piece) hits.push({ square, ...piece });
        file += df;
        rank += dr;
      }
      const [front, back] = hits;
      if (!front || !back || front.color === slider.color || back.color === slider.color) continue;
      // Only a line that wins something: the piece behind is the king, worth more than the attacker, or undefended.
      const wins =
        back.type === 'k' ||
        front.type === 'k' ||
        VALUE[back.type] > VALUE[slider.type] ||
        chess.attackers(back.square, back.color).length === 0;
      if (!wins) continue;
      const base = {
        favours: SIDE[slider.color],
        colour: 'R' as const,
        squares: [slider.square, front.square, back.square],
        arrows: [{ from: slider.square, to: back.square }],
      };
      const by = `the ${NAME[slider.type]} on ${slider.square}`;
      if (back.type === 'k' || VALUE[back.type] > VALUE[front.type]) {
        found.push({
          ...base,
          icons: [`pin@${front.square}`],
          id: `pin-${front.square}`,
          kind: 'pin',
          text:
            back.type === 'k'
              ? `The ${NAME[front.type]} on ${front.square} is pinned to the king by ${by}: it cannot move.`
              : `The ${NAME[front.type]} on ${front.square} is pinned to the ${NAME[back.type]} by ${by}.`,
        });
      } else if (front.type === 'k' || VALUE[front.type] > VALUE[back.type]) {
        found.push({
          ...base,
          icons: [`attack@${front.square}`, `attack@${back.square}`],
          id: `skewer-${front.square}`,
          kind: 'skewer',
          text: `${by[0]!.toUpperCase()}${by.slice(1)} skewers the ${NAME[front.type]} on ${front.square} and the ${NAME[back.type]} behind it.`,
        });
      }
    }
  }
  return found;
}

/** The side to move's checks, and mate in one. Plays every move, so only for the one board being looked at. */
function checks(chess: Chess, all: Placed[]): Feature[] {
  const mover = SIDE[chess.turn()];
  const king = all.find((p) => p.type === 'k' && p.color !== chess.turn())?.square;
  const moves = chess.moves({ verbose: true }).filter((move) => move.san.includes('+') || move.san.includes('#'));
  const mates = moves.filter((move) => move.san.includes('#'));
  if (mates.length > 0) {
    return mates.map((move) => ({
      id: `mate-${move.lan}`,
      kind: 'mate',
      favours: mover,
      colour: 'R',
      text: `${SIDE_NAME[mover]} mates with ${move.san}.`,
      squares: [move.from, move.to],
      arrows: [{ from: move.from, to: move.to }],
      icons: king ? [`mate@${king}`] : [],
    }));
  }
  if (moves.length === 0) return [];
  const named = moves.slice(0, 3).map((move) => move.san);
  return [
    {
      id: 'checks',
      kind: 'check',
      favours: mover,
      colour: 'Y',
      text: `${SIDE_NAME[mover]} has ${moves.length === 1 ? 'a check' : `${moves.length} checks`}: ${named.join(', ')}${moves.length > 3 ? ' and more' : ''}.`,
      squares: moves.flatMap((move) => [move.from, move.to]),
      arrows: moves.map((move) => ({ from: move.from, to: move.to })),
      icons: king ? [`check@${king}`] : [],
    },
  ];
}

/** Kings left in the centre with castling gone, or with the centre files open. */
function kings(epd: string, all: Placed[]): Feature[] {
  const rights = epd.split(' ')[2] ?? '-';
  const found: Feature[] = [];
  for (const colour of ['w', 'b'] as const) {
    const king = all.find((p) => p.type === 'k' && p.color === colour);
    if (!king) continue;
    const home = colour === 'w' ? 'e1' : 'e8';
    if (king.square !== home) continue;
    const side = SIDE[colour];
    const canCastle = colour === 'w' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
    const openCentre = ['d', 'e'].filter((file) => !all.some((p) => p.type === 'p' && p.square[0] === file));
    if (!canCastle) {
      found.push({
        id: `king-${colour}`,
        kind: 'king',
        favours: SIDE[other(colour)],
        colour: 'R',
        text: `${SIDE_NAME[side]}'s king can no longer castle and is stuck in the centre.`,
        squares: [king.square],
        arrows: [],
        icons: [`attack@${king.square}`],
      });
    } else if (openCentre.length > 0) {
      found.push({
        id: `king-${colour}`,
        kind: 'king',
        favours: SIDE[other(colour)],
        colour: 'R',
        text: `${SIDE_NAME[side]}'s king is still in the centre with the ${openCentre.join('- and ')}-file open.`,
        squares: [king.square, ...openCentre.map((file) => `${file}${colour === 'w' ? 2 : 7}`)],
        arrows: [],
        icons: [`attack@${king.square}`],
      });
    }
  }
  return found;
}

function material(all: Placed[]): Feature[] {
  const sum = (colour: Color) =>
    all.filter((p) => p.color === colour && p.type !== 'k').reduce((total, p) => total + VALUE[p.type], 0);
  const balance = sum('w') - sum('b');
  if (balance === 0) return [];
  const ahead: Side = balance > 0 ? 'white' : 'black';
  const n = Math.abs(balance);
  return [
    {
      id: 'material',
      kind: 'material',
      favours: ahead,
      colour: 'B',
      text: `${SIDE_NAME[ahead]} is ${n === 1 ? 'a pawn' : `${n} pawns`} up in material.`,
      squares: [],
      arrows: [],
    },
  ];
}

function files(all: Placed[]): Feature[] {
  const open = [...FILES].filter((file) => !all.some((p) => p.type === 'p' && p.square[0] === file));
  return open.map((file) => ({
    id: `file-${file}`,
    kind: 'file' as const,
    favours: null,
    colour: 'B' as const,
    text: `The ${file}-file is open: a rook belongs there.`,
    squares: Array.from({ length: 8 }, (_, i) => `${file}${i + 1}`),
    arrows: [],
  }));
}

const ORDER: FeatureKind[] = ['mate', 'hanging', 'attacked', 'pin', 'skewer', 'king', 'check', 'material', 'file'];

/** What is going on in a position, most urgent first. */
export function findFeatures(epd: string, kinds?: FeatureKind[]): Feature[] {
  const chess = new Chess(epdToFen(epd));
  const all = pieces(chess);
  const want = (kind: FeatureKind) => !kinds || kinds.includes(kind);
  const found = [
    ...(want('mate') || want('check') ? checks(chess, all) : []),
    ...(want('hanging') || want('attacked') ? loose(chess, all, chess.inCheck()) : []),
    ...(want('pin') || want('skewer') ? pinsAndSkewers(chess, all) : []),
    ...(want('king') ? kings(epd, all) : []),
    ...(want('material') ? material(all) : []),
    ...(want('file') ? files(all) : []),
  ].filter((feature) => want(feature.kind));
  return found.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/**
 * A lit feature on the board: its squares in its colour, its arrows, and its square icons added to the marks of the
 * position shown. Spread into `Board` with the positions and index it shows.
 */
export function featureOnBoard(
  feature: Feature | null,
  positions: BoardPosition[],
  index: number,
): Pick<BoardProps, 'positions' | 'lit' | 'arrows'> {
  if (!feature) return { positions, lit: [], arrows: [] };
  const icons = feature.icons ?? [];
  return {
    positions: icons.length
      ? positions.map((position, i) =>
          i === index
            ? { ...position, marks: { ...position.marks, icons: [...(position.marks?.icons ?? []), ...icons] } }
            : position,
        )
      : positions,
    lit: feature.squares.map((square) => ({ square, colour: feature.colour })),
    arrows: feature.arrows.map((arrow): SystemArrow => ({ ...arrow, kind: 'preview' })),
  };
}

/**
 * What is going on in a position, in plain words; hovering an item lights it on the board, a click pins it
 * (docs/v2/components/position-features.md).
 */
export function PositionFeatures({
  epd,
  learner,
  kinds,
  limit = 5,
  reveal = 'study',
  onLight,
  features: given,
}: {
  epd: string;
  /** The side the learner plays, for "good for you" and "watch out". */
  learner?: Side;
  kinds?: FeatureKind[];
  limit?: number;
  /** Never at the `test` reveal level: a list of threats is the answer to a puzzle. */
  reveal?: Reveal;
  /** The feature to light on the nearest board, or null to clear it. */
  onLight?: (feature: Feature | null) => void;
  /** Features already found (or worded by the author); otherwise found here. */
  features?: Feature[];
}) {
  const features = useMemo(() => given ?? findFeatures(epd, kinds), [given, epd, kinds]);
  const [pinned, setPinned] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [lastEpd, setLastEpd] = useState(epd);
  if (lastEpd !== epd) {
    // Follows the board's cursor: a pin from another position does not carry over.
    setLastEpd(epd);
    setPinned(null);
  }
  if (reveal === 'test') return null;
  const pinnedFeature = features.find((feature) => feature.id === pinned) ?? null;
  const light = (feature: Feature | null) => onLight?.(feature ?? pinnedFeature);
  if (features.length === 0) {
    return (
      <EmptyState kind="done" size="part" text="Nothing urgent here: both kings are safe and nothing is attacked." />
    );
  }
  const shown = more ? features : features.slice(0, limit);
  return (
    <div className="grid content-start gap-1">
      <ul className="grid gap-0.5" aria-label="What is going on">
        {shown.map((feature) => {
          const isPinned = pinned === feature.id;
          const whose =
            learner && feature.favours ? (feature.favours === learner ? 'good for you' : 'watch out') : null;
          const icon = feature.icons?.[0] ? parseIcon(feature.icons[0])?.icon : undefined;
          return (
            <li key={feature.id}>
              <Button
                variant="ghost"
                aria-pressed={isPinned}
                className={cn(
                  'h-auto w-full items-start justify-start gap-2 px-2 py-1.5 text-left font-normal whitespace-normal',
                  isPinned && 'bg-muted',
                )}
                onMouseEnter={() => light(feature)}
                onMouseLeave={() => light(null)}
                onFocus={() => light(feature)}
                onBlur={() => light(null)}
                onClick={() => {
                  const next = isPinned ? null : feature.id;
                  setPinned(next);
                  onLight?.(next ? feature : null);
                }}
              >
                {icon ? (
                  <span className="mt-0.5 shrink-0" aria-label={MARK_MEANINGS[feature.colour].name}>
                    <SquareIconGlyph icon={icon} className="size-4" />
                  </span>
                ) : (
                  <span
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: MARK_RGB[feature.colour] }}
                    aria-label={MARK_MEANINGS[feature.colour].name}
                  />
                )}
                <span className="grid gap-0.5">
                  <span className="text-sm">{feature.text}</span>
                  {whose ? (
                    <span
                      className={cn('text-xs', whose === 'watch out' ? GRADE_TEXT.mistake : 'text-muted-foreground')}
                    >
                      {whose === 'good for you' ? 'Good for you' : 'Watch out'}
                    </span>
                  ) : null}
                </span>
                {isPinned ? <Pin className="mt-1 ml-auto size-3.5 text-muted-foreground" aria-label="Pinned" /> : null}
              </Button>
            </li>
          );
        })}
      </ul>
      {features.length > limit ? (
        <Button variant="ghost" size="xs" className="justify-self-start" onClick={() => setMore(!more)}>
          {more ? 'Fewer' : `${features.length - limit} more`}
        </Button>
      ) : null}
    </div>
  );
}
