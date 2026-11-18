'use client';

import { useT } from '@/core/i18n/client';
import { useLocale } from '@/core/i18n/client';
import { useToast } from '@/ui/toast';
import { exerciseName } from '@/lib/display-name';
import { messages as successMessages } from '../success/messages';
import { useState } from 'react';
import { KoPlus } from '@/ui/icons/ko-plus';
import { Button } from '@/ui/button';
import { uuidv7 } from '@/core/offline/ids';
import { addExercise, daySummary, removeExercise, reorderExercise, updateExercise, useDragReorder, warmupMinutes, programMessages } from '@/features/programs';
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
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as phoneMessages } from './phone/messages';

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
  const enabled = captainWorkspaceEnabled();
  const phone = useT(phoneMessages);
  const success = useT(successMessages), toast = useToast(), locale = useLocale();
  const [announcement, setAnnouncement] = useState('');
  const searchId = `training-exercise-search-${day.id}`;
  const summary = daySummary(day);
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
    <div className="grid min-w-0 items-start gap-card-gap @min-[780px]:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)] @min-[1040px]:grid-cols-[minmax(0,1fr)_18rem]">
    <section className={`@container glass min-w-0 rounded-card border border-line-soft${enabled ? ' max-md:border-0 max-md:bg-none max-md:shadow-none' : ''}`}>
    <div className={`flex min-h-14 flex-wrap items-center justify-between gap-inline px-card pt-card pb-stack${enabled && day.exercises.length ? ' max-md:sr-only' : ''}`}>
      <h2 className="text-md font-bold">{day.title || et('exerciseTitle')}</h2>
      <span className="text-xs text-muted">{day.exercises.length ? et('minutes', { n: summary.minutes + warmupMinutes(day.warmup) }) : et('unknownDuration')}</span></div>
    {!day.exercises.length && <p className="p-card text-sm text-faint">{t('noExercises')}</p>}
    <p aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
    <ol ref={listRef} className={enabled ? 'max-md:space-y-card-gap' : undefined}>{day.exercises.map((row, index) => {
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
    <div className={`p-card${enabled ? ' max-md:px-0 max-md:pb-0' : ''}`}><Button type="button" variant="secondary" block className="border-dashed" onClick={() => document.getElementById(searchId)?.focus()}>
      <KoPlus aria-hidden className="size-4" />{enabled ? <><span className="max-md:hidden">{pt('addExercise')}</span><span className="md:hidden">{phone('addExercise')}</span></> : pt('addExercise')}
    </Button></div>
    </section>
    <aside className="glass min-w-0 space-y-stack rounded-card p-card">
    <h2 className="text-md font-bold">{pt('exerciseLibrary')}</h2>
    <InlineSearch inputId={searchId} day={day} onAdd={row => {
      update(draft => addExercise(draft, day.id, row, uuidv7()));
      toast.success({ title: success('added'), detail: success('exerciseDetail', { name: exerciseName(row, locale), day: day.title }), icon: 'program' });
    }}
      onLibraryChange={library => update(draft => ({ ...draft, days: draft.days.map(item => ({ ...item, exercises: item.exercises.map(row => row.exercise_id === library.id ? { ...row, library } : row) })) }))} />
    <CustomExercise />
    </aside>
    </div>
  </CustomExerciseNavigation>;
}
