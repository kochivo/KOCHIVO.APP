'use client';

import { useT } from '@/core/i18n/client';
import { useLocale } from '@/core/i18n/client';
import { useToast } from '@/ui/toast';
import { exerciseName } from '@/lib/display-name';
import { messages as successMessages } from '../success/messages';
import { useState } from 'react';
import { uuidv7 } from '@/core/offline/ids';
import { addExercise, removeExercise, reorderExercise, updateExercise, useDragReorder, programMessages } from '@/features/programs';
import type { DraftDay, LibraryExercise, ProgramDraft } from '@/features/programs';
import { TrainingExerciseRow } from './exercise-row';
import { InlineSearch } from './inline-search';
import { messages } from './messages';
import { messages as editorMessages } from './editor/messages';
import { linkAbove, linkNext } from './editor-draft';
import { CustomExercise, CustomExerciseNavigation } from './custom-exercise';
import { replaceInjuryExercise } from './fit-checks';
import type { TaggedExercise } from './fit-checks';
import { supersetLabel, supersetTag } from '@/lib/superset';
import { messages as setMessages } from '@/lib/training/messages';

export function applyCustomExercise(draft: ProgramDraft, programId: string, dayId: string, library: LibraryExercise, mode: string, rowId: string): ProgramDraft {
  const day = draft.days.find(item => item.id === dayId);
  if (draft.id !== programId || !day || day.is_rest_day || !library.is_own) return draft;
  if (mode === 'edit') return { ...draft, days: draft.days.map(item => ({ ...item,
    exercises: item.exercises.map(row => ({ ...row, library: row.exercise_id === library.id ? library : row.library,
      alternative_library: row.alternative_library?.map(alternative => alternative.id === library.id ? library : alternative),
    })),
  })) };
  return mode === 'add' && !day.exercises.some(row => row.exercise_id === library.id)
    ? addExercise(draft, dayId, library, rowId) : draft;
}

export function DayExercises({ day, update, flush, injuries = [], candidates = [] }: {
  day: DraftDay; update: (operation: (draft: ProgramDraft) => ProgramDraft) => void;
  flush: () => Promise<boolean>;
  injuries?: readonly string[]; candidates?: readonly TaggedExercise[];
}) {
  const t = useT(messages), pt = useT(programMessages), et = useT(editorMessages);
  const success = useT(successMessages), toast = useToast(), locale = useLocale();
  const [announcement, setAnnouncement] = useState('');
  const st = useT(setMessages);
  const link = (id: string, above = false) => {
    update(draft => (above ? linkAbove : linkNext)(draft, day.id, id));
    setAnnouncement(st('aligned'));
  };
  const move = (id: string, index: number) => {
    update(draft => reorderExercise(draft, day.id, id, index));
    const row = day.exercises.find(row => row.id === id);
    setAnnouncement(pt('exerciseReordered', { name: row?.library?.name_ar || row?.library?.name_en || pt('exerciseUnavailable'), position: Math.max(1, Math.min(day.exercises.length, index + 1)) }));
  };
  const { listRef, handleProps, rowStyle } = useDragReorder(day.exercises.map(row => row.id), move);
  return <CustomExerciseNavigation value={{ programId: day.program_id, dayId: day.id, flush }}>
    <section className="glass min-w-0 rounded-card border border-line-soft">
    <div className="flex min-h-16 flex-wrap items-center gap-stack px-page-x py-card"><span className="grid size-6 place-items-center rounded-lg bg-lime-soft font-display text-xs font-extrabold text-lime">{2}</span>
      <h2 className="font-display text-title font-semibold">{et('exerciseTitle')}</h2><span className="text-xs text-faint">{et('exerciseCount', { n: day.exercises.length, sets: day.exercises.reduce((sum, row) => sum + row.sets, 0) })}</span></div>
    {!day.exercises.length && <p className="p-card text-sm text-faint">{t('noExercises')}</p>}
    <p aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
    <ol ref={listRef}>{day.exercises.map((row, index) => {
      const previous = day.exercises[index - 1], following = day.exercises[index + 1];
      const members = day.exercises.filter(item => row.superset_group !== null && item.superset_group === row.superset_group);
      const groupStart = members.length > 1 && previous?.superset_group !== row.superset_group;
      const groupEnd = members.length > 1 && following?.superset_group !== row.superset_group;
      return <TrainingExerciseRow key={row.id} row={row} tag={supersetTag(day.exercises, row)}
      groupStart={groupStart} groupEnd={groupEnd} groupLabel={supersetLabel(day.exercises, row)} groupRest={members.at(-1)?.rest_seconds}
      onLinkAbove={row.superset_group === null && previous?.superset_group === null ? () => link(row.id, true) : undefined}
      onThird={groupEnd && members.length === 2 && following?.superset_group === null ? () => link(following.id, true) : undefined}
      injuries={injuries} candidates={candidates}
      onReplace={library => update(draft => replaceInjuryExercise(draft, day.id, row.id, library))}
      first={index === 0} last={index === day.exercises.length - 1} onLink={() => link(row.id)}
      dragProps={handleProps(row.id)} style={rowStyle(index)}
      onPatch={patch => update(draft => updateExercise(draft, day.id, row.id, patch))}
      onRemove={() => update(draft => removeExercise(draft, day.id, row.id))}
      onMove={delta => move(row.id, index + delta)} />;
    })}</ol>
    {announcement && <p role="status" className="px-page-x py-stack text-xs text-muted">{announcement}</p>}
    <InlineSearch day={day} onAdd={row => {
      update(draft => addExercise(draft, day.id, row, uuidv7()));
      toast.success({ title: success('added'), detail: success('exerciseDetail', { name: exerciseName(row, locale), day: day.title }), icon: 'program' });
    }}
      onLibraryChange={library => update(draft => ({ ...draft, days: draft.days.map(item => ({ ...item, exercises: item.exercises.map(row => row.exercise_id === library.id ? { ...row, library } : row) })) }))} />
    <CustomExercise />
  </section></CustomExerciseNavigation>;
}
