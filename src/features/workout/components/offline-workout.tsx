'use client';
import { useCallback, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { LocalUserBoundary, SyncRunner } from '@/features/player-shell';
import { useT } from '@/core/i18n/client';
import { Button, ErrorState, LoadingState } from '@/ui';
import { messages } from '../messages';
import { FocusScreen } from './focus-screen';

const readSnapshot = async () => {
  const db = localDb();
  const snapshot = await db.program_snapshot.get('active');
  return snapshot?.player_id === db.userId ? snapshot : null;
};

function CachedWorkout() {
  const t = useT(messages);
  const [failed, setFailed] = useState(false);
  const [dayId, setDayId] = useState<string | null>(null);
  const onReadError = useCallback(() => setFailed(true), []);
  const snapshot = useLiveQuery(readSnapshot, onReadError);
  if (failed) return <ErrorState message={t('couldntReadTheWorkoutOnYourPhone')} retryLabel={t('tryAgain')}
    onRetry={() => window.location.reload()} />;
  if (snapshot === undefined) return <LoadingState />;
  if (!snapshot) return <p>{t('thisWorkoutIsntInYourProgram')}</p>;
  if (dayId) return <FocusScreen dayId={dayId} playerId={snapshot.player_id} />;
  const days = snapshot.days.filter(day => !day.is_rest_day);
  return <div className="space-y-3">
    {days.length ? days.map(day => <Button key={day.id} variant="secondary" onClick={() => setDayId(day.id)}>{day.title}</Button>)
      : <p>{t('thisWorkoutIsntInYourProgram')}</p>}
  </div>;
}

export function OfflineWorkout() {
  return <LocalUserBoundary><SyncRunner /><CachedWorkout /></LocalUserBoundary>;
}
