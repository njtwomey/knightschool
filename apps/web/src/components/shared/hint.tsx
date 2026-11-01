import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** How long a pointer rests before a hint opens; `long` for icon buttons in dense rows (docs/v2/patterns/interactions.md). */
const HINT_DELAYS = { default: 500, long: 900, longPress: 500 } as const;

export type HintProps = {
  /** One or two sentences, written once where the meaning lives. */
  text: ReactNode;
  /** The element it explains; it is the trigger itself, so it must take a ref and props. */
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: 'default' | 'long';
  /** Never opens (a disabled hint, or a test that must not explain). */
  off?: boolean;
};

/**
 * A short explanation on anything: hover or keyboard focus with a mouse, a long-press on a touch screen, where it stays
 * until the next tap anywhere. A long-press never also clicks. Never on a move chip, which previews its position
 * instead (docs/v2/components/hint.md).
 */
export function Hint({ text, children, side = 'bottom', delay = 'default', off = false }: HintProps) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  useEffect(() => {
    if (!open || !pinned.current) return;
    // A pinned hint (from a long-press) closes on the next tap anywhere.
    const close = () => {
      pinned.current = false;
      setOpen(false);
    };
    const id = window.setTimeout(() => document.addEventListener('pointerdown', close, { capture: true, once: true }));
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', close, { capture: true });
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cancelPress = () => window.clearTimeout(timer.current);

  if (off) return children;
  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        if (!pinned.current) setOpen(next);
      }}
      delayDuration={HINT_DELAYS[delay]}
    >
      <TooltipTrigger
        asChild
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch') return;
          longPressed.current = false;
          cancelPress();
          timer.current = window.setTimeout(() => {
            longPressed.current = true;
            pinned.current = true;
            setOpen(true);
          }, HINT_DELAYS.longPress);
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(event) => {
          if (longPressed.current) event.preventDefault();
        }}
        onClickCapture={(event) => {
          if (!longPressed.current) return;
          longPressed.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={4} collisionPadding={8} className="max-w-xs text-left">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
