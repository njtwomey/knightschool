import { numberedMove, pathFromUcis, type CourseUnit, type OpeningContent, type UnitStretch } from '@knightschool/core';

/** One move of a stretch as shown: its number, its SAN, and whether it is one of the unit's own moves. */
export type ShownMove = { ply: number; san: string; core: boolean };

/** The SAN of a stretch's moves, from the position where it starts. */
export function stretchMoves(content: OpeningContent, stretch: UnitStretch): { lead: ShownMove[]; own: ShownMove[] } {
  const moves = pathFromUcis(content, stretch.moves).map((edge, ply): ShownMove => ({
    ply,
    san: edge.san,
    core: stretch.plies.includes(ply),
  }));
  return { lead: moves.slice(0, stretch.from), own: moves.slice(stretch.from) };
}

/** What a unit is: the first move that makes it different from what came before. */
export function headline(content: OpeningContent, unit: CourseUnit, units: CourseUnit[]): string {
  const first = unit.stretches[0]!;
  const { own } = stretchMoves(content, first);
  const opener = own[0];
  if (unit.index === 0) return 'From the start';
  if (unit.prerequisites.length === 0)
    return opener
      ? `When ${numberedMove(opener.ply, opener.san)} is played, open from the start`
      : 'Open from the start';
  if (unit.side) return `Other replies after unit ${unitNumber(units, unit.prerequisites[0])}`;
  if (unit.branch && opener) return `When ${numberedMove(opener.ply, opener.san)} is played`;
  return `Carries on from unit ${unitNumber(units, unit.prerequisites[0])}`;
}

const unitNumber = (units: CourseUnit[], id: string | undefined) =>
  (units.find((unit) => unit.id === id)?.index ?? 0) + 1;
