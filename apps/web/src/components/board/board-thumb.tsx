import { useEffect, useRef, useState } from 'react';
import { AppBoard } from './app-board';

/** True once the element has come near the screen, and stays true: a board is drawn when it is about to be seen. */
function useSeen<T extends Element>(margin = '300px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const element = ref.current;
    if (seen || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [seen, margin]);
  return [ref, seen] as const;
}

/**
 * A small picture of a position. It is only drawn once it is near the screen, so a long page of them (Search lists
 * more than a hundred) does not build every board up front.
 */
export function BoardThumb({ id, epd, side }: { id: string; epd: string; side: 'white' | 'black' }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div ref={ref} className="pointer-events-none aspect-square w-full overflow-hidden bg-muted" aria-hidden>
      {seen && <AppBoard id={`thumb-${id}`} epd={epd} orientation={side} interactive={false} coordinates={false} />}
    </div>
  );
}
