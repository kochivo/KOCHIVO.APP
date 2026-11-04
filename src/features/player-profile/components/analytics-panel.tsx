'use client';

import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr } from '@/lib/dates';
import { heatClass } from '../analytics/heat';
import { regions } from '../analytics/muscle-map';
import { messages } from '../analytics/messages';
import type { VolumeWeek } from '../data/muscle-volume';
import { BalanceBar } from './balance-bar';
import { BodyMap } from './body-map';
import { WeekSlider } from './week-slider';

export function AnalyticsPanel({ weeks }: { weeks: VolumeWeek[] }) {
  const [selected, setSelected] = useState(4);
  const t = useT(messages);
  const locale = useLocale();
  const week = weeks[selected - 1];
  if (!week || !weeks.some(item => item.total > 0)) return <p className="text-muted">{t('empty')}</p>;
  const fatigue = regions.filter(region => week.regions[region] > 20);
  return <div className="space-y-6">
    <WeekSlider value={selected} onChange={setSelected} />
    <p className="text-xs text-muted">{t('weekDates', { date: formatDateAr(week.start, { day: 'numeric', month: 'short' }, locale) })}</p>
    <BalanceBar anterior={week.anterior} posterior={week.posterior} />
    <BodyMap volume={week.regions} />
    <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
      <span>{t('legend')}</span>
      {([0, 1, 6, 13] as const).map(value => <span key={value} className="inline-flex items-center gap-1.5">
        <svg aria-hidden viewBox="0 0 16 16" className="size-3 stroke-line"><rect x="1" y="1" width="14" height="14" rx="4" className={heatClass(value)} /></svg>
        {t(`heat${value}`)}
      </span>)}
    </div>
    <div aria-live="polite" className="space-y-2">
      {week.total === 0 && <p className="text-sm text-muted">{t('emptyWeek')}</p>}
      {fatigue.map(region => <p key={region} className="flex items-center gap-2 text-sm text-danger">
        <span aria-hidden className="size-2 rounded-full bg-danger" />{t('highLoad', { muscle: t(`region.${region}`) })}
      </p>)}
    </div>
  </div>;
}
