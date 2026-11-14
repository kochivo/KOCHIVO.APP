'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useResource } from '@/core/resource';
import { useT } from '@/core/i18n/client';
import type { LibraryExercise } from '@/features/programs';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { exerciseDetailMessages } from '../messages';
import { addExerciseToProgram, exerciseProgramDays, exercisePrograms } from './exercise-program-actions';

export function ExerciseProgramPicker({ exercise, onClose }: { exercise: LibraryExercise; onClose: () => void }) {
  const t = useT(exerciseDetailMessages);
  const [program, setProgram] = useState(''), [day, setDay] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const load = useCallback(() => exercisePrograms(), []);
  const programs = useResource('exercise-detail:programs', load);
  const loadDays = useCallback(() => program ? exerciseProgramDays(program) : Promise.resolve([]), [program]);
  const days = useResource(`exercise-detail:days:${program}`, loadDays);
  const field = 'min-h-12 w-full rounded-control border border-line bg-surface px-3 text-start';
  return <section aria-label={t('choose')} className="glass-strong mt-4 space-y-3 rounded-card border border-line p-5">
    <h3 ref={heading} tabIndex={-1} className="font-semibold">{t('choose')}</h3>
    {programs.error ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void programs.retry()} /> : !programs.data ?
      <LoadingState variant="detail" /> : !programs.data.length ? <p>{t('empty')}</p> : <>
      <label className="block space-y-2"><span>{t('program')}</span><select className={field} value={program} disabled={state === 'saving'} onChange={event => {
        setProgram(event.target.value); setDay(''); setState('idle');
      }}><option value="">{t('program')}</option>{programs.data.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
      {program && (days.error ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void days.retry()} /> : !days.data ?
        <LoadingState variant="detail" /> : !days.data.length ? <p>{t('noDays')}</p> :
        <label className="block space-y-2"><span>{t('day')}</span><select className={field} value={day} disabled={state === 'saving'} onChange={event => { setDay(event.target.value); setState('idle'); }}>
          <option value="">{t('day')}</option>{days.data.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>)}
      <Button variant="secondary" disabled={!program || !day || state === 'saving' || state === 'saved'} onClick={async () => {
        if (lock.current) return;
        lock.current = true; setState('saving');
        try { setState(await addExerciseToProgram(program, day, exercise.id) ? 'saved' : 'error'); }
        catch { setState('error'); }
        finally { lock.current = false; }
      }}>{t(state === 'saving' ? 'saving' : 'add')}</Button>
    </>}
    {state === 'saved' && <p role="status">{t('saved')}</p>}
    {state === 'error' && <p role="alert">{t('saveError')}</p>}
    <Button variant="secondary" disabled={state === 'saving'} onClick={onClose}>{t('cancel')}</Button>
  </section>;
}
