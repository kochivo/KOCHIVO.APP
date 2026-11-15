'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { localDb, useLiveQuery } from '@/core/offline';
import { useTimezone } from '@/core/timezone/client';
import { localDate } from '@/lib/dates';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v3Messages } from '../history-v3-messages';
import { HistoryCalendar } from './history-calendar';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, Chip, EmptyState, ErrorState, LoadingState } from '@/ui';
import { exerciseName } from '@/lib/display-name';
import { bestSet } from '../data/history-grouping';
import { useWorkoutHistory } from '../hooks/use-workout-history';
import { messages } from '../messages';
import { HistorySets } from './history-sets';
import { HistoryWorkoutRow, sessionPrIds } from './history-workout';

export function HistoryScreen({ playerId, exerciseId = '' }: { playerId: string; exerciseId?: string }) {
  const t = useT(messages);
  const v3t = useT(v3Messages);
  const v3 = captainWorkspaceEnabled();
  const timezone = useTimezone();
  const [today, setToday] = useState('');
  useEffect(() => {
    const update = () => setToday(localDate(new Date(), timezone));
    update();
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, [timezone]);
  const readSnapshot = useCallback(() => localDb().program_snapshot.get('active'), []);
  const snapshot = useLiveQuery(readSnapshot);
  const locale = useLocale();
  const [view, setView] = useState(exerciseId ? 'exercises' : 'workouts');
  const [selected, setSelected] = useState(exerciseId);
  const [limit, setLimit] = useState(20);
  const history = useWorkoutHistory(playerId, limit, v3 || view === 'exercises');
  const exercises = [...new Set(history.workouts.flatMap(row => row.exercises.map(exercise => exercise.id)))];
  const active = selected || exercises[0] || '';
  const workouts = view === 'exercises' ? history.workouts.filter(row => row.exercises.some(exercise => exercise.id === active)) : history.workouts;
  const best = bestSet(workouts.flatMap(row => row.exercises.filter(exercise => exercise.id === active).flatMap(exercise => exercise.sets)));
  const records = useMemo(() => v3 ? sessionPrIds(history.workouts) : new Set<string>(), [v3, history.workouts]);
  const views = <div role="group" aria-label={t('historyViews')} className="glass flex gap-inline rounded-card p-inline">
      <Chip pressed={view === 'workouts'} onClick={() => setView('workouts')}>{t('workouts')}</Chip>
      <Chip pressed={view === 'exercises'} onClick={() => setView('exercises')}>{t('exercises')}</Chip>
    </div>;
  return <main className={v3 ? 'mx-auto max-w-lg space-y-stack px-page-x pt-card pb-24' : 'mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32'}>
    {v3 ? <header className="flex items-center gap-stack"><Link href="/player/progress" aria-label={v3t('back')} className="flex size-12 items-center justify-center rounded-full bg-surface-raised"><ChevronRight size={20} aria-hidden className="ltr:rotate-180" /></Link><h1 className="text-h font-black">{v3t('title')}</h1></header> : <><Link href="/player/progress" className="inline-flex min-h-12 items-center text-lime">{t('back')}</Link><h1 className="text-2xl font-extrabold">{t('historyTitle')}</h1></>}
    {v3 && today && !history.loading && <HistoryCalendar today={today} trained={history.workouts.map(row => row.training_date)} snapshot={history.error ? undefined : snapshot} />}
    {!v3 && views}
    {history.error && <ErrorState message={t('historyError')} retryLabel={t('tryAgain')} onRetry={history.retry} />}
    {history.loading ? <LoadingState /> : !history.workouts.length ?
      <EmptyState icon={Dumbbell} title={t('historyEmpty')} body={t('goHomeToSeeYourCurrentWorkout')} action={{ label: t('backToHome'), href: '/player' }} /> : <>
        {view === 'exercises' && <>
          <label className="block space-y-inline"><span>{t('chooseExercise')}</span>
            <select className="glass min-h-12 w-full rounded-control px-stack" value={active} onChange={event => { setSelected(event.target.value); setLimit(20); }}>
              {!exercises.includes(active) && <option value={active}>{t('unknownExercise')}</option>}
              {exercises.map(id => {
                const name = history.names.find(row => row.id === id);
                return <option key={id} value={id}>{name ? exerciseName(name, locale) : t('unknownExercise')}</option>;
              })}
            </select>
          </label>
          {best && <section className="glass-strong space-y-inline rounded-card p-card"><h2 className="font-bold">{t('bestSet')}</h2><HistorySets sets={[best]} /></section>}
          {!workouts.length && <EmptyState icon={Dumbbell} title={t('noExerciseHistory')} body={t('goHomeToSeeYourCurrentWorkout')} action={{ label: t('backToHome'), href: '/player' }} />}
        </>}
        <ol aria-label={v3t('sessions')} className="space-y-inline">{workouts.slice(0, limit).map(workout => <li key={workout.id}><HistoryWorkoutRow workout={workout} names={history.names} v3={v3} hasPr={records.has(workout.id)}
          title={history.days.find(day => day.id === workout.program_day_id)?.title || t('unknownDay')}
          exerciseId={view === 'exercises' ? active : undefined} /></li>)}</ol>
        {(workouts.length > limit || (view === 'workouts' && history.hasMore)) &&
          <Button variant="secondary" className="w-full" onClick={() => setLimit(value => value + 20)}>{t('moreHistory')}</Button>}
      </>}
    {v3 && views}
  </main>;
}
