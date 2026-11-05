'use client';

import { useId } from 'react';
import { useT } from '@/core/i18n/client';
import { useMusclePopover } from '../hooks/use-muscle-popover';
import { regions } from '../analytics/muscle-map';
import type { Region } from '../analytics/muscle-map';
import { messages } from '../analytics/messages';
import { BodyFigure } from './body-figure';

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
      {(['front', 'back'] as const).map(view => <BodyFigure key={view} view={view} id={id}
        caption={t(view)} label={t('bodyLabel', { view: t(view), regions: top })}
        volume={volume} select={select} />)}
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
