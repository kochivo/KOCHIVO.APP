'use client';
import { useEffect, useRef } from 'react';

export function StreakRing({ done, planned, size, stroke = 1.5, animate = false }: {
  done: number; planned: number; size: number; stroke?: number; animate?: boolean;
}) {
  const arc = useRef<SVGCircleElement>(null);
  const offset = 100 - 100 * (planned > 0 ? Math.min(1, Math.max(0, done / planned)) : 0);
  const initialOffset = useRef(offset);
  useEffect(() => {
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = arc.current?.animate?.([{ strokeDashoffset: '100' }, { strokeDashoffset: String(initialOffset.current) }],
      { duration: 600, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [animate]);
  return <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
    <circle cx={size / 2} cy={size / 2} r={(size - stroke) / 2} fill="none" strokeWidth={stroke} className="stroke-line" />
    <circle ref={arc} cx={size / 2} cy={size / 2} r={(size - stroke) / 2} fill="none" strokeWidth={stroke}
      pathLength={100} strokeDasharray="100" strokeDashoffset={offset} strokeLinecap="round" className="stroke-ember" />
  </svg>;
}
