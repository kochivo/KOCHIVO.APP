'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import type { readinessScore } from '../score';

export function ScoreRings({ result, small = false }: {
  result: ReturnType<typeof readinessScore>; small?: boolean;
}) {
  const t = useT(messages);
  const rings = [
    { part: result?.parts.sleep, radius: 48, color: 'text-sleep', label: t('sleepPart') },
    { part: result?.parts.water, radius: 38, color: 'text-water', label: t('water') },
    { part: result?.parts.soreness, radius: 28, color: 'text-sore', label: t('sorePart') },
  ];
  return <div className={`glass-strong rounded-full ${small ? 'size-12' : 'mx-auto size-52'}`}>
    <svg viewBox="0 0 112 112" role="img" aria-label={t('score', { n: result?.score ?? t('dash') })} className="size-full">
      {rings.map(ring => <g key={ring.radius} className={ring.color}>
        <title>{ring.label}</title>
        <circle cx="56" cy="56" r={ring.radius} fill="none" stroke="currentColor" strokeWidth="5" opacity=".15" />
        <circle cx="56" cy="56" r={ring.radius} fill="none" stroke="currentColor" strokeWidth="5"
          strokeLinecap="round" pathLength="100" strokeDasharray={`${(ring.part ?? 0) * 100} 100`}
          transform="rotate(-90 56 56)" />
      </g>)}
      <text x="56" y="61" textAnchor="middle" fill="currentColor" className="font-display text-base font-bold text-ink">{result?.score ?? t('dash')}</text>
    </svg>
  </div>;
}
