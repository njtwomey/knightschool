/**
 * pnpm fen "1. e4 e5 2. Nf3 Nc6 3. Bc4"
 *
 * Prints the position after the moves (played from the start position) as an EPD, ready to paste as the target of a
 * position link in a comment:
 *   [Nxf7](r1bqkb1r/pppp1Npp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq -)
 * Hovering those words in the app shows this position on the board.
 */
import { epdAfterPgn } from '../packages/core/src/index.ts';

const moves = process.argv.slice(2).join(' ').trim();
if (!moves) {
  console.error('usage: pnpm fen "1. e4 e5 2. Nf3"');
  process.exit(2);
}
try {
  console.log(epdAfterPgn(moves));
} catch (error) {
  console.error(`fen: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
