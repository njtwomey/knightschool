import { SQUARE_ICONS, type SquareIcon as Icon } from '@knightschool/core';
import {
  Castle,
  CircleAlert,
  Crown,
  Key,
  Pin,
  Shield,
  Skull,
  Split,
  Swords,
  Target,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { MARK_RGB } from './colours';

const GLYPHS: Record<Icon, LucideIcon> = {
  pin: Pin,
  fork: Split,
  hanging: CircleAlert,
  attack: Swords,
  check: Crown,
  mate: Skull,
  trap: TriangleAlert,
  weak: Target,
  key: Key,
  outpost: Castle,
  defended: Shield,
};

/** One icon from the square-icon vocabulary, in the mark colour of its meaning. */
export function SquareIconGlyph({ icon, className }: { icon: Icon; className?: string }) {
  const Glyph = GLYPHS[icon];
  return (
    <Glyph className={className} style={{ color: MARK_RGB[SQUARE_ICONS[icon].colour] }} aria-hidden strokeWidth={2.5} />
  );
}
