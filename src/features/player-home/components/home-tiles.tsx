'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { localDb, stableId, useLiveQuery } from '@/core/offline';
import { useMealLogs, useNutritionSnapshot } from '@/features/nutrition';
import { waterGoalMl } from '@/features/readiness';
import { ErrorState, LoadingState, ProgressBar } from '@/ui';
import { formatNumber } from '@/lib/format';
import { homeTiles } from '../v6-summary';
import { addWater } from '../data/add-water';
import { messages } from '../v6-messages';

export function HomeTiles({ today, playerId }: { today: string; playerId?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const timezone = useTimezone();
  const nutrition = useNutritionSnapshot();
  const logs = useMealLogs(today, nutrition.onError, nutrition.retryKey);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const onError = useCallback(() => setError(true), []);
  const read = useCallback(async () => playerId && today
    ? (await localDb().daily_checks.get(await stableId('daily_check', playerId, today))) ?? null : null, [playerId, today]);
  const row = useLiveQuery(read, onError, revision);
  const save = async () => {
    if (!playerId) return;
    try { await addWater(localDb(), playerId, Date.now(), timezone); setError(false); }
    catch { setError(true); }
  };
  if (nutrition.status === 'error' || error) return <ErrorState message={t('saveFailed')} retryLabel={t('retry')}
    onRetry={() => { setError(false); setRevision(value => value + 1); nutrition.retry(); }} />;
  if (nutrition.status === 'loading' || !logs || row === undefined) return <LoadingState variant="detail" />;
  const tiles = homeTiles(nutrition.snapshot?.meals ?? [], logs, today, row?.deleted_at ? 0 : row?.water_ml ?? 0, waterGoalMl());
  return <div className="grid grid-cols-2 gap-3">
    <Link href="/player/nutrition" className="glass min-w-0 space-y-3 rounded-card border border-line-soft p-4">
      <h2 className="text-xs text-muted">{t('food')}</h2>
      <p className="font-display text-[28px] font-extrabold tabular-nums">{formatNumber(tiles.mealsDone, locale)} <small className="text-xs font-normal text-faint">{t('meals', { total: formatNumber(tiles.mealsTotal, locale) })}</small></p>
      <ProgressBar value={tiles.mealsDone} max={tiles.mealsTotal || 1} aria-label={t('food')} />
    </Link>
    <button type="button" disabled={!playerId || (row?.water_ml ?? 0) >= 10000} onClick={() => void save()} aria-label={t('addWater')}
      className="glass min-h-12 min-w-0 space-y-3 rounded-card border border-line-soft p-4 text-start">
      <span className="block text-xs text-muted">{t('water')}</span>
      <span className="block font-display text-[28px] font-extrabold tabular-nums">{formatNumber(tiles.waterLitres, locale)} <small className="text-xs font-normal text-faint">{t('litres', { goal: formatNumber(tiles.goalLitres, locale) })}</small></span>
      <ProgressBar value={tiles.waterLitres} max={tiles.goalLitres} aria-label={t('water')} />
    </button>
  </div>;
}
