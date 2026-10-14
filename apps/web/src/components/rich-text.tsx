import { parseRichText } from '@knightschool/core';
import { Button } from '@/components/ui/button';
import { usePreview } from '@/components/board/preview';

/**
 * Text that may point at positions: `[f7](FEN)`. The words become something to hover (or focus, or tap): the board
 * beside the text shows that position while you do, and goes back when you stop.
 */
export function RichText({ text }: { text: string }) {
  const { show, hide, toggle } = usePreview();
  return (
    <>
      {parseRichText(text).map((segment, index) =>
        segment.kind === 'text' ? (
          segment.text
        ) : (
          <Button
            key={index}
            variant="link"
            className="inline h-auto whitespace-normal p-0 align-baseline font-medium text-foreground underline decoration-dotted underline-offset-4"
            onMouseEnter={() => show(segment.epd)}
            onMouseLeave={hide}
            onFocus={() => show(segment.epd)}
            onBlur={hide}
            onClick={() => toggle(segment.epd)}
          >
            {segment.label}
          </Button>
        ),
      )}
    </>
  );
}
