'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ProgressBar } from '@/ui/progress-bar';
import { HIGH_VOLUME_THRESHOLD, heatIntensity } from '../analytics/heat';
import { muscles } from '../analytics/muscle-map';
import { messages } from '../analytics/messages';
import { messages as muscleMessages } from '../analytics/premium/messages';
import type { VolumeWeek } from '../data/muscle-volume';

export function MuscleWeekSummary({ week }: { week?: VolumeWeek }) {
  const t = useT(messages), mt = useT(muscleMessages), locale = useLocale();
  const ranked = muscles.map(muscle => ({ muscle, sets: week?.muscles[muscle] ?? 0 }))
    .filter(row => row.sets > 0).sort((a, b) => b.sets - a.sets).slice(0, 4);
  return <div className="space-y-stack">
    <h2 className="text-row font-bold">{t('thisWeek')}</h2>
    {!ranked.length && <p className="text-sm text-muted">{t('emptyWeek')}</p>}
    {ranked.map(({ muscle, sets }) => {
      const label = mt(`muscle.${muscle}`);
      const count = formatNumber(sets, locale);
      const intensity = heatIntensity(sets);
      return <div key={muscle} className="flex items-center gap-inline text-xs">
        <span className="w-24 shrink-0">{label}</span>
        <ProgressBar thin value={sets} max={HIGH_VOLUME_THRESHOLD} aria-label={label} aria-valuetext={t('regionSets', { muscle: label, sets: count })}
          className={`flex-1 ${intensity < .45 ? '[&>div]:bg-muted [&>div]:bg-none' : intensity < .7 ? '[&>div]:bg-warn [&>div]:bg-none' : ''}`} />
        <bdi className="shrink-0 font-display text-muted">{count}</bdi>
      </div>;
    })}
  </div>;
}
