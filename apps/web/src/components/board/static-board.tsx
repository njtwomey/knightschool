import { resolvePosition, type PositionSource } from '@knightschool/core';
import { useMemo } from 'react';
import { AppBoard, type AppBoardProps } from './app-board';

type Props = { source: PositionSource; id: string; orientation?: 'white' | 'black' } & Pick<
  AppBoardProps,
  'arrows' | 'badge' | 'squareStyles' | 'coordinates' | 'className'
>;

/**
 * A board that only shows a position, given as a FEN, an EPD or a PGN played to a ply (or its last move). Bad input
 * shows a short message instead of a board. Use it wherever a picture of a position is wanted.
 */
export function StaticBoard({ source, id, orientation, ...rest }: Props) {
  const key = JSON.stringify(source);
  const resolved = useMemo(() => {
    try {
      return { ok: true as const, position: resolvePosition(JSON.parse(key) as PositionSource) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : String(error) };
    }
  }, [key]);

  if (!resolved.ok) {
    return (
      <div
        className="grid aspect-square place-items-center rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"
        role="alert"
      >
        {resolved.message}
      </div>
    );
  }
  const { position } = resolved;
  return (
    <AppBoard
      id={id}
      epd={position.epd}
      orientation={orientation ?? 'white'}
      interactive={false}
      lastMove={position.lastMove?.uci}
      {...rest}
    />
  );
}
