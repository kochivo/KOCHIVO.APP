'use client';

import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import type { GeneratedProgram } from '../generate';
import { messages, weekdays } from '../messages';
import { GeneratedExercise } from './generated-exercise';

export function GeneratedWeek({ program, loading = false, error = false, onSwap }: {
  program: GeneratedProgram | null; loading?: boolean; error?: boolean;
  onSwap: (weekday: number, position: number) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [selected, setSelected] = useState(0);
  if (loading) return <p role="status">{t('loading')}</p>;
  if (error) return <p role="alert" className="text-danger">{t('unfilled')}</p>;
  if (!program || !program.days.length) return <p role="status">{t('empty')}</p>;
  const day = program.days.find(day => day.weekday === selected) ?? program.days[0];
  return <section dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-card-gap">
    <div role="tablist" aria-label={t('week')} className="flex gap-inline overflow-x-auto">
      {weekdays.map((key, weekday) => <button type="button" role="tab" key={key} id={`generator-tab-${weekday}`}
        aria-selected={day?.weekday === weekday} aria-controls={`generator-day-${weekday}`}
        tabIndex={day?.weekday === weekday ? 0 : -1}
        onKeyDown={event => {
          const delta = event.key === 'ArrowRight' ? (locale === 'ar' ? -1 : 1) : event.key === 'ArrowLeft' ? (locale === 'ar' ? 1 : -1) : 0;
          if (!delta && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 6 : (weekday + delta + 7) % 7;
          setSelected(next); document.getElementById(`generator-tab-${next}`)?.focus();
        }}
        className={`min-h-12 shrink-0 rounded-control px-page-x ${day?.weekday === weekday ? 'glass-strong font-bold' : 'glass text-muted'}`}
        onClick={() => setSelected(weekday)}>{t(key)}</button>)}
    </div>
    {day && <div role="tabpanel" id={`generator-day-${day.weekday}`} aria-labelledby={`generator-tab-${day.weekday}`} className="space-y-stack">
      {day.is_rest_day || !day.exercises.length ? <p className="glass-strong rounded-card p-section">{t('rest')}</p> :
        <ul className="space-y-stack">{day.exercises.map(row => <li key={row.position}>
          <GeneratedExercise row={row} onSwap={() => onSwap(day.weekday ?? 0, row.position)} />
        </li>)}</ul>}
    </div>}
  </section>;
}
