import { cn } from '@/lib/cn';
import { heatIntensity } from '../analytics/heat';
import { regions } from '../analytics/muscle-map';
import type { Region } from '../analytics/muscle-map';
import { bodyPaths, definitionLines, silhouette } from './body-paths';

const anchors: Record<Region, { x: number; y: number }> = {
  chest: { x: 39, y: 23 }, back: { x: 41, y: 29 }, shoulders: { x: 22, y: 22 },
  arms: { x: 19, y: 32 }, abs: { x: 45, y: 36 }, legs: { x: 39, y: 61 },
};

type Props = {
  view: 'front' | 'back';
  id: string;
  label: string;
  caption: string;
  volume: Record<Region, number>;
  select: (region: Region, x: number, y: number) => void;
};

export function BodyFigure({ view, id, label, caption, volume, select }: Props) {
  const visible = regions.filter(region => bodyPaths[view][region].length > 0);
  return <figure className="min-w-0 text-center">
    <figcaption className="glass inline-block rounded-full px-3 py-1 text-xs font-bold text-muted">{caption}</figcaption>
    <div className="relative mt-2" style={{ aspectRatio: '160 / 350' }}>
      <svg viewBox="0 0 160 350" role="img" aria-label={label}
        className="h-full w-full stroke-bg-deep/60" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        <defs>
          <filter id={`${id}-${view}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {visible.map(region => <linearGradient key={region} id={`${id}-${view}-${region}`} x2="0" y2="1" className="text-lime">
            <stop stopColor="currentColor" stopOpacity={heatIntensity(volume[region])} />
            <stop offset="1" stopColor="currentColor" stopOpacity={heatIntensity(volume[region]) * .4} />
          </linearGradient>)}
        </defs>
        <path className="fill-surface stroke-line/60" d={silhouette} pointerEvents="none" />
        {visible.map(region => <g key={region} data-region={region} data-muscle-trigger
          onClick={event => select(region, event.clientX, event.clientY)}
          fill={volume[region] > 0 ? `url(#${id}-${view}-${region})` : 'currentColor'}
          filter={volume[region] > 0 ? `url(#${id}-${view}-glow)` : undefined}
          className={cn(volume[region] > 0 ? 'text-lime' : 'text-line', 'cursor-pointer transition-[fill] duration-150 motion-reduce:transition-none')}>
          {bodyPaths[view][region].map((path, index) => <path key={index} d={path} />)}
        </g>)}
        <g className="stroke-bg-deep/40" fill="none" pointerEvents="none" strokeWidth={1}>
          {definitionLines[view].map((path, index) => <path key={index} d={path} />)}
        </g>
      </svg>
      {visible.filter(region => volume[region] > 20).map(region => <span key={region}
        aria-hidden data-fatigue={region}
        className="pointer-events-none absolute size-2.5 animate-pulse rounded-full bg-danger ring-4 ring-danger/20 motion-reduce:animate-none"
        style={{ insetInlineStart: `${anchors[region].x}%`, top: `${anchors[region].y}%` }} />)}
    </div>
  </figure>;
}
