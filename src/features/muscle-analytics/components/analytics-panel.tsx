'use client';

import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr } from '@/lib/dates';
import { HEAT_STEPS, heatClass, OVERLOAD_THRESHOLD } from '../analytics/heat';
import { muscles } from '../analytics/muscle-map';
import { messages } from '../analytics/messages';
import { messages as muscleMessages } from '../analytics/premium/messages';
import type { VolumeWeek } from '../data/muscle-volume';
import { BalanceBar } from './balance-bar';
import { BodyMap } from './body-map';
import { WeekSlider } from './week-slider';
import { QuickStats } from './quick-stats';

export function AnalyticsPanel({ weeks, self = false, readiness = null }: { weeks: VolumeWeek[]; self?: boolean; readiness?: number | null }) {
  const [selected, setSelected] = useState(4);
  const t = useT(messages);
  const mt = useT(muscleMessages);
  const locale = useLocale();
  const week = weeks[selected - 1];
  if (!week || !weeks.some(item => item.total > 0)) return <p className="text-muted">{t(self ? 'emptySelf' : 'empty')}</p>;
  const fatigue = muscles.filter(muscle => (week.muscles[muscle] ?? 0) > OVERLOAD_THRESHOLD);
  return <div className="space-y-6">
    <WeekSlider value={selected} onChange={setSelected} />
    <p className="text-xs text-muted">{t('weekDates', { date: formatDateAr(week.start, { day: 'numeric', month: 'short' }, locale) })}</p>
    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
      <div className="md:col-start-2 md:row-start-1"><QuickStats week={week} readiness={readiness} /></div>
      <div className="glass min-w-0 rounded-card p-4 md:col-start-1 md:row-start-1">
        <BodyMap key={week.start} volume={week.regions} muscles={week.muscles} total={week.total} />
      </div>
    </div>
    <BalanceBar volume={week.muscles} />
    <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
      <span>{t('legend')}</span>
      {HEAT_STEPS.map(value => <span key={value} className="inline-flex items-center gap-1.5">
        <svg aria-hidden viewBox="0 0 16 16" className="size-3 stroke-line"><rect x="1" y="1" width="14" height="14" rx="4" className={heatClass(value)} /></svg>
        {t(`heat${value}`)}
      </span>)}
    </div>
    <div aria-live="polite" className="space-y-2">
      {week.total === 0 && <p className="text-sm text-muted">{t('emptyWeek')}</p>}
      {fatigue.map(muscle => <p key={muscle} className="text-sm text-danger">
        {t('highLoad', { muscle: mt(`muscle.${muscle}`) })}
      </p>)}
    </div>
  </div>;
}
