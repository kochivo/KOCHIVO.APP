'use client';

import { useCallback, useState } from 'react';
import { Trophy } from 'lucide-react';
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

export function FinishHero({ sessionId, workout }: { sessionId: string; workout?: WorkoutPointsInput }) {
  const t = useT(messages);
  const wt = useT(workoutMessages);
  const locale = useLocale();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const read = useCallback(async () => {
    const db = localDb();
    const [session, rows, plan] = await Promise.all([db.workout_sessions.get(sessionId), db.set_logs.toArray(), db.program_snapshot.get('active')]);
    if (!session?.completed_at) throw new Error('Completed session unavailable');
    return { ...finishSummary(rows, sessionId), day: plan?.days.find(day => day.id === session.program_day_id)?.title,
      minutes: Math.max(0, Math.round((Date.parse(session.completed_at) - Date.parse(session.started_at)) / 60000)) };
  }, [sessionId]);
  const summary = useLiveQuery(read, useCallback(() => setFailed(true), []), attempt);
  const preview = workout && ranksEnabled() ? previewWorkoutPoints(workout) : undefined;
  const number = (value: number) => formatNumber(value, locale);
  return <div className="space-y-4 text-center">
    <Trophy aria-hidden className="mx-auto mt-5 size-11 text-lime" />
    <h1 className="font-display text-[26px] font-semibold">{summary?.day ? t('complete', { day: starterText(summary.day, locale) }) : t('title')}</h1>
    {summary ? <><p className="text-[12.5px] text-muted">{t('stats', { minutes: number(summary.minutes), sets: number(summary.sets), volume: number(summary.volume) })}</p>
      <div className="grid grid-cols-2 gap-3 text-start">
        {preview?.counted && <div className="glass-strong rounded-card border border-line-soft p-4"><p className="text-xs text-faint">{t('points')}</p><p className="mt-2 font-display text-[22px] font-extrabold text-lime">+{number(preview.points)}</p></div>}
        <div className="glass-strong rounded-card border border-line-soft p-4"><p className="text-xs text-faint">{t('records')}</p><p className="mt-2 font-display text-[22px] font-extrabold">{number(summary.records)}</p></div>
      </div></> : failed ? <ErrorState message={wt('couldntReadTheWorkoutOnYourPhone')} retryLabel={wt('tryAgain')}
        onRetry={() => { setFailed(false); setAttempt(value => value + 1); }} /> : <LoadingState variant="detail" />}
  </div>;
}
