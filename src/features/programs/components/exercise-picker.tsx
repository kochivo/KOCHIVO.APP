'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { ExerciseImage } from '@/ui/exercise-image';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { exerciseMediaUrl } from '@/core/storage';
import { exerciseName } from '@/lib/display-name';
import { Button, EmptyState, ErrorState, LoadingState, TextField } from '@/ui';
import { searchExercises } from '../data/library';
import type { LibraryExercise, Result } from '../types';



export function ExercisePicker({ disabled, onAdd }: { disabled: boolean; onAdd: (exercise: LibraryExercise) => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const parts: [string, string][] = [['', t('all')], ['chest', t('chest')], ['back', t('back')], ['upper legs', t('thighs')], ['lower legs', t('calves')],
  ['shoulders', t('shoulders')], ['upper arms', t('upperArms')], ['lower arms', t('forearms')], ['waist', t('abs')], ['cardio', t('cardio')], ['neck', t('neck')]];
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result<LibraryExercise[]> | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const key = JSON.stringify([query, bodyPart, revision]);
  useEffect(() => {
    let current = true;
    searchExercises({ query, bodyPart, limit: 30 }).then(data => {
      if (current) { setResult(data); setLoadedKey(key); }
    }).catch(() => { if (current) { setResult({ error: t('couldntLoadExercisesTryAgain') }); setLoadedKey(key); } });
    return () => { current = false; };
  }, [query, bodyPart, revision, key, t]);
  return <section aria-label={t('exerciseLibrary')} className="glass min-w-0 space-y-4 rounded-card p-4">
    <h2 className="font-bold">{t('exerciseLibrary')}</h2>
    <TextField label={t('searchInArabicOrEnglish')} value={query} onChange={event => setQuery(event.target.value)} />
    <div className="flex flex-wrap gap-2" aria-label={t('bodyPart')}>
      {parts.map(([value, label]) => <Button key={value} variant="ghost" className="min-h-12 border border-line" aria-pressed={bodyPart === value}
        onClick={() => setBodyPart(value)}>{label}</Button>)}
    </div>
    <p className="text-xs text-muted">{t('attribution')}</p>
    {loadedKey !== key || result === null ? <LoadingState /> : result.error ?
      <ErrorState message={result.error} retryLabel={t('tryAgain')} onRetry={() => setRevision(value => value + 1)} /> : <>
        {result.data?.length === 0 && <EmptyState icon={Search} title={t('noExerciseWithThisName')} body={t('searchInArabicOrEnglish')}
          action={{ label: t('clearSearch'), onClick: () => { setQuery(''); setBodyPart(''); setRevision(value => value + 1); } }} />}
        <ul className="space-y-2">{result.data?.map(exercise => <li key={exercise.id}>
          <button type="button" disabled={disabled} onClick={() => onAdd(exercise)}
            className="glass flex min-h-16 w-full items-center gap-3 rounded-control p-2 text-start disabled:opacity-40">
            {exercise.media_path && <ExerciseImage src={exerciseMediaUrl(exercise.media_path)} alt="" width={48} height={48} />}
            <span className="min-w-0 flex-1 break-words text-sm font-bold"><bdi>{exerciseName(exercise, locale)}</bdi></span>
            <span className="text-xs text-muted">{t('add')}</span>
          </button>
        </li>)}</ul>
      </>}
  </section>;
}
