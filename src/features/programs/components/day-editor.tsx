'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { exerciseName } from '@/lib/display-name';
import { messages } from '../messages';

import { useState } from 'react';
import { Dumbbell, Moon, Plus } from 'lucide-react';
import { uuidv7 } from '@/core/offline/ids';
import { Button, EmptyState, TextField } from '@/ui';
import { addExercise, moveDay, removeDay, moveExercise, reorderExercise, removeExercise, renameDay, updateExercise } from '../draft';
import { useDragReorder } from '../hooks/use-drag-reorder';
import { daySummary } from '../summary';
import type { DraftDay, ProgramDraft } from '../types';
import { ExerciseRow } from './exercise-row';
import { ExerciseDrawer } from './exercise-drawer';
import { CardioEditor } from './cardio-editor';
import { RestConfirmation } from './rest-confirmation';
import { editCardio, setRestDay, weekdayKeys } from '../weekly-draft';
import { BuilderMenu } from './builder-menu';
import { toggleNextSuperset } from './builder-fields';

export function DayEditor({ day, update, usedExerciseIds, first = false, last = false }: {
  day: DraftDay; update: (operation: (draft: ProgramDraft) => ProgramDraft) => void; usedExerciseIds?: string[];
  first?: boolean; last?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [confirmRest, setConfirmRest] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const announce = (id: string, index: number) => {
    const row = day.exercises.find(row => row.id === id);
    const name = (row?.library && exerciseName(row.library, locale)) || t('exerciseUnavailable');
    setAnnouncement(t('exerciseReordered', { name, position: formatNumber(index + 1, locale) }));
  };
  const { listRef, handleProps, rowStyle, draggingId } = useDragReorder(day.exercises.map(row => row.id), (id, index) => {
    update(draft => reorderExercise(draft, day.id, id, index));
    announce(id, index);
  });
  const cardio = day.cardio ?? [];
  const rest = Boolean(day.is_rest_day);
  const openerId = `program-add-exercise-${day.id}`;
  const addButton = <Button id={openerId} variant="secondary" className="glass-raised min-h-12 w-full gap-inline" onClick={() => setLibraryOpen(true)}>
    <Plus aria-hidden className="size-5" />{t('addExercise')}
  </Button>;
  const summary = daySummary(day);
  const title = day.weekday != null ? t(weekdayKeys[day.weekday] ?? 'sat') : day.title || t('newDay');
  return <div className="grid min-w-0 items-start gap-card-gap xl:grid-cols-[minmax(0,1fr)_16rem]">
    <section aria-label={t('todaysExercises')} className="glass min-w-0 space-y-card-gap rounded-card p-card">
    <div className="flex items-center justify-between gap-stack">
      <h2 id={`day-title-${day.id}`} tabIndex={-1} className="min-w-0 break-words text-xl font-bold">{title}</h2>
      {day.weekday == null && <BuilderMenu id={`day-menu-${day.id}`} fallbackId="program-days-heading" label={t('dayOptions', { name: title })} name={title}
        onDelete={() => update(draft => removeDay(draft, day.id))} actions={[
          { label: t('moveDayUp', { v0: formatNumber(day.position, locale), v1: title }), disabled: first,
            onClick: () => update(draft => moveDay(draft, day.id, -1)) },
          { label: t('moveDayDown', { v0: formatNumber(day.position, locale), v1: title }), disabled: last,
            onClick: () => update(draft => moveDay(draft, day.id, 1)) },
        ]} />}
    </div>
    {confirmRest && <RestConfirmation onCancel={() => setConfirmRest(false)}
      onConfirm={() => { update(draft => setRestDay(draft, day.id, true, true)); setConfirmRest(false); }} />}
    {rest ? <div className="glass flex min-h-32 items-center justify-center gap-stack rounded-card border border-dashed border-line p-card text-muted">
      <Moon aria-hidden className="size-6" />{t('recovery')}
    </div> : <>
    <p className="glass-strong rounded-control p-card text-sm">{t('exerciseCount', { n: summary.exercises, count: formatNumber(summary.exercises, locale) })} · {t('setCount', { n: summary.sets, count: formatNumber(summary.sets, locale) })} · {t('minuteCount', { n: summary.minutes, count: formatNumber(summary.minutes, locale) })}</p>
    {day.exercises.length === 0 && <EmptyState icon={Dumbbell} title={t('addTheFirstExercise')} body={t('emptyBody')}
      action={{ label: t('addExercise'), onClick: () => setLibraryOpen(true) }} />}
    <p aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
    <ol ref={listRef} className="divide-y divide-line-soft">{day.exercises.map((row, index) => <li key={row.id} style={rowStyle(index)}
      className={draggingId === row.id ? 'select-none' : draggingId ? 'transition-transform duration-150 motion-reduce:transition-none' : ''}>
      <ExerciseRow row={row} first={index === 0} last={index === day.exercises.length - 1}
      dragProps={handleProps(row.id)} dragging={draggingId === row.id}
      onLink={() => update(draft => toggleNextSuperset(draft, day.id, row.id))}
      onMove={delta => {
        if (draggingId || index + delta < 0 || index + delta >= day.exercises.length) return;
        update(draft => moveExercise(draft, day.id, row.id, delta)); announce(row.id, index + delta);
      }}
      onDelete={() => update(draft => removeExercise(draft, day.id, row.id))}
      onUpdate={patch => update(draft => updateExercise(draft, day.id, row.id, patch))} /></li>)}</ol>
    {day.exercises.length > 0 && addButton}
    {cardio.length === 0 && <p className="text-sm text-muted">{t('noCardio')}</p>}
    <ol className="space-y-stack">{cardio.map((row, index) => <li key={row.id}><CardioEditor row={row} first={index === 0} last={index === cardio.length - 1}
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
    {libraryOpen && <ExerciseDrawer openerId={openerId} dayTitle={day.title} usedExerciseIds={usedExerciseIds ?? day.exercises.map(row => row.exercise_id)}
      onClose={() => setLibraryOpen(false)} onAdd={exercise => {
      const id = uuidv7(); update(draft => addExercise(draft, day.id, exercise, id));
    }} />}
  </section>
  <aside className="glass min-w-0 space-y-stack rounded-card p-card">
    <TextField label={t('dayName')} placeholder={t('dayPlaceholder')} maxLength={60} value={day.title} onChange={event => update(draft => renameDay(draft, day.id, event.target.value))} />
    {day.weekday != null && <label className="flex min-h-12 items-center gap-stack">
      <input type="checkbox" className="size-6 accent-lime" checked={rest} onChange={event => {
        const checked = event.target.checked;
        if (checked && (day.exercises.length || cardio.length)) setConfirmRest(true);
        else update(draft => setRestDay(draft, day.id, checked, false));
      }} />{t('setRest')}
    </label>}
  </aside>
  </div>;
}
