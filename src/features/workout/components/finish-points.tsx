'use client';

import { useCallback, useEffect, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { MEDAL_RANKS, medalRank, nextMedalRank, legendStars, ranksMessages } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { Medal } from '@/ui/medal';
import { ProgressBar } from '@/ui/progress-bar';
import { Button } from '@/ui/button';
import { loadWorkoutPoints } from '../data/load-workout-points';
import type { WorkoutPoints } from '../data/load-workout-points';
import { Medal as MedalIcon } from 'lucide-react';

export function FinishPoints({ sessionId, expected = false, expectedPrs = 0, initial, v4 = false }: {
  sessionId: string; expected?: boolean; expectedPrs?: number; initial?: WorkoutPoints; v4?: boolean;
}) {
  const t = useT(ranksMessages);
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const queued = useLiveQuery(useCallback(() => localDb().outbox.count(), []));
  useEffect(() => {
    if (initial) return;
    let active = true;
    const read = () => {
      if (navigator.onLine === false) return;
      void loadWorkoutPoints(sessionId).then(result => { if (active) { setData(result); setError(false); } })
        .catch(() => { if (active) setError(true); });
    };
    read();
    window.addEventListener('online', read);
    return () => { active = false; window.removeEventListener('online', read); };
  }, [sessionId, queued, attempt, initial]);
  const rows = data?.rows ?? [];
  const counted = rows.filter(row => row.status === 'counted');
  const pending = rows.some(row => row.status === 'pending');
  const total = counted.reduce((sum, row) => sum + row.points, 0);
  const missingPrs = rows.some(row => row.kind === 'workout' && row.status === 'rejected') || (data && queued === 0)
    ? 0 : Math.max(0, expectedPrs - rows.filter(row => row.kind === 'pr').length);
  const lifetime = data?.points.lifetime;
  const rank = lifetime === undefined ? undefined : medalRank(lifetime);
  const index = MEDAL_RANKS.findIndex(entry => entry.rank === rank);
  const next = lifetime === undefined ? undefined : nextMedalRank(lifetime);
  const threshold = rank === 'legend' && lifetime !== undefined ? 900 + legendStars(lifetime) * 300 : MEDAL_RANKS[index]?.threshold ?? 0;
  return <section className={v4 ? 'glass space-y-stack rounded-card p-stack' : 'glass-strong space-y-stack rounded-card p-card'}>
    {v4 ? <div className="flex items-center gap-stack">
      <MedalIcon aria-hidden className="size-6 shrink-0 text-lime" />
      <div><p className="text-sm font-bold">{counted.length ? t('points', { n: `+${formatNumber(total, locale)}` }, total) :
        t(pending ? 'pendingAward' : rows.length ? 'rejected' : 'pendingPoints')}</p>
        {next && <p className="text-micro text-muted">{t('workoutNext', { n: formatNumber(next.needed, locale), tier: t(next.rank) }, next.needed)}</p>}
      </div>
    </div> : <p className={`text-center font-display font-extrabold ${counted.length ? 'text-stat-wide text-lime' : 'text-sm text-muted'}`}>{counted.length ? `+${formatNumber(total, locale)}` : t(pending ? 'pendingAward' : rows.length ? 'rejected' : 'pendingPoints')}</p>}
    {rows.map(row => <div key={row.id} className="flex items-center justify-between gap-inline text-sm">
      <span>{t(row.kind)}</span><span className={row.status === 'rejected' ? 'text-muted' : ''}>
        <span className={row.status === 'rejected' ? 'line-through' : ''}>+{formatNumber(row.points, locale)}</span>
        {row.status !== 'counted' && <> · {t(row.status === 'pending' ? 'pendingAward' : 'rejected')}</>}</span>
    </div>)}
    {!rows.length && expected && <p className="text-sm text-muted">{t('workout')} +{formatNumber(3, locale)} · {t('pendingPoints')}</p>}
    {Array.from({ length: missingPrs }, (_, index) => <p key={index} className="text-sm text-muted">
      {t('pr')} +{formatNumber(1, locale)} · {t('pendingPoints')}
    </p>)}
    {rank && lifetime !== undefined && next && <div className="flex items-center gap-stack">
      <Medal rank={index as 0 | 1 | 2 | 3 | 4 | 5 | 6} label={t(rank)} />
      <div className="flex-1 space-y-inline"><b>{t(rank)}</b>
        <ProgressBar value={lifetime - threshold} max={lifetime + next.needed - threshold} aria-label={t('workoutNext', { n: formatNumber(next.needed, locale), tier: t(next.rank) }, next.needed)} />
      </div>
    </div>}
    {data?.points.month_position && data.points.month_position <= 3 && <p className="text-sm">{t('crownFinish', { n: formatNumber(data.points.month_position, locale) })}</p>}
    {error && <div role="alert"><p className="text-sm text-muted">{t('error')}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{t('retry')}</Button></div>}
  </section>;
}
