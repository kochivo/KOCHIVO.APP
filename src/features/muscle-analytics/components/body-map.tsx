'use client';

import { useId } from 'react';
import { useT } from '@/core/i18n/client';
import { useMusclePopover } from '../hooks/use-muscle-popover';
import { regions, muscles as muscleKeys } from '../analytics/muscle-map';
import type { Muscle, MuscleVolume, Region } from '../analytics/muscle-map';
import { messages } from '../analytics/messages';
import { messages as muscleMessages } from '../analytics/premium/messages';
import { HEAT_STEPS, heatClass } from '../analytics/heat';
import { BodyFigure } from './body-figure';

export function BodyMap({ volume, muscles, total }: { volume: Record<Region, number>; muscles: MuscleVolume; total: number }) {
  const t = useT(messages);
  const mt = useT(muscleMessages);
  const id = useId();
  const { card, selection, select, close } = useMusclePopover();
  const top = [...muscleKeys].filter(muscle => (muscles[muscle] ?? 0) > 0)
    .sort((a, b) => (muscles[b] ?? 0) - (muscles[a] ?? 0)).slice(0, 3)
    .map(muscle => t('regionSets', { n: muscles[muscle] ?? 0, muscle: mt(`muscle.${muscle}`), sets: muscles[muscle] ?? 0 })).join(t('separator')) || t('noRegions');
  const detail = selection && (selection.kind === 'region'
    ? { name: t(`region.${selection.key as Region}`), sets: volume[selection.key as Region] }
    : { name: mt(`muscle.${selection.key as Muscle}`), sets: muscles[selection.key as Muscle] ?? 0 });
  return <div ref={card} className="relative" onPointerDown={event => {
    if (event.target === event.currentTarget) close();
  }}>
    <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-card-gap" dir="ltr">
      {(['front', 'back'] as const).map(view => <BodyFigure key={view} view={view} id={id}
        label={t('bodyLabel', { view: t(view), regions: top })}
        volume={muscles} select={select} />)}
    </div>
    <div data-heat-scale className="mx-auto mt-stack flex max-w-sm items-center gap-inline text-xs text-muted">
      <span>{t('less')}</span>
      <svg aria-hidden viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 min-w-8 flex-1 overflow-hidden rounded-full rtl:rotate-180">
        {HEAT_STEPS.map((sets, index) => <rect key={sets} x={index * 20} width="20" height="8" className={heatClass(sets)} />)}
      </svg>
      <span>{t('more')}</span><span className="shrink-0 font-bold text-ink">{mt('sets', { n: total, sets: total })}</span>
    </div>
    <ul className="mt-stack grid grid-cols-3 gap-inline">
      {regions.map(region => <li key={region}><button type="button" data-muscle-trigger
        aria-label={t('regionSets', { n: volume[region], muscle: t(`region.${region}`), sets: volume[region] })}
        aria-pressed={selection?.kind === 'region' && selection.key === region}
        aria-controls={selection?.kind === 'region' && selection.key === region ? `${id}-detail` : undefined}
        onClick={event => {
          const bounds = event.currentTarget.getBoundingClientRect();
          select(region, bounds.x, bounds.y, 'region');
        }}
        className="glass min-h-12 w-full rounded-control px-inline py-inline text-xs text-ink focus-visible:outline-2 focus-visible:outline-lime">
        {t(`region.${region}`)}<span className="ms-inline font-bold">{volume[region]}</span>
      </button></li>)}
    </ul>
    {selection && detail && <div id={`${id}-detail`} role="status"
      className="glass-strong pointer-events-none absolute z-10 rounded-control p-stack text-sm font-bold text-ink shadow-lime-glow"
      style={{ insetInlineStart: selection.x, top: selection.y, width: selection.width, maxHeight: 72 }} dir="ltr">
      <bdi>{t('regionSets', { n: detail.sets, muscle: detail.name, sets: detail.sets })}</bdi>
    </div>}
  </div>;
}
