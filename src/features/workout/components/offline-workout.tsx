'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { useLocalUser } from '@/core/offline/use-local-user';
import { SyncRunner } from '@/features/player-shell';
import { useT } from '@/core/i18n/client';
import { Button, ErrorState, LoadingState } from '@/ui';
import { OfflineMessage } from '@/ui/offline-message';
import { messages } from '../messages';
import { offlineDays } from '../offline-days';
import { FocusScreen } from './focus-screen';

export function OfflineWorkout() {
  const t = useT(messages);
  const owner = useLocalUser();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dayId, setDayId] = useState<string | null>(null);
  const picker = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<string | null>(null);
  const onReadError = useCallback(() => setFailed(true), []);
  const read = useCallback(async () => {
    if (owner !== 'ready') return [];
    const db = localDb();
    return offlineDays(await db.program_snapshot.get('active'), db.userId ?? null);
  }, [owner]);
  const days = useLiveQuery(read, onReadError, attempt);
  const selected = days?.find(day => day.id === dayId);
  const back = useCallback(() => {
    returnFocus.current = dayId;
    setDayId(null);
  }, [dayId]);
  useEffect(() => {
    if (selected || !returnFocus.current) return;
    const button = Array.from(picker.current?.querySelectorAll('button') ?? [])
      .find(item => item.dataset.dayId === returnFocus.current);
    (button ?? picker.current)?.focus();
    returnFocus.current = null;
  }, [selected]);

  return <>
    {owner === 'ready' && <SyncRunner />}
    <OfflineMessage verifiedWorkoutCopy={owner === 'ready' && !failed && days?.length ? t('cachedWorkoutsAvailable') : null} />
    {owner === 'loading' || (days === undefined && !failed) ? <LoadingState /> :
      failed ? <ErrorState message={t('couldntReadTheWorkoutOnYourPhone')} retryLabel={t('tryAgain')}
        onRetry={() => { setFailed(false); setAttempt(value => value + 1); }} /> :
      selected ? <FocusScreen dayId={selected.id} playerId={localDb().userId ?? undefined} onBack={back} /> :
      days?.length ? <div ref={picker} tabIndex={-1} className="space-y-stack" role="group" aria-label={t('cachedWorkouts')}>
        {days.map(day => <Button key={day.id} data-day-id={day.id} variant="secondary" onClick={() => setDayId(day.id)}>{day.title}</Button>)}
      </div> : <p>{t('noCachedWorkouts')}</p>}
  </>;
}
