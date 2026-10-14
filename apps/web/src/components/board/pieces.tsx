import { defaultPieces, type PieceRenderObject } from 'react-chessboard';
import type { PieceSetId } from './prefs';

type Piece = PieceRenderObject[string];

// The same drawings with different finishing, so the choice is about readability. Real alternative sets can be
// added here later; check each one's licence first (many popular sets are GPL or share-alike).
const FILTERS: Record<Exclude<PieceSetId, 'classic'>, string> = {
  bold: 'drop-shadow(0 0 0.6px #000) drop-shadow(0 0 0.6px #000) drop-shadow(0 0 0.6px #000)',
  soft: 'drop-shadow(0 2px 2px rgb(0 0 0 / 0.35))',
};

const wrap = (piece: Piece, filter: string): Piece =>
  function Styled(props) {
    return <div style={{ width: '100%', height: '100%', filter }}>{piece(props)}</div>;
  };

const cache = new Map<PieceSetId, PieceRenderObject>();

export function piecesFor(id: PieceSetId): PieceRenderObject {
  if (id === 'classic') return defaultPieces;
  let set = cache.get(id);
  if (!set) {
    set = Object.fromEntries(Object.entries(defaultPieces).map(([key, piece]) => [key, wrap(piece, FILTERS[id])]));
    cache.set(id, set);
  }
  return set;
}
