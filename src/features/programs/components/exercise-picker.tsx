'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import dynamic from 'next/dynamic';
import { useToast } from '@/ui/toast';
import { uuidv7 } from '@/core/offline/ids';
import { bodyParts, bodyPartLabels, customExerciseSchema, optimisticExercise, prependExercise } from '../custom-exercises';
import type { CustomExerciseInput } from '../custom-exercises';
import { createCustomExercise, updateCustomExercise, deleteCustomExercise } from '../data/custom-exercise';

import { ExerciseImage } from '@/ui/exercise-image';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { exerciseMediaUrl } from '@/core/storage';
import { exerciseName } from '@/lib/display-name';
import { Button, EmptyState, ErrorState, LoadingState, TextField } from '@/ui';
import { searchExercises } from '../data/library';
import type { LibraryExercise, Result } from '../types';
const CustomExerciseSheet = dynamic(() => import('./custom-exercise-sheet').then(module => module.CustomExerciseSheet), {
  ssr: false, loading: () => <LoadingState />,
});
export function ExercisePicker({ disabled, onAdd, usedExerciseIds = [] }: {
  disabled: boolean; onAdd: (exercise: LibraryExercise) => void; usedExerciseIds?: string[];
}) {
  const t = useT(messages);
  const locale = useLocale();
  const parts: [string, string][] = [['', t('all')], ...bodyParts.map((part): [string, string] => [part, t(bodyPartLabels[part])])];
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result<LibraryExercise[]> | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [mine, setMine] = useState(false);
  const [sheet, setSheet] = useState<{ exercise: LibraryExercise | null } | null>(null);
  const [local, setLocal] = useState<LibraryExercise[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string[]>([]);
  const pending = useRef(new Map<string, Promise<Result<LibraryExercise>>>());
  const toast = useToast();
  const key = JSON.stringify(mine ? [query, bodyPart, revision, mine] : [query, bodyPart, revision]);
  useEffect(() => {
    let current = true;
    searchExercises({ query, bodyPart, limit: 30, mine }).then(data => {
      if (current) { setResult(data); setLoadedKey(key); }
    }).catch(() => { if (current) { setResult({ error: t('couldntLoadExercisesTryAgain') }); setLoadedKey(key); } });
    return () => { current = false; };
  }, [query, bodyPart, revision, key, mine, t]);
  const save = (input: CustomExerciseInput) => {
    const previous = sheet?.exercise;
    const id = previous?.id ?? uuidv7();
    const optimistic = { ...previous, ...optimisticExercise(id, customExerciseSchema.parse(input)) };
    setLocal(rows => prependExercise(rows, optimistic));
    setQuery(''); setBodyPart(''); setSheet(null);
    setBusy(ids => [...ids, id]);
    const request = (previous ? updateCustomExercise(id, input) : createCustomExercise(input, id))
      .catch((): Result<LibraryExercise> => ({ error: t('customExerciseSaveFailed') }));
    pending.current.set(id, request);
    void request.then(saved => {
      if (saved.data) { setLocal(rows => prependExercise(rows, saved.data)); toast.success(t('customExerciseSaved')); }
      else {
        setLocal(rows => previous ? prependExercise(rows, previous) : rows.filter(row => row.id !== id));
        toast.error(saved.error);
      }
      pending.current.delete(id);
      setBusy(ids => ids.filter(value => value !== id));
    });
  };
  const remove = async (id: string) => {
    if (usedExerciseIds.includes(id)) { toast.error(t('customExerciseInUse')); return; }
    setBusy(ids => [...ids, id]);
    setDeleting(ids => [...ids, id]);
    try {
      const deleted = await deleteCustomExercise(id);
      if (deleted.error) toast.error(deleted.error);
      else { setRemoved(ids => [...ids, id]); toast.success(t('customExerciseDeleted')); }
    } catch { toast.error(t('customExerciseDeleteFailed')); }
    finally { setBusy(ids => ids.filter(value => value !== id)); setDeleting(ids => ids.filter(value => value !== id)); }
  };
  const rows = [...local, ...(loadedKey === key ? result?.data ?? [] : []).filter(row => !local.some(item => item.id === row.id))]
    .filter(row => !removed.includes(row.id) && (!mine || row.is_own) && (!bodyPart || row.body_part === bodyPart) &&
      (!query.trim() || `${row.name_ar ?? ''} ${row.name_en}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  return <section aria-label={t('exerciseLibrary')} className="glass min-w-0 space-y-4 rounded-card p-4">
    <h2 className="font-bold">{t('exerciseLibrary')}</h2>
    <Button disabled={disabled} onClick={() => setSheet({ exercise: null })}>{t('newCustomExercise')}</Button>
    <Button variant="ghost" aria-pressed={mine} onClick={() => setMine(value => !value)}>{t('myExercises')}</Button>
    {sheet && <CustomExerciseSheet exercise={sheet.exercise} onClose={() => setSheet(null)} onSave={save} />}
    <TextField label={t('searchInArabicOrEnglish')} value={query} onChange={event => setQuery(event.target.value)} />
    <div className="flex flex-wrap gap-2" aria-label={t('bodyPart')}>
      {parts.map(([value, label]) => <Button key={value} variant="ghost" className="min-h-12 border border-line" aria-pressed={bodyPart === value}
        onClick={() => setBodyPart(value)}>{label}</Button>)}
    </div>
    <p className="text-xs text-muted">{t('attribution')}</p>
    {loadedKey !== key || result === null ? <LoadingState /> : result.error ?
      <ErrorState message={result.error} retryLabel={t('tryAgain')} onRetry={() => setRevision(value => value + 1)} /> : null}
        {loadedKey === key && result?.data && rows.length === 0 && <EmptyState icon={Search} title={t('noExerciseWithThisName')} body={t('searchInArabicOrEnglish')}
          action={{ label: t('clearSearch'), onClick: () => { setQuery(''); setBodyPart(''); setMine(false); setRevision(value => value + 1); } }} />}
        <ul className="space-y-2">{rows.map(exercise => <li key={exercise.id}>
          <button type="button" disabled={disabled || deleting.includes(exercise.id)} onClick={() => {
            const request = pending.current.get(exercise.id);
            if (request) void request.then(saved => { if (saved.data) onAdd(saved.data); });
            else onAdd(exercise);
          }}
            className="glass flex min-h-16 w-full items-center gap-3 rounded-control p-2 text-start disabled:opacity-40">
            {exercise.media_path && <ExerciseImage src={exerciseMediaUrl(exercise.media_path)} alt="" width={48} height={48} />}
            <span className="min-w-0 flex-1 break-words text-sm font-bold"><bdi>{exerciseName(exercise, locale)}</bdi></span>
            <span className="text-xs text-muted">{t('add')}</span>
          </button>
          {exercise.is_own && <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{t('ownExercise')}</span>
            {busy.includes(exercise.id) && !deleting.includes(exercise.id) && <span role="status" className="text-xs text-muted">{t('customExerciseSaving')}</span>}
            <Button variant="ghost" disabled={disabled || busy.includes(exercise.id)} onClick={() => setSheet({ exercise })}>{t('editCustomExercise')}</Button>
            <Button variant="ghost" disabled={disabled || busy.includes(exercise.id)} onClick={() => void remove(exercise.id)}>{t('deleteCustomExercise')}</Button>
          </div>}
        </li>)}</ul>
  </section>;
}
