'use client';
import { useEffect, useState } from 'react';
import { iftarCountdown } from '../iftar-countdown';
export function IftarCountdown({ target, initialNow }: { target: number; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => setNow(Date.now());
    const resume = () => {
      clearInterval(timer);
      if (document.visibilityState === 'visible') { update(); timer = setInterval(update, 1000); }
    };
    resume();
    document.addEventListener('visibilitychange', resume);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', resume); };
  }, []);
  return <bdi dir="ltr" className="font-display text-stat-large-wide font-extrabold tabular-nums">{iftarCountdown(target, now)}</bdi>;
}
