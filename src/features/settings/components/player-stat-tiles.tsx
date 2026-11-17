'use client';
import { useCallback, useState } from 'react';
import { StatStrip } from '@/ui/stat-strip';
import { useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { localDb, useLiveQuery } from '@/core/offline';
import { useResource } from '@/core/resource';
import { ranksMessages } from '@/features/ranks';
import { ErrorState, LoadingState } from '@/ui';
import { localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import type { ProgramSnapshot } from '@/core/offline';
import { accountStats } from '../player-account-stats';
import type { AccountSession } from '../player-account-stats';
import { loadPlayerAccountSummary } from '../data/player-account-summary';
import { messages } from '../player-messages';

export function PlayerStatTiles({ playerId, snapshot }: { playerId: string; snapshot?: ProgramSnapshot | null }) {
  const t = useT(messages);
  const rankT = useT(ranksMessages);
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  const loader = useCallback(() => loadPlayerAccountSummary(playerId), [playerId]);
  const result = useResource(`player-account-summary:${playerId}`, loader);
  const [localError, setLocalError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onError = useCallback(() => setLocalError(true), []);
  const read = useCallback(async (): Promise<AccountSession[]> => localDb().userId === playerId ? localDb().workout_sessions.toArray() : [], [playerId]);
  const local = useLiveQuery(read, onError, attempt);
  if (result.status === 'error' || localError) return <ErrorState message={t('summaryError')} retryLabel={t('retry')} onRetry={() => {
    setLocalError(false); setAttempt(value => value + 1); void result.retry();
  }} />;
  if (!result.data || !local || !now) return <LoadingState variant="detail" />;
  const stats = accountStats({ remote: result.data.sessions, local, today: localDate(now, timezone), snapshot });
  return <StatStrip className="max-sm:grid-cols-3! [&>div]:px-stack [&_p>span]:text-title" items={[
    { label: t('sessions'), value: stats.total },
    { label: t('streak'), value: stats.streak },
    { label: t('rank'), value: rankT(result.data.tier) },
  ]} />;
}
