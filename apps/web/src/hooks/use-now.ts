import { useEffect, useState } from 'react';

/** `performance.now()`, redrawn every `everyMs` (ten times a second by default) while `running`, for a clock on screen. */
export function useNow(running: boolean, everyMs = 100): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(performance.now()), everyMs);
    return () => clearInterval(timer);
  }, [running, everyMs]);
  return now;
}
