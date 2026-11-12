'use client';

import { useT } from '@/core/i18n/client';
import { useState } from 'react';
import { uuidv7 } from '@/core/offline/ids';
import { addExercise, removeExercise, reorderExercise, updateExercise, useDragReorder, programMessages } from '@/features/programs';
import type { DraftDay, ProgramDraft } from '@/features/programs';
import { TrainingExerciseRow } from './exercise-row';
import { InlineSearch } from './inline-search';
import { messages } from './messages';
import { messages as editorMessages } from './editor/messages';
import { linkNext } from './editor-draft';
import { CustomExercise } from './custom-exercise';

export function DayExercises({ day, update }: { day: DraftDay; update: (operation: (draft: ProgramDraft) => ProgramDraft) => void }) {
  const t = useT(messages), pt = useT(programMessages), et = useT(editorMessages);
  const [announcement, setAnnouncement] = useState('');
  const move = (id: string, index: number) => {
    update(draft => reorderExercise(draft, day.id, id, index));
    const row = day.exercises.find(row => row.id === id);
    setAnnouncement(pt('exerciseReordered', { name: row?.library?.name_ar || row?.library?.name_en || pt('exerciseUnavailable'), position: Math.max(1, Math.min(day.exercises.length, index + 1)) }));
  };
  const { listRef, handleProps, rowStyle } = useDragReorder(day.exercises.map(row => row.id), move);
  return <section className="glass min-w-0 rounded-card border border-line-soft">
    <div className="flex min-h-16 flex-wrap items-center gap-2.5 px-[18px] py-3.5"><span className="grid size-6 place-items-center rounded-lg bg-lime-soft font-display text-xs font-extrabold text-lime">{2}</span>
      <h2 className="font-display text-[19px] font-semibold">{et('exerciseTitle')}</h2><span className="text-xs text-faint">{et('exerciseCount', { n: day.exercises.length, sets: day.exercises.reduce((sum, row) => sum + row.sets, 0) })}</span></div>
    {!day.exercises.length && <p className="p-5 text-sm text-faint">{t('noExercises')}</p>}
    <p aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
    <ol ref={listRef}>{day.exercises.map((row, index) => <TrainingExerciseRow key={row.id} row={row}
      first={index === 0} last={index === day.exercises.length - 1} onLink={() => update(draft => linkNext(draft, day.id, row.id))}
      groupStart={row.superset_group !== null && row.superset_group !== day.exercises[index - 1]?.superset_group}
      dragProps={handleProps(row.id)} style={rowStyle(index)}
      onPatch={patch => update(draft => updateExercise(draft, day.id, row.id, patch))}
      onRemove={() => update(draft => removeExercise(draft, day.id, row.id))}
      onMove={delta => move(row.id, index + delta)} />)}</ol>
    <InlineSearch day={day} onAdd={row => update(draft => addExercise(draft, day.id, row, uuidv7()))}
      onLibraryChange={library => update(draft => ({ ...draft, days: draft.days.map(item => ({ ...item, exercises: item.exercises.map(row => row.exercise_id === library.id ? { ...row, library } : row) })) }))} />
    <CustomExercise onAdd={row => update(draft => addExercise(draft, day.id, row, uuidv7()))} />
  </section>;
}
