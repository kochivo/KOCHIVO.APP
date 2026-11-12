'use client';
import { useTimezone } from '@/core/timezone/client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CalendarCheck, Dumbbell, Scale } from 'lucide-react';
import { localDb, useLiveQuery } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { formatNumber } from '@/lib/format';
import { localDate } from '@/lib/dates';
import { Button, Chip, EmptyState, ErrorState, LoadingState } from '@/ui';
import { listCheckIns } from '../data/checkins';
import type { CheckIn } from '../data/checkins';
import { readStrength } from '../data/strength';
import { mainLifts, topSets, trendDelta } from '../trends';
import type { TrendPoint } from '../trends';
import { weekStart } from '../week';
import { PlayerGallery } from './player-gallery';
import { BodyScansLoader } from '@/features/body-scans';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { messages as v6Messages } from '../v6-messages';
const WeightOverview = dynamic(() => import('./weight-overview').then(module => module.WeightOverview), { ssr: false });
const RankOverview = dynamic(() => import('./rank-overview').then(module => module.RankOverview), { ssr: false });
const PlayerAssessments = dynamic(() => import('@/features/player-shell').then(module => module.PlayerAssessments), { ssr: false });
const CheckinSheet = dynamic(() => import('./checkin-sheet').then(module => module.CheckinSheet), { ssr: false });
const CheckinHistory = dynamic(() => import('./checkin-history').then(module => module.CheckinHistory), { ssr: false, loading: () => <LoadingState variant="list" /> });
const LineChart = dynamic(() => import('./line-chart').then(module => module.LineChart), {
  ssr: false, loading: () => <div aria-hidden className="aspect-[350/155] w-full" />,
});

