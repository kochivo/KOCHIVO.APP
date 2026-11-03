'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useState } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { uuidv7 } from '@/core/offline/ids';
import { Button, EmptyState, TextField } from '@/ui';
import { addExercise, moveExercise, removeExercise, renameDay, toggleSuperset, updateExercise } from '../draft';
import { daySummary } from '../summary';
import type { DraftDay, ProgramDraft } from '../types';
import { ExerciseRow } from './exercise-row';
import { ExerciseDrawer } from './exercise-drawer';

export function DayEditor({ day, update, usedExerciseIds }: {
  day: DraftDay; update: (operation: (draft: ProgramDraft) => ProgramDraft) => void; usedExerciseIds?: string[];
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const openerId = `program-add-exercise-${day.id}`;
  const addButton = <Button id={openerId} variant="secondary" className="glass-raised min-h-12 w-full gap-2" onClick={() => setLibraryOpen(true)}>
    <Plus aria-hidden className="size-5 text-lime" />{t('addExercise')}
  </Button>;
  const summary = daySummary(day);
  const selection = selected.filter(id => day.exercises.some(row => row.id === id));
  return <section aria-label={t('todaysExercises')} className="glass min-w-0 space-y-4 rounded-card p-4 sm:p-6">
    <h2 className="sr-only">{t('todaysExercises')}</h2>
    <TextField label={t('dayName')} maxLength={60} value={day.title} onChange={event => update(draft => renameDay(draft, day.id, event.target.value))} />
    <p className="glass-strong rounded-control p-4 text-sm">{t('exerciseCount', { n: summary.exercises, count: formatNumber(summary.exercises, locale) })} · {t('setCount', { n: summary.sets, count: formatNumber(summary.sets, locale) })} · {t('minuteCount', { n: summary.minutes, count: formatNumber(summary.minutes, locale) })}</p>
    {day.exercises.length === 0 && <EmptyState icon={Dumbbell} title={t('addTheFirstExercise')} body={t('emptyBody')}
      action={{ label: t('addExercise'), onClick: () => setLibraryOpen(true) }} />}
    <ol className="space-y-4">{day.exercises.map((row, index) => <li key={row.id}><ExerciseRow row={row} first={index === 0} last={index === day.exercises.length - 1}
      selected={selection.includes(row.id)} onSelect={() => setSelected(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id])}
      onMove={delta => update(draft => moveExercise(draft, day.id, row.id, delta))}
      onDelete={() => update(draft => removeExercise(draft, day.id, row.id))}
      onUpdate={patch => update(draft => updateExercise(draft, day.id, row.id, patch))} /></li>)}</ol>
    {day.exercises.length > 0 && addButton}
    {day.exercises.length > 0 && <Button variant="secondary" className="min-h-12" disabled={selection.length < 2} onClick={() => {
      update(draft => toggleSuperset(draft, day.id, selection)); setSelected([]);
    }}>{t('groupUngroupSuperset')}</Button>}
    {libraryOpen && <ExerciseDrawer openerId={openerId} usedExerciseIds={usedExerciseIds ?? day.exercises.map(row => row.exercise_id)}
      onClose={() => setLibraryOpen(false)} onAdd={exercise => {
      const id = uuidv7(); update(draft => addExercise(draft, day.id, exercise, id));
    }} />}
  </section>;
}
