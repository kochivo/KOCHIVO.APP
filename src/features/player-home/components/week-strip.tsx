'use client';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { formatNumber } from '@/lib/format';
import { GlassCard } from '@/ui';
import { cn } from '@/lib/cn';
import type { WeekEntry } from '../week';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function WeekStrip({ days, nextDays = days, today, selected = today, onSelect }: {
  nextDays?: WeekEntry[];
  days: WeekEntry[]; today: string; selected?: string; onSelect?: (date: string) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [paging, setPaging] = useState({ today, next: false });
  if (paging.today !== today) setPaging({ today, next: false });
  const next = paging.today === today && paging.next;
  const states = { done: t('workoutDone'), today: t('today'), train: t('workout'), rest: t('rest') };
  if (captainWorkspaceEnabled()) return <section>
    <ul className="grid grid-cols-7" aria-label={t('week')}>{(next ? nextDays : days).map(day => <li key={day.date} className="min-w-0">
      <Button variant="ghost" type="button" onClick={() => onSelect?.(day.date)} aria-pressed={day.date === selected}
        aria-current={day.date === today ? 'date' : undefined}
        aria-label={t('weekDayLabel', { value0: day.label, value1: formatNumber(day.dayOfMonth, locale), value2: states[day.state] })}
        className="flex min-h-12 w-full min-w-0 flex-col items-center justify-center rounded-control p-0!">
        <span className="max-w-full truncate text-micro text-muted">{day.label}</span>
        <span className={cn('grid size-8 place-items-center rounded-control font-display text-sm font-extrabold tabular-nums',
          day.state === 'done' ? 'bg-lime text-on-lime' : day.state === 'train' ? 'bg-surface-raised' : 'text-muted',
          day.date === selected && 'ring-1 ring-inset ring-lime')}>{formatNumber(day.dayOfMonth, locale)}</span>
      </Button>
    </li>)}</ul>
    <details className="group mt-inline"><summary className="flex min-h-12 cursor-pointer items-center justify-center text-xs text-faint">{t(next ? 'nextWeek' : 'thisWeek')}<ChevronDown aria-hidden className="ms-auto size-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
      <div className="flex justify-between">
        <IconButton className="min-h-12 min-w-12" aria-label={t('thisWeek')} disabled={!next} onClick={() => { setPaging({ today, next: false }); onSelect?.(today); }}><ChevronLeft aria-hidden className="mx-auto rtl:rotate-180" /></IconButton>
        <IconButton className="min-h-12 min-w-12" aria-label={t('nextWeek')} disabled={next} onClick={() => setPaging({ today, next: true })}><ChevronRight aria-hidden className="mx-auto rtl:rotate-180" /></IconButton>
      </div>
    </details>
  </section>;
  return <GlassCard className="p-inline"><div className="flex justify-between">
    <button type="button" className="min-h-12 min-w-12" aria-label={t('thisWeek')} disabled={!next} onClick={() => { setPaging({ today, next: false }); onSelect?.(today); }}><ChevronLeft aria-hidden className="mx-auto rtl:rotate-180" /></button>
    <button type="button" className="min-h-12 min-w-12" aria-label={t('nextWeek')} disabled={next} onClick={() => setPaging({ today, next: true })}><ChevronRight aria-hidden className="mx-auto rtl:rotate-180" /></button>
  </div><ul className="flex gap-inline" aria-label={t('week')}>
    {(next ? nextDays : days).map((day) => <li key={day.date} className="min-w-0 flex-1"><button type="button"
      onClick={() => { if (day.date === today) setPaging({ today, next: false }); onSelect?.(day.date); }} aria-pressed={day.date === selected}
      aria-label={t('weekDayLabel', { value0: day.label, value1: formatNumber(day.dayOfMonth, locale), value2: states[day.state] })}
      aria-current={day.date === today ? 'date' : undefined}
      className={cn('flex min-h-20 w-full min-w-0 flex-col items-center justify-center gap-inline rounded-control',
        day.date === selected && day.date !== today && 'glass-strong',
        day.date === today && 'outline-2 outline-lime', day.state === 'rest' && 'text-muted')}>
      <span className="text-micro text-muted">{day.label}</span>
      <span className="text-lg font-extrabold">{formatNumber(day.dayOfMonth, locale)}</span>
      <span aria-hidden className={cn('size-1.5 rounded-full', day.state === 'done' ? 'bg-lime' : day.state === 'train' ? 'border border-muted' : 'bg-transparent')} />
    </button></li>)}
  </ul></GlassCard>;
}
