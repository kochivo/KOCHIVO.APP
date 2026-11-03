'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useState } from 'react';
import { Button, TextField } from '@/ui';
import { moveExercise, removeExercise, renameDay, toggleSuperset, updateExercise } from '../draft';
import { daySummary } from '../summary';
import type { DraftDay, ProgramDraft } from '../types';
import { ExerciseRow } from './exercise-row';

export function DayEditor({ day, update }: { day: DraftDay; update: (operation: (draft: ProgramDraft) => ProgramDraft) => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>([]);
  const summary = daySummary(day);
  const selection = selected.filter(id => day.exercises.some(row => row.id === id));
  return <section aria-label={t('todaysExercises')} className="min-w-0 space-y-4">
    <h2 className="sr-only">{t('todaysExercises')}</h2>
    <TextField label={t('dayName')} maxLength={60} value={day.title} onChange={event => update(draft => renameDay(draft, day.id, event.target.value))} />
    <p className="glass-strong rounded-control p-4 text-sm">{t('exerciseCount', { n: summary.exercises, count: formatNumber(summary.exercises, locale) })} · {t('setCount', { n: summary.sets, count: formatNumber(summary.sets, locale) })} · {t('minuteCount', { n: summary.minutes, count: formatNumber(summary.minutes, locale) })}</p>
    {day.exercises.length === 0 && <p className="glass rounded-card p-6 text-muted">{t('addTheFirstExercise')}</p>}
    <ol className="space-y-4">{day.exercises.map((row, index) => <li key={row.id}><ExerciseRow row={row} first={index === 0} last={index === day.exercises.length - 1}
      selected={selection.includes(row.id)} onSelect={() => setSelected(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id])}
      onMove={delta => update(draft => moveExercise(draft, day.id, row.id, delta))}
      onDelete={() => update(draft => removeExercise(draft, day.id, row.id))}
      onUpdate={patch => update(draft => updateExercise(draft, day.id, row.id, patch))} /></li>)}</ol>
    {day.exercises.length > 0 && <Button variant="secondary" className="min-h-12" disabled={selection.length < 2} onClick={() => {
      update(draft => toggleSuperset(draft, day.id, selection)); setSelected([]);
    }}>{t('groupUngroupSuperset')}</Button>}
  </section>;
}
