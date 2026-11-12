'use client';

import { useT } from '@/core/i18n/client';
import { useState } from 'react';
import { uuidv7 } from '@/core/offline/ids';
import { addExercise, removeExercise, reorderExercise, updateExercise, useDragReorder, programMessages } from '@/features/programs';
import type { DraftDay, ProgramDraft } from '@/features/programs';
import { TrainingExerciseRow } from './exercise-row';
import { InlineSearch } from './inline-search';
import { messages } from './messages';

export function DayExercises({ day, update }: { day: DraftDay; update: (operation: (draft: ProgramDraft) => ProgramDraft) => void }) {
  const t = useT(messages), pt = useT(programMessages);
  const [announcement, setAnnouncement] = useState('');
  const move = (id: string, index: number) => {
    update(draft => reorderExercise(draft, day.id, id, index));
    const row = day.exercises.find(row => row.id === id);
    setAnnouncement(pt('exerciseReordered', { name: row?.library?.name_en || pt('exerciseUnavailable'), position: Math.max(1, Math.min(day.exercises.length, index + 1)) }));
  };
  const { listRef, handleProps, rowStyle } = useDragReorder(day.exercises.map(row => row.id), move);
  return <section className="glass min-w-0 rounded-card border border-line-soft">
    {!day.exercises.length && <p className="p-5 text-sm text-faint">{t('noExercises')}</p>}
    <p aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
    <ol ref={listRef}>{day.exercises.map((row, index) => <TrainingExerciseRow key={row.id} row={row}
      dragProps={handleProps(row.id)} style={rowStyle(index)}
      onPatch={patch => update(draft => updateExercise(draft, day.id, row.id, patch))}
      onRemove={() => update(draft => removeExercise(draft, day.id, row.id))}
      onMove={delta => move(row.id, index + delta)} />)}</ol>
    <InlineSearch day={day} onAdd={row => update(draft => addExercise(draft, day.id, row, uuidv7()))} />
  </section>;
}
