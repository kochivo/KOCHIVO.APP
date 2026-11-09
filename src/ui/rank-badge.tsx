'use client';

import { useId } from 'react';
import { RankBadgeShapes } from './rank-badge-shapes';

export type RankTier = 'beginner' | 'champion' | 'elite' | 'legend' | 'crown';

type RankBadgeProps = {
  tier: RankTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  locked?: boolean;
  label: string;
};

const widths = { sm: 40, md: 64, lg: 96, xl: 140 };

export function RankBadge({ tier, size = 'md', locked = false, label }: RankBadgeProps) {
  const id = useId();
  const width = widths[size];
  return (
    <svg role="img" aria-label={label || undefined} aria-hidden={label ? undefined : true}
      viewBox="0 0 120 130" width={width} height={width * 130 / 120}
      className={locked ? 'shrink-0 grayscale opacity-30' : 'shrink-0'}
    >
      <defs>
        <linearGradient id={`${id}-gBr`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-bronze-1)' }} />
          <stop offset=".35" style={{ stopColor: 'var(--color-bronze-2)' }} />
          <stop offset=".65" style={{ stopColor: 'var(--color-bronze-3)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-bronze-4)' }} />
        </linearGradient>
        <linearGradient id={`${id}-gSi`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-silver-1)' }} />
          <stop offset=".4" style={{ stopColor: 'var(--color-silver-2)' }} />
          <stop offset=".7" style={{ stopColor: 'var(--color-silver-3)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-silver-4)' }} />
        </linearGradient>
        <linearGradient id={`${id}-gGo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-gold-1)' }} />
          <stop offset=".35" style={{ stopColor: 'var(--color-gold-2)' }} />
          <stop offset=".7" style={{ stopColor: 'var(--color-gold-3)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-gold-4)' }} />
        </linearGradient>
        <linearGradient id={`${id}-gPl`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-platinum-1)' }} />
          <stop offset=".45" style={{ stopColor: 'var(--color-platinum-2)' }} />
          <stop offset=".75" style={{ stopColor: 'var(--color-platinum-3)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-platinum-4)' }} />
        </linearGradient>
        <linearGradient id={`${id}-gLi`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-crown-gem-1)' }} />
          <stop offset=".5" style={{ stopColor: 'var(--color-crown-gem-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-crown-gem-3)' }} />
        </linearGradient>
        <radialGradient id={`${id}-fBr`} cx=".35" cy=".3" r=".9">
          <stop offset="0" style={{ stopColor: 'var(--color-bronze-face-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-bronze-face-2)' }} />
        </radialGradient>
        <radialGradient id={`${id}-fSi`} cx=".35" cy=".3" r=".9">
          <stop offset="0" style={{ stopColor: 'var(--color-silver-face-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-silver-face-2)' }} />
        </radialGradient>
        <radialGradient id={`${id}-fGo`} cx=".35" cy=".3" r=".9">
          <stop offset="0" style={{ stopColor: 'var(--color-gold-face-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-gold-face-2)' }} />
        </radialGradient>
        <radialGradient id={`${id}-fOb`} cx=".35" cy=".3" r=".9">
          <stop offset="0" style={{ stopColor: 'var(--color-obsidian-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-obsidian-2)' }} />
        </radialGradient>
        <radialGradient id={`${id}-fCr`} cx=".5" cy=".35" r=".8">
          <stop offset="0" style={{ stopColor: 'var(--color-crown-gem-face-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-crown-gem-face-2)' }} />
        </radialGradient>
        <linearGradient id={`${id}-shine`}>
          <stop offset="0" style={{ stopColor: 'var(--color-silver-1)' }} stopOpacity="0" />
          <stop offset=".5" style={{ stopColor: 'var(--color-silver-1)' }} stopOpacity=".3" />
          <stop offset="1" style={{ stopColor: 'var(--color-silver-1)' }} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <RankBadgeShapes tier={tier} id={id} outline />
        </clipPath>
      </defs>
      <RankBadgeShapes tier={tier} id={id} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="-60" y="-20" width="32" height="180"
          fill={`url(#${id}-shine)`} className="rank-shine"
          style={{ animationDuration: tier === 'crown' ? '3s' : '4s' }} />
      </g>
    </svg>
  );
}

