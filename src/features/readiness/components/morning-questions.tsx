'use client';

import { Activity, Moon } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import type { DailyCheckRow } from '@/core/offline/tables';
import { messages } from '../messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';

export function MorningQuestions({ row, onChange, disabled = false }: {
  row: DailyCheckRow | null; disabled?: boolean;
  onChange: (patch: Partial<Pick<DailyCheckRow, 'sleep_hours' | 'soreness'>>) => void;
}) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled();
  return <section className={v6 ? 'space-y-stack' : 'glass space-y-card-gap rounded-card p-card'} aria-label={t('questions')}>
    {v6 && <header><h2 className="font-display text-h font-semibold">{v6t('title')}</h2>
      <p className="mt-inline text-xs text-muted">{v6t('intro')}</p></header>}
    <div role="group" aria-label={t('sleep')} className={v6 ? 'glass space-y-stack rounded-card border border-line-soft p-card' : 'space-y-stack'}>
      <h2 className="flex items-center gap-inline"><Moon aria-hidden className="size-5 text-sleep" />{t('sleep')}</h2>
      <div className="flex flex-wrap gap-inline">{[4, 5, 6, 7, 8, 9].map(value =>
        <button key={value} disabled={disabled} type="button" aria-pressed={row?.sleep_hours === value}
          onClick={() => onChange({ sleep_hours: value })}
          className={v6 ? `min-h-12 min-w-12 rounded-full border border-line-soft px-stack ${row?.sleep_hours === value ? 'bg-ink text-bg-deep' : 'text-muted'}` : `min-h-12 min-w-12 rounded-control border border-line px-stack ${row?.sleep_hours === value ? 'bg-calm text-bg' : 'text-ink'}`}>
          {value === 4 ? t('sleepLow') : value === 9 ? t('sleepHigh') : v6 ? value : t('hours', { n: value })}
        </button>)}</div>
    </div>
    <div role="group" aria-label={t('soreness')} className={v6 ? 'glass space-y-stack rounded-card border border-line-soft p-card' : 'space-y-stack'}>
      <h2 className="flex items-center gap-inline"><Activity aria-hidden className="size-5 text-sore" />{t('soreness')}</h2>
      <div className="flex flex-wrap gap-inline">{([1, 2, 3, 4, 5] as const).map(value =>
        <button key={value} disabled={disabled} type="button" aria-pressed={row?.soreness === value}
          onClick={() => onChange({ soreness: value })}
          className={v6 ? `min-h-12 rounded-full border border-line-soft px-stack ${row?.soreness === value ? 'bg-ink text-bg-deep' : 'text-muted'}` : `min-h-12 rounded-control border border-line px-stack ${row?.soreness === value ? 'bg-calm text-bg' : 'text-ink'}`}>
          {t(`sore${value}`)}
        </button>)}</div>
    </div>
  </section>;
}
