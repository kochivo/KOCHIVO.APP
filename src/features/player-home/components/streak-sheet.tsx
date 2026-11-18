'use client';
import { IconButton } from '@/ui/icon-button';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { formatNumber } from '@/lib/format';
import { formatDateAr, saturdayWeek } from '@/lib/dates';
import { messages } from '../messages';
import type { StreakStats } from '../streak';
import { StreakRing } from './streak-ring';

export function StreakSheet({ stats, today, completedDates, isTrainingDay, onClose, footer }: {
  stats: StreakStats; today: string; completedDates: readonly string[]; isTrainingDay: (date: string) => boolean; onClose: () => void; footer?: ReactNode;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const rows = [ [t('streakThisWeek'), t('streakRatio', { done: number(stats.weekDone), planned: number(stats.weekPlanned) })],
    [t('streakBest'), number(stats.best)], [t('streakMonth'), number(stats.monthDone)] ];
  return <ResponsiveDialog modal fallbackId="streak-pill" openerId="streak-pill" onDismiss={onClose}
    aria-labelledby="streak-title" className="sheet fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-lg space-y-section rounded-t-3xl text-ink sm:mx-auto"
    onClick={event => { if (event.target === event.currentTarget) {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.x || event.clientX > bounds.x + bounds.width || event.clientY < bounds.y || event.clientY > bounds.y + bounds.height) onClose();
    } }}>
    <div className="flex items-center justify-between">
      <h2 id="streak-title">{t('streakTitle')}</h2>
      <IconButton type="button" onClick={onClose} aria-label={t('streakClose')} className="grid min-h-12 min-w-12 place-items-center rounded-full"><X aria-hidden="true" size={20} /></IconButton>
    </div>
    <div className="glass-strong mx-auto grid size-[168px] place-items-center rounded-full">
      <div className="col-start-1 row-start-1"><StreakRing done={stats.weekDone} planned={stats.weekPlanned} size={168} stroke={3} /></div>
      <div className="col-start-1 row-start-1 text-center"><p className="text-stat-large font-light tabular-nums">{number(stats.current)}</p><p className="text-xs text-muted">{t('streakConsecutive')}</p></div>
    </div>
    <p className="text-center text-sm text-muted">{t('streakRestLine')}</p>
    <div className="flex justify-between gap-inline">{saturdayWeek(today).map(date => {
      const done = completedDates.includes(date);
      const state = done ? t('workoutDone') : isTrainingDay(date) ? t('workout') : t('rest');
      return <div key={date} className="flex flex-col items-center gap-inline text-xs text-muted"
        aria-label={`${formatDateAr(date, { weekday: 'long' }, locale)}: ${state}${date === today ? `، ${t('today')}` : ''}`}>
        <span>{formatDateAr(date, { weekday: 'short' }, locale)}</span>
        <span aria-hidden="true" className={`size-3 rounded-full border ${done ? 'border-ember bg-ember' : isTrainingDay(date) ? 'border-muted' : 'border-line'} ${date === today ? 'outline outline-1 outline-offset-4 outline-ember' : ''}`} />
      </div>;
    })}</div>
    <dl className="grid grid-cols-3 divide-x divide-line">{rows.map(([label, value]) => <div key={label} className="space-y-inline px-inline text-center">
      <dt className="text-xs text-muted">{label}</dt><dd className="text-xl font-light tabular-nums">{value}</dd>
    </div>)}</dl>
    {footer}
  </ResponsiveDialog>;
}
