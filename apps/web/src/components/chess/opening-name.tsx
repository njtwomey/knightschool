import { ExternalLink } from 'lucide-react';
import type { Reveal } from '@/components/board/board';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type OpeningNameProps = {
  /** The name in Lichess's form: "Italian Game: Giuoco Piano, Center Attack". */
  name: string;
  /** Family only, variation only (when the page makes the opening clear), or both. */
  level?: 'opening' | 'variation' | 'full';
  /** "as White", "against 1.e4": for one of our openings, when the side matters. */
  side?: string;
  eco?: string;
  /** The position on Lichess's opening explorer; without it the code is a plain badge. */
  lichessUrl?: string;
  /** Our opening's page, when the name is one of ours. */
  href?: string;
  /** Our variation's page. */
  variationHref?: string;
  /** In a one-line row the variation part is cut with "…" first. */
  oneLine?: boolean;
  /** In Name it at the `test` level the name is the answer: not drawn until answered. */
  reveal?: Reveal;
  isAnswer?: boolean;
  className?: string;
};

/** "Italian Game: Giuoco Piano" as its two levels. */
export function splitName(name: string): { opening: string; variation?: string } {
  const at = name.indexOf(':');
  if (at < 0) return { opening: name.trim() };
  return { opening: name.slice(0, at).trim(), variation: name.slice(at + 1).trim() };
}

/** A Lichess opening page from a name: spaces and punctuation as Lichess writes them. */
export const lichessOpeningUrl = (name: string) =>
  `https://lichess.org/opening/${name.replace(/:\s*/g, '/').replace(/,\s*/g, '_').replace(/\s+/g, '_')}`;

function Part({ text, href, className }: { text: string; href?: string; className?: string }) {
  return href ? (
    <a href={href} className={cn('underline-offset-2 hover:underline', className)}>
      {text}
    </a>
  ) : (
    <span className={className}>{text}</span>
  );
}

/**
 * An opening's or a variation's name, written one way everywhere, with its ECO code linking to Lichess
 * (docs/v2/components/opening-name.md).
 */
export function OpeningName({
  name,
  level = 'full',
  side,
  eco,
  lichessUrl,
  href,
  variationHref,
  oneLine,
  reveal,
  isAnswer,
  className,
}: OpeningNameProps) {
  if (reveal === 'test' && isAnswer) return null;
  const { opening, variation } = splitName(name);
  const showOpening = level !== 'variation' || !variation;
  const showVariation = level !== 'opening' && variation;
  const text = (
    <span
      className={cn(
        oneLine ? 'flex min-w-0 items-baseline' : 'inline',
        // Long names wrap between levels, never inside a word.
        'break-normal',
      )}
      title={oneLine ? name : undefined}
    >
      {showOpening ? <Part text={opening} href={href} className="shrink-0 font-semibold whitespace-nowrap" /> : null}
      {showOpening && showVariation ? <span className="text-muted-foreground">{':\u00a0'}</span> : null}
      {showVariation ? (
        <Part
          text={variation}
          href={variationHref}
          className={cn('font-normal text-muted-foreground', oneLine && 'min-w-0 truncate')}
        />
      ) : null}
      {side ? <span className="font-normal whitespace-nowrap text-muted-foreground">, {side}</span> : null}
    </span>
  );
  const ecoBadge = eco ? (
    lichessUrl ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="shrink-0 font-mono" asChild>
            <a href={lichessUrl} target="_blank" rel="noopener noreferrer">
              {eco}
              <ExternalLink aria-hidden />
              <span className="sr-only">(opens Lichess in a new tab)</span>
            </a>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Open this position on Lichess</TooltipContent>
      </Tooltip>
    ) : (
      <Badge variant="outline" className="shrink-0 font-mono">
        {eco}
      </Badge>
    )
  ) : null;
  return (
    <span
      className={cn(
        'gap-x-2 gap-y-1',
        oneLine ? 'flex min-w-0 items-center' : 'inline-flex flex-wrap items-center',
        className,
      )}
    >
      {text}
      {ecoBadge}
    </span>
  );
}
