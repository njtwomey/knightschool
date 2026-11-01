/*
 * Lichess puzzle themes in our words: the ones that are ideas we teach (shown as idea chips), and the length and phase
 * tags that say nothing about what to look for (left out).
 */
export const IDEA_THEMES: Record<string, string> = {
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  discoveredAttack: 'Discovered attack',
  doubleCheck: 'Double check',
  backRankMate: 'Back rank',
  hangingPiece: 'Hanging piece',
  trappedPiece: 'Trapped piece',
  deflection: 'Deflection',
  attraction: 'Attraction',
  interference: 'Interference',
  sacrifice: 'Sacrifice',
  kingsideAttack: 'Kingside attack',
  queensideAttack: 'Queenside attack',
  defensiveMove: 'Defensive move',
  mate: 'Mate',
  mateIn1: 'Mate in 1',
  mateIn2: 'Mate in 2',
  mateIn3: 'Mate in 3',
  smotheredMate: 'Smothered mate',
  promotion: 'Promotion',
  exposedKing: 'Exposed king',
  xRayAttack: 'X-ray',
  zugzwang: 'Zugzwang',
  quietMove: 'Quiet move',
  intermezzo: 'In-between move',
  clearance: 'Clearance',
  capturingDefender: 'Removing the defender',
};

const SILENT = new Set([
  'short',
  'long',
  'veryLong',
  'oneMove',
  'opening',
  'middlegame',
  'endgame',
  'master',
  'masterVsMaster',
  'superGM',
]);

const OTHER: Record<string, string> = {
  advantage: 'Wins material',
  crushing: 'Wins decisively',
  equality: 'Saves the game',
};

/** A puzzle's themes as ideas (which link to an idea page) and plain tags. */
export function puzzleThemes(themes: readonly string[]): { ideas: string[]; tags: string[] } {
  const ideas: string[] = [];
  const tags: string[] = [];
  for (const theme of themes) {
    if (SILENT.has(theme)) continue;
    if (IDEA_THEMES[theme]) ideas.push(IDEA_THEMES[theme]);
    else tags.push(OTHER[theme] ?? theme.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()));
  }
  return { ideas, tags };
}