export function ProgressScreen({ analytics }: { analytics?: ReactNode }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled();
  const locale = useLocale();
  function deltaLabel(points: TrendPoint[], unit: string) {
    const delta = trendDelta(points);
    return delta === null ? t('youNeed4WeeksToCompare') : t('fourWeekDelta', { value0: delta < 0 ? '−' : '+', value1: formatNumber(Number(Math.abs(delta).toFixed(1)), locale), value2: unit });
  }

  const [today, setToday] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [localError, setLocalError] = useState(false);
  const [checkins, setCheckins] = useState<CheckIn[]>();
  const [checkinError, setCheckinError] = useState(false);
  const [selected, setSelected] = useState('');
  const [sheet, setSheet] = useState(false);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const onLocalError = useCallback(() => setLocalError(true), []);
  const query = useCallback(async () => {
    const snapshot = await localDb().program_snapshot.get('active');
    return readStrength(snapshot ?? null, locale);
  }, [locale]);
  const strength = useLiveQuery(query, onLocalError, retryKey);
  useEffect(() => {
    const update = () => setToday(localDate(new Date(), timezone));
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [timezone]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setCheckinError(false);
      try {
        const rows = await listCheckIns(await loadSupabaseBrowser(), t);
        if (!cancelled) setCheckins(rows);
      } catch { if (!cancelled) setCheckinError(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, [retryKey, t]);
  const lifts = mainLifts(strength?.sets ?? []);
  const active = lifts.includes(selected) ? selected : lifts[0] ?? '';
  const top = topSets(strength?.sets ?? [], active);
  const latest = checkins?.[0];
  const sent = today && checkins?.some((row) => row.week_start === weekStart(today));
  const measures = [
    { key: 'body_weight_kg', label: t('weight'), unit: t('kg') },
    { key: 'waist_cm', label: t('waist'), unit: t('cm') },
  ] as const;
  const bodyFat = checkins?.flatMap(row => row.body_fat_pct == null ? [] : [{ date: row.week_start, value: row.body_fat_pct }]) ?? [];
  const checkinAction = sent ? { label: t('messageCoach'), href: '/player/captain' } :
    { label: t('sendWeeklyCheckin'), onClick: () => { setSheetLoaded(true); setSheet(true); } };
  return <main className="mx-auto max-w-lg space-y-4 px-5 pt-6 pb-32">
    <header><h1 className="text-2xl font-extrabold">{v6 ? v6t('title') : t('yourProgress')}</h1></header>
    {v6 && <><WeightOverview checkins={checkins} checkinError={checkinError} onRetry={() => setRetryKey(value => value + 1)} /><PlayerAssessments />{ranksEnabled() && <RankOverview />}</>}
    <Link href="/player/history" className="glass flex min-h-12 items-center gap-3 rounded-card p-5 font-bold">
      <Dumbbell aria-hidden className="text-lime" />{v6 ? v6t('history') : t('workoutHistory')}
    </Link>
    {localError ? <ErrorState message={t('couldntLoadYourWorkouts')} retryLabel={t('tryAgain')} onRetry={() => {
      setLocalError(false); setRetryKey((value) => value + 1);
    }} /> : !strength ? <LoadingState /> : !lifts.length ?
      <EmptyState icon={Dumbbell} title={t('workoutsTitle')} body={t('logYourFirstWorkoutToSeeYour')} action={{ label: t('firstWorkout'), href: '/player' }} /> : <>
        <div className="glass flex flex-wrap gap-2 rounded-control p-2" aria-label={t('mainLifts')}>
          {lifts.map((lift, index) => <Chip key={lift} pressed={lift === active} onClick={() => setSelected(lift)}>{strength.names[lift] || t('exerciseNumber', { value0: formatNumber(index + 1, locale) })}</Chip>)}
        </div>
        <section className="glass-strong space-y-2 rounded-card p-5">
          <h2 className="text-sm text-muted">{t('topWeight')}</h2>
          {top.length > 0 && <p className="text-5xl font-extrabold">{formatNumber(top.at(-1)?.value ?? 0, locale)} <span className="text-sm text-muted">{t('kg')}</span></p>}
          {top.length ? <LineChart points={top} title={t('topWeightTrend')} unit={t('kg')} /> : <EmptyState icon={Dumbbell} title={t('noMeasurementsYet')} body={t('logYourFirstWorkoutToSeeYour')} action={{ label: t('firstWorkout'), href: '/player' }} />}
        </section>
      </>}
    {analytics}
    <BodyScansLoader />
    {checkinError ? <ErrorState message={t('couldntLoadCheckinsCheckYourConnection')} retryLabel={t('tryAgain')} onRetry={() => setRetryKey((value) => value + 1)} /> : !checkins ? <LoadingState variant="cards" /> : <>
      {!checkins.length && <EmptyState icon={CalendarCheck} title={t('firstCheckin')} body={t('yourFirstCheckinIsYourStartingPoint')} action={{ label: t('sendWeeklyCheckin'), onClick: () => { setSheetLoaded(true); setSheet(true); } }} />}
      {checkins.length > 0 && <><div className="grid grid-cols-2 gap-3">
        {measures.map(({ key, label, unit }) => {
          const points = checkins.flatMap((row) => row[key] === null ? [] : [{ date: row.week_start, value: row[key] }]).reverse();
          return <section key={key} className="glass-strong space-y-2 rounded-card p-4">
            <h2 className="text-sm text-muted">{label}</h2>
            <p className="text-2xl font-extrabold">{points.length ? formatNumber(points.at(-1)?.value ?? 0, locale) : '—'} <span className="text-sm text-muted">{unit}</span></p>
            <p className="text-xs text-muted">{deltaLabel(points, unit)}</p>
            {points.length || (key === 'body_weight_kg' && bodyFat.length) ? <LineChart points={points} bodyFat={key === 'body_weight_kg' ? bodyFat : undefined} title={t('measureTrend', { value0: label })} unit={unit} /> : <EmptyState icon={Scale} title={t('noMeasurementsYet')} body={t('yourFirstCheckinIsYourStartingPoint')} action={checkinAction} />}
          </section>;
        })}
      </div>
      <PlayerGallery checkins={checkins} /></>}
    </>}
    {sent && <p role="status" className="min-h-12 py-3 text-center text-muted">{t('sent')}</p>}
    {checkins && checkins.length > 0 && <CheckinHistory checkins={checkins} />}
    {(checkins?.length !== 0 || checkinError) && <Button variant={v6 ? 'secondary' : 'primary'} size="lg" className="w-full" aria-disabled={Boolean(sent)} disabled={!today || (!checkins && !checkinError)} onClick={() => { if (!sent) { setSheetLoaded(true); setSheet(true); } }}>{t('sendWeeklyCheckin')}</Button>}
    {sheetLoaded && (checkins || checkinError) && <CheckinSheet latest={latest} open={sheet} onClose={() => setSheet(false)} onSent={() => {
      setSheet(false); setRetryKey((value) => value + 1);
    }} />}
  </main>;
}
