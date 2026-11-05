'use client';

import { Activity, Moon } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import type { DailyCheckRow } from '@/core/offline/tables';
import { messages } from '../messages';

export function MorningQuestions({ row, onChange, disabled = false }: {
  row: DailyCheckRow | null; disabled?: boolean;
  onChange: (patch: Partial<Pick<DailyCheckRow, 'sleep_hours' | 'soreness'>>) => void;
}) {
  const t = useT(messages);
  return <section className="glass space-y-5 rounded-card p-5" aria-label={t('questions')}>
    <div role="group" aria-label={t('sleep')} className="space-y-3">
      <h2 className="flex items-center gap-2"><Moon aria-hidden className="size-5 text-sleep" />{t('sleep')}</h2>
      <div className="flex flex-wrap gap-2">{[4, 5, 6, 7, 8, 9].map(value =>
        <button key={value} disabled={disabled} type="button" aria-pressed={row?.sleep_hours === value}
          onClick={() => onChange({ sleep_hours: value })}
          className={`min-h-12 min-w-12 rounded-control border border-line px-3 ${row?.sleep_hours === value ? 'bg-calm text-bg' : 'text-ink'}`}>
          {value === 4 ? t('sleepLow') : value === 9 ? t('sleepHigh') : t('hours', { n: value })}
        </button>)}</div>
    </div>
    <div role="group" aria-label={t('soreness')} className="space-y-3">
      <h2 className="flex items-center gap-2"><Activity aria-hidden className="size-5 text-sore" />{t('soreness')}</h2>
      <div className="flex flex-wrap gap-2">{([1, 2, 3, 4, 5] as const).map(value =>
        <button key={value} disabled={disabled} type="button" aria-pressed={row?.soreness === value}
          onClick={() => onChange({ soreness: value })}
          className={`min-h-12 rounded-control border border-line px-3 ${row?.soreness === value ? 'bg-calm text-bg' : 'text-ink'}`}>
          {t(`sore${value}`)}
        </button>)}</div>
    </div>
  </section>;
}
