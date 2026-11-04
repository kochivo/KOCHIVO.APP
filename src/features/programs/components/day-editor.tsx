'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useState } from 'react';
import { Dumbbell, Moon, Plus } from 'lucide-react';
import { uuidv7 } from '@/core/offline/ids';
import { Button, EmptyState, TextField } from '@/ui';
import { addExercise, moveExercise, removeExercise, renameDay, toggleSuperset, updateExercise } from '../draft';
import { daySummary } from '../summary';
import type { DraftDay, ProgramDraft } from '../types';
import { ExerciseRow } from './exercise-row';
import { ExerciseDrawer } from './exercise-drawer';
import { CardioEditor } from './cardio-editor';
import { RestConfirmation } from './rest-confirmation';
import { editCardio, setRestDay, weekdayKeys } from '../weekly-draft';

export function DayEditor({ day, update, usedExerciseIds }: {
  day: DraftDay; update: (operation: (draft: ProgramDraft) => ProgramDraft) => void; usedExerciseIds?: string[];
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [confirmRest, setConfirmRest] = useState(false);
  const cardio = day.cardio ?? [];
  const rest = Boolean(day.is_rest_day);
  const openerId = `program-add-exercise-${day.id}`;
  const addButton = <Button id={openerId} variant="secondary" className="glass-raised min-h-12 w-full gap-2" onClick={() => setLibraryOpen(true)}>
    <Plus aria-hidden className="size-5 text-lime" />{t('addExercise')}
  </Button>;
  const summary = daySummary(day);
  const selection = selected.filter(id => day.exercises.some(row => row.id === id));
  return <section aria-label={t('todaysExercises')} className="glass min-w-0 space-y-4 rounded-card p-4 sm:p-6">
    <h2 className="sr-only">{t('todaysExercises')}</h2>
    {day.weekday != null && <h3 className="text-xl font-bold">{t(weekdayKeys[day.weekday] ?? 'sat')}</h3>}
    <TextField label={t('dayName')} maxLength={60} value={day.title} onChange={event => update(draft => renameDay(draft, day.id, event.target.value))} />
    {day.weekday != null && <label className="flex min-h-12 items-center gap-3">
      <input type="checkbox" className="size-6 accent-lime" checked={rest} onChange={event => {
        const checked = event.target.checked;
        if (checked && (day.exercises.length || cardio.length)) setConfirmRest(true);
        else update(draft => setRestDay(draft, day.id, checked, false));
      }} />{t('setRest')}
    </label>}
    {confirmRest && <RestConfirmation onCancel={() => setConfirmRest(false)}
      onConfirm={() => { update(draft => setRestDay(draft, day.id, true, true)); setConfirmRest(false); }} />}
    {rest ? <div className="glass flex min-h-32 items-center justify-center gap-3 rounded-card border border-dashed border-line p-5 text-muted">
      <Moon aria-hidden className="size-6" />{t('recovery')}
    </div> : <>
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
    {cardio.length === 0 && <p className="text-sm text-muted">{t('noCardio')}</p>}
    <ol className="space-y-3">{cardio.map((row, index) => <li key={row.id}><CardioEditor row={row} first={index === 0} last={index === cardio.length - 1}
      onChange={next => update(draft => editCardio(draft, day.id, cardio.map(item => item.id === row.id ? next : item)))}
      onDelete={() => update(draft => editCardio(draft, day.id, cardio.filter(item => item.id !== row.id)))}
      onMove={delta => {
        const next = [...cardio]; const moved = next.splice(index, 1)[0];
        if (moved) next.splice(index + delta, 0, moved);
        update(draft => editCardio(draft, day.id, next));
      }} /></li>)}</ol>
    <Button variant="secondary" className="min-h-12 w-full" onClick={() => update(draft => editCardio(draft, day.id, [...cardio, {
      id: uuidv7(), day_id: day.id, position: cardio.length + 1, kind: t('walk'), minutes: 20, intensity: 'low', notes: '',
    }]))}>{t('addCardio')}</Button>
    </>}
    {libraryOpen && <ExerciseDrawer openerId={openerId} usedExerciseIds={usedExerciseIds ?? day.exercises.map(row => row.exercise_id)}
      onClose={() => setLibraryOpen(false)} onAdd={exercise => {
      const id = uuidv7(); update(draft => addExercise(draft, day.id, exercise, id));
    }} />}
  </section>;
}
