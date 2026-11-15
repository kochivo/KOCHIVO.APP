'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { localDb, useLiveQuery } from '@/core/offline';
import { previewWorkoutPoints } from '@/features/ranks';
import type { WorkoutPointsInput } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { starterText } from '@/lib/starter-text';
import { finishSummary } from '../data/finish-summary';
import { messages } from '../finish-messages';
import { messages as workoutMessages } from '../messages';
import { ErrorState, LoadingState } from '@/ui';
import { exerciseName } from '@/lib/display-name';
import { FinishRecord } from './finish-record';
import { sessionRecords, formatVolume } from './workout-v3-model';

export function FinishHero({ sessionId, workout, extras = false }: { sessionId: string; workout?: WorkoutPointsInput; extras?: boolean }) {
  const t = useT(messages);
  const wt = useT(workoutMessages);
  const locale = useLocale();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [firstName, setFirstName] = useState<string>();
  useEffect(() => {
    if (extras || navigator.onLine === false) return;
    let active = true;
    void import('@/features/player-home').then(module => module.fetchPlayerIdentity())
      .then(identity => { if (active) setFirstName(identity.firstName); }).catch(() => undefined);
    return () => { active = false; };
  }, [extras]);
  const read = useCallback(async () => {
    const db = localDb();
    const [session, rows, plan] = await Promise.all([db.workout_sessions.get(sessionId), db.set_logs.toArray(), db.program_snapshot.get('active')]);
    if (!session?.completed_at) throw new Error('Completed session unavailable');
    const record = sessionRecords(rows, sessionId).sort((a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
    const exercises = plan?.days.flatMap(day => day.exercises) ?? [];
    const exercise = record && exercises.find(exercise => exercise.exercise_id === record.exercise_id);
    const alternative = record && exercises.flatMap(exercise => exercise.alternative_exercises ?? []).find(exercise => exercise.id === record.exercise_id);
    return { ...finishSummary(rows, sessionId), record,
      recordName: exercise ? exerciseName(exercise, locale) : alternative ? exerciseName(alternative, locale) : wt('unknownExercise'),
      day: plan?.days.find(day => day.id === session.program_day_id)?.title,
      minutes: Math.max(0, Math.round((Date.parse(session.completed_at) - Date.parse(session.started_at)) / 60000)) };
  }, [sessionId, locale, wt]);
  const summary = useLiveQuery(read, useCallback(() => setFailed(true), []), attempt);
  const preview = workout && ranksEnabled() ? previewWorkoutPoints(workout) : undefined;
  const volume = summary && formatVolume(summary.volume, locale);
  const number = (value: number) => formatNumber(value, locale);
  if (extras) return summary ? <details className="rounded-[22px] border border-line-soft bg-surface p-card">
    <summary className="min-h-12 cursor-pointer text-muted">{wt('v3Details')}</summary>
    <p className="mb-stack text-sm">{summary.day ? starterText(summary.day, locale) : t('title')}</p>
      <div className="grid grid-cols-2 gap-stack text-start">
        {preview?.counted && <div className="glass-strong rounded-card border border-line-soft p-card"><p className="text-xs text-faint">{t('points')}</p><p className="mt-inline font-display text-h font-extrabold text-lime">+{number(preview.points)}</p></div>}
        <div className="glass-strong rounded-card border border-line-soft p-card"><p className="text-xs text-faint">{t('records')}</p><p className="mt-inline font-display text-h font-extrabold">{number(summary.records)}</p></div>
      </div>
  </details> : null;
  // The skewed stripes and the edge-bleed gradient extend past the column; clip only sideways so they never add horizontal scroll.
  return <div className="relative flex flex-col gap-card-gap overflow-x-clip pt-[134px]">
    <div aria-hidden className="pointer-events-none absolute -top-24 start-[192px] h-[360px] w-[120px] -skew-x-[18deg] bg-lime" />
    <div aria-hidden className="pointer-events-none absolute -top-24 start-[150px] h-[360px] w-[26px] -skew-x-[18deg] bg-ivory" />
    <div aria-hidden className="pointer-events-none absolute -inset-x-[18px] -top-4 h-[300px] bg-gradient-to-b from-bg/0 from-20% to-bg to-85%" />
    <div className="relative flex flex-col gap-inline">
      <span className="text-sm font-bold text-lime">{wt('v3Done')}</span>
      <h1 style={{ fontFamily: 'inherit', fontWeight: 900 }} className="text-4xl leading-normal">{firstName ? wt('v3Congrats', { name: firstName }) : wt('v3CongratsFallback')}</h1>
    </div>
    {summary ? <>
      <div className="relative grid grid-cols-3 gap-inline">
        {[{ value: number(summary.minutes), label: wt('v3Minute') }, { value: number(summary.sets), label: wt('v3Sets') },
          { value: volume?.value, label: wt('v3Volume'), unit: volume && wt(volume.unit) }].map(stat =>
          <div key={stat.label} className="glass-strong flex flex-col gap-inline rounded-[20px] border border-line-soft p-stack">
            <span className="font-display text-2xl font-extrabold tabular-nums"><bdi>{stat.value}{stat.unit && <> <span className="text-row">{stat.unit}</span></>}</bdi></span>
            <span className="text-xs text-muted">{stat.label}</span>
          </div>)}
      </div>
      <div className="relative"><FinishRecord record={summary.record} name={summary.recordName} /></div>
    </> : failed ? <ErrorState message={wt('couldntReadTheWorkoutOnYourPhone')} retryLabel={wt('tryAgain')}
      onRetry={() => { setFailed(false); setAttempt(value => value + 1); }} /> : <LoadingState variant="detail" />}
  </div>;
}
