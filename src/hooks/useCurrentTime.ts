import { useState, useEffect } from 'react';

/** Returns current time in ms, updating every `intervalMs`. Single interval for live timers. */
export function useCurrentTime(intervalMs: number = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
