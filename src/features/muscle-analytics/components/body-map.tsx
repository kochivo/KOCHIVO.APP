'use client';

import { useId } from 'react';
import { useT } from '@/core/i18n/client';
import { cn } from '@/lib/cn';
import { heatIntensity } from '../analytics/heat';
import { useMusclePopover } from '../hooks/use-muscle-popover';
import { regions } from '../analytics/muscle-map';
import type { Region } from '../analytics/muscle-map';
import { messages } from '../analytics/messages';

const front = {
  shoulders: ['M44 64 Q32 65 29 88 L44 93 L53 72 Z', 'M116 64 Q128 65 131 88 L116 93 L107 72 Z'],
  chest: ['M54 69 L78 74 L78 109 L51 104 L45 93 Z', 'M106 69 L82 74 L82 109 L109 104 L115 93 Z'],
  abs: ['M53 110 L78 115 L78 170 L65 181 L57 153 Z', 'M107 110 L82 115 L82 170 L95 181 L103 153 Z'],
  arms: ['M28 95 L42 100 L36 137 L25 166 L16 184 L11 179 L17 151 Z', 'M132 95 L118 100 L124 137 L135 166 L144 184 L149 179 L143 151 Z'],
  legs: ['M58 166 L77 182 L75 231 L66 272 L64 321 L45 329 L43 322 L51 314 L50 270 L47 219 Z', 'M102 166 L83 182 L85 231 L94 272 L96 321 L115 329 L117 322 L109 314 L110 270 L113 219 Z'],
};
const back = {
  shoulders: front.shoulders,
  back: ['M54 68 L78 76 L78 163 L63 155 L51 114 L45 93 Z', 'M106 68 L82 76 L82 163 L97 155 L109 114 L115 93 Z'],
  arms: front.arms,
  legs: ['M61 162 L78 171 L76 205 L72 244 L65 272 L64 321 L45 329 L43 322 L51 314 L50 270 L48 219 Z', 'M99 162 L82 171 L84 205 L88 244 L95 272 L96 321 L115 329 L117 322 L109 314 L110 270 L112 219 Z'],
};
const anchors: Record<Region, { x: number; y: number }> = {
  chest: { x: 42, y: 25 }, back: { x: 50, y: 32 }, shoulders: { x: 24, y: 22 },
  arms: { x: 17, y: 37 }, abs: { x: 50, y: 40 }, legs: { x: 38, y: 62 },
};

export function BodyMap({ volume }: { volume: Record<Region, number> }) {
  const t = useT(messages);
  const id = useId();
  const { card, selection, select, close } = useMusclePopover();
  const top = [...regions].filter(region => volume[region] > 0)
    .sort((a, b) => volume[b] - volume[a]).slice(0, 3)
    .map(region => t('regionSets', { muscle: t(`region.${region}`), sets: volume[region] })).join(t('separator')) || t('noRegions');
  return <div ref={card} className="relative" onPointerDown={event => {
    if (event.target === event.currentTarget) close();
  }}>
    <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-5" dir="ltr">
    {(['front', 'back'] as const).map(view => {
      const paths = view === 'front' ? front : back;
      return <figure key={view} className="min-w-0">
        <figcaption className="text-center text-xs font-bold text-muted">{t(view)}</figcaption>
        <div className="relative" style={{ aspectRatio: '160 / 350' }}>
          <svg viewBox="0 0 160 350" role="img" aria-label={t('bodyLabel', { view: t(view), regions: top })}
            className="h-full w-full stroke-line/60" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
            <defs>
              <filter id={`${id}-${view}-glow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {regions.map(region => <linearGradient key={region} id={`${id}-${view}-${region}`} x2="0" y2="1" className="text-lime">
                <stop stopColor="currentColor" stopOpacity={heatIntensity(volume[region])} />
                <stop offset="1" stopColor="currentColor" stopOpacity={heatIntensity(volume[region]) * .4} />
              </linearGradient>)}
            </defs>
            <path className="fill-surface" d="M67 19 Q80 11 93 19 L96 35 Q96 48 87 54 L89 62 L105 66 L101 74 L80 70 L59 74 L55 66 L71 62 L73 54 Q64 48 64 35 Z" />
            {Object.entries(paths).map(([key, shapes]) => <g key={key} data-region={key} data-muscle-trigger
              onClick={event => select(key as Region, event.clientX, event.clientY)}
              fill={volume[key as Region] > 0 ? `url(#${id}-${view}-${key})` : 'currentColor'}
              filter={volume[key as Region] > 0 ? `url(#${id}-${view}-glow)` : undefined}
              className={cn(volume[key as Region] > 0 ? 'text-lime' : 'text-line', 'cursor-pointer transition-[fill] duration-150 motion-reduce:transition-none')}>
              {shapes.map((path, index) => <path key={index} d={path} />)}
            </g>)}
          </svg>
          {regions.filter(region => region in paths && volume[region] > 20).map(region => <span key={region}
            aria-hidden data-fatigue={region}
            className="pointer-events-none absolute size-2.5 animate-pulse rounded-full bg-danger ring-4 ring-danger/20 motion-reduce:animate-none"
            style={{ insetInlineStart: `${anchors[region].x}%`, top: `${anchors[region].y}%` }} />)}
        </div>
      </figure>;
    })}
    </div>
    <ul className="mt-3 grid grid-cols-3 gap-2">
      {regions.map(region => <li key={region}><button type="button" data-muscle-trigger
        aria-label={t('regionSets', { muscle: t(`region.${region}`), sets: volume[region] })}
        aria-pressed={selection?.region === region} aria-controls={selection?.region === region ? `${id}-detail` : undefined}
        onClick={event => {
          const bounds = event.currentTarget.getBoundingClientRect();
          select(region, bounds.x, bounds.y);
        }}
        className="glass min-h-12 w-full rounded-control px-2 py-1 text-xs text-ink focus-visible:outline-2 focus-visible:outline-lime">
        {t(`region.${region}`)}<span className="ms-1 font-bold">{volume[region]}</span>
      </button></li>)}
    </ul>
    {selection && <div id={`${id}-detail`} role="status"
      className="glass-strong pointer-events-none absolute z-10 rounded-control p-3 text-sm font-bold text-ink shadow-lime-glow"
      style={{ insetInlineStart: selection.x, top: selection.y, width: selection.width, maxHeight: 72 }} dir="ltr">
      <bdi>{t('regionSets', { muscle: t(`region.${selection.region}`), sets: volume[selection.region] })}</bdi>
    </div>}
  </div>;
}
