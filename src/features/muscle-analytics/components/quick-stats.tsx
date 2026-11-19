'use client';

import { Activity, Layers, Trophy } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../analytics/premium/messages';
import { summary } from '../analytics/summary';
import type { VolumeWeek } from '../data/muscle-volume';

export function QuickStats({ week, readiness }: { week: VolumeWeek; readiness: number | null }) {
  const t = useT(messages);
  const stats = summary(week, readiness);
  const items = [
    { label: t('weeklySets'), value: stats.total, detail: t('legend'), Icon: Layers },
    { label: t('mostWorked'), value: stats.mostWorked ? t(`muscle.${stats.mostWorked.muscle}`) : t('noRegions'),
      detail: stats.mostWorked ? t('sets', { n: stats.mostWorked.sets, sets: stats.mostWorked.sets }) : t('emptyWeek'), Icon: Trophy },
    { label: t('recovery'), value: t(stats.recovery), detail: t(readiness === null ? 'volumeRecovery' : 'dailyRecovery'), Icon: Activity },
  ];
  return <dl className="grid grid-cols-3 gap-inline md:grid-cols-1 md:gap-stack">
    {items.map(({ label, value, detail, Icon }) => <div key={label} className="glass-strong min-w-0 space-y-inline rounded-card p-stack md:p-card">
      <dt className="flex flex-wrap items-center gap-inline text-xs font-bold text-muted"><Icon aria-hidden className="size-4 shrink-0 text-lime" />{label}</dt>
      <dd className="break-normal hyphens-none text-balance font-display text-base font-bold text-ink md:text-2xl">{value}</dd>
      <dd className="text-xs text-muted">{detail}</dd>
    </div>)}
  </dl>;
}
