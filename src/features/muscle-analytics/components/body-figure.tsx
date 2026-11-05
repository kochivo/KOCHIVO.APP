import { cn } from '@/lib/cn';
import { heatClass, heatIntensity, OVERLOAD_THRESHOLD } from '../analytics/heat';
import { muscles } from '../analytics/muscle-map';
import type { Muscle, MuscleVolume } from '../analytics/muscle-map';
import { bodyPaths, definitionLines, silhouette } from './body-paths';

type Props = {
  view: 'front' | 'back';
  id: string;
  label: string;
  volume: MuscleVolume;
  select: (muscle: Muscle, x: number, y: number) => void;
};

export function BodyFigure({ view, id, label, volume, select }: Props) {
  const visible = muscles.filter(muscle => bodyPaths[view][muscle]?.length);
  return <figure className="min-w-0 text-center">
    <div style={{ aspectRatio: '160 / 350' }}>
      <svg viewBox="0 0 160 350" role="img" aria-label={label}
        className="h-full w-full stroke-bg-deep" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        <defs>
          <filter id={`${id}-${view}-glow`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="1" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path className="fill-surface stroke-line/60" d={silhouette} pointerEvents="none" />
        {visible.map(muscle => {
          const sets = volume[muscle] ?? 0;
          return <g key={muscle} data-muscle={muscle} data-muscle-trigger
            onClick={event => select(muscle, event.clientX, event.clientY)}
            filter={heatIntensity(sets) === 1 ? `url(#${id}-${view}-glow)` : undefined}
            className={cn(heatClass(sets), sets > OVERLOAD_THRESHOLD && 'stroke-danger',
              'cursor-pointer transition-[fill] duration-150 motion-reduce:transition-none')}>
            {bodyPaths[view][muscle]?.map((path, index) => <path key={index} d={path} />)}
          </g>;
        })}
        <g className="stroke-bg-deep/40" fill="none" pointerEvents="none" strokeWidth={1}>
          {definitionLines[view].map((path, index) => <path key={index} d={path} />)}
        </g>
      </svg>
    </div>
  </figure>;
}
