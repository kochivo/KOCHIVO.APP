'use client';
import { useTimezone } from '@/core/timezone/client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { readRemoteStrength, readStrength } from '../data/strength';
import type { StrengthLog } from '../data/strength';
import { mainLifts, topSets, trendDelta } from '../trends';
import type { TrendPoint } from '../trends';
import { canOpenCheckin, weekStart } from '../week';
import { PlayerGallery } from './player-gallery';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { ProgressV3 } from './progress-v3';
import { readRemoteSessionIds } from './progress-session-count';
import { buttonClass } from '@/ui/button';
import { ProgressRecords } from './progress-records';
import { messages as progressLayoutMessages } from '../player-v4/messages';
const BodyScansLoader = dynamic(() => import('@/features/body-scans').then(module => module.BodyScansLoader), { loading: () => <LoadingState variant="cards" /> });
const WeightOverview = dynamic(() => import('./weight-overview').then(module => module.WeightOverview), { ssr: false });
const RankOverview = dynamic(() => import('./rank-overview').then(module => module.RankOverview), { ssr: false });
const PlayerAssessments = dynamic(() => import('@/features/player-shell').then(module => module.PlayerAssessments), { ssr: false });
const CheckinSheet = dynamic(() => import('./checkin-sheet').then(module => module.CheckinSheet), { ssr: false });
const CheckinHistory = dynamic(() => import('./checkin-history').then(module => module.CheckinHistory), { ssr: false, loading: () => <LoadingState variant="list" /> });
const LineChart = dynamic(() => import('./line-chart').then(module => module.LineChart), {
  ssr: false, loading: () => <div aria-hidden className="aspect-[350/155] w-full" />,
});

export function ProgressScreen({ analytics, autoOpenCheckin }: { analytics?: ReactNode; autoOpenCheckin?: boolean }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const layout = useT(progressLayoutMessages);
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
  const [remoteSessionIds, setRemoteSessionIds] = useState<string[]>();
  const [strengthRetry, setStrengthRetry] = useState(0);
  const [remoteStrengthError, setRemoteStrengthError] = useState(false);
  const [sentWeek, setSentWeek] = useState('');
  const [remoteStrength, setRemoteStrength] = useState<StrengthLog[]>([]);
  const [countError, setCountError] = useState(false);
  const onCountError = useCallback(() => setCountError(true), []);
  const onLocalError = useCallback(() => setLocalError(true), []);
  const query = useCallback(async () => {
    const snapshot = await localDb().program_snapshot.get('active');
    return readStrength(snapshot ?? null, locale, remoteStrength);
  }, [locale, remoteStrength]);
  const strength = useLiveQuery(query, onLocalError, retryKey);
  const readCount = useCallback(async () => (await localDb().workout_sessions.toArray()).filter(row => row.completed_at).map(row => row.id), []);
  const localSessionIds = useLiveQuery(readCount, onCountError, retryKey);
  const sessionCount = Array.isArray(localSessionIds) ? new Set([...(remoteSessionIds ?? []), ...localSessionIds]).size : undefined;
  useEffect(() => {
    let cancelled = false;
    let request = 0;
    const load = async () => {
      const current = ++request;
      if (!navigator.onLine) { setRemoteStrengthError(true); return; }
      try {
        const rows = await readRemoteStrength();
        if (!cancelled && current === request) { setRemoteStrength(rows); setRemoteStrengthError(false); }
      } catch {
        if (!cancelled && current === request) setRemoteStrengthError(true);
      }
    };
    void load();
    window.addEventListener('online', load);
    return () => { cancelled = true; window.removeEventListener('online', load); };
  }, [strengthRetry]);
  useEffect(() => {
    if (!v6) return;
    let cancelled = false;
    const load = async () => {
      try {
        const ids = await readRemoteSessionIds();
        if (!cancelled) { setRemoteSessionIds(ids); setCountError(false); }
      } catch { if (!cancelled) setCountError(true); }
    };
    void load();
    window.addEventListener('online', load);
    return () => { cancelled = true; window.removeEventListener('online', load); };
  }, [v6, retryKey]);
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
  const week = today ? weekStart(today) : '';
  const sent = Boolean(week && (sentWeek === week || checkins?.some(row => row.week_start === week)));
  const eligible = canOpenCheckin(today, checkins, checkinError, sentWeek);
  function openCheckin() {
    if (!eligible) return;
    setSheetLoaded(true);
    setSheet(true);
  }
  // Deep link from Home (?checkin=1) opens the same sheet once it can open;
  // when this week is already sent, eligibility stays false and nothing opens.
  const openedCheckin = useRef(false);
  useEffect(() => {
    if (!autoOpenCheckin || openedCheckin.current || !eligible) return;
    openedCheckin.current = true;
    setSheetLoaded(true);
    setSheet(true);
  }, [autoOpenCheckin, eligible]);
  const partialStrength = remoteStrengthError && <div className="flex flex-wrap items-center gap-stack">
    <p role="status" className="flex-1 text-sm text-muted">{t('partialStrength')}</p>
    <Button variant="secondary" block={false} onClick={() => setStrengthRetry(value => value + 1)}>{t('tryAgain')}</Button>
  </div>;
  const measures = [
    { key: 'body_weight_kg', label: t('weight'), unit: t('kg') },
    { key: 'waist_cm', label: t('waist'), unit: t('cm') },
  ] as const;
  const bodyFat = checkins?.flatMap(row => row.body_fat_pct == null ? [] : [{ date: row.week_start, value: row.body_fat_pct }]) ?? [];
  const latestBodyFat = bodyFat[0];
  const checkinAction = sent ? { label: t('messageCoach'), href: '/player/captain' } : undefined;
  const retryCheckins = () => setRetryKey(value => value + 1);
  const checkinMeasurements = checkinError ? <ErrorState message={t('couldntLoadCheckinsCheckYourConnection')} retryLabel={t('tryAgain')} onRetry={() => setRetryKey((value) => value + 1)} /> : !checkins ? <LoadingState variant="cards" /> : <>
      {!v6 && !checkins.length && <EmptyState icon={CalendarCheck} title={t('firstCheckin')} body={t('yourFirstCheckinIsYourStartingPoint')} action={!v6 && eligible ? { label: t('sendWeeklyCheckin'), onClick: openCheckin } : undefined} />}
      {checkins.length > 0 && <><div className={v6 ? 'space-y-stack' : 'grid grid-cols-2 gap-stack'}>
        {measures.filter(measure => !v6 || measure.key !== 'body_weight_kg').map(({ key, label, unit }) => {
          const points = checkins.flatMap((row) => row[key] === null ? [] : [{ date: row.week_start, value: row[key] }]).reverse();
          return <section key={key} className="glass-strong space-y-inline rounded-card p-card">
            <h2 className="text-sm text-muted">{label}</h2>
            <p className="text-2xl font-extrabold">{points.length ? formatNumber(points.at(-1)?.value ?? 0, locale) : '—'} <span className="text-sm text-muted">{unit}</span></p>
            <p className="text-xs text-muted">{deltaLabel(points, unit)}</p>
            {(v6 ? points.length > 1 : points.length > 0) || (key === 'body_weight_kg' && bodyFat.length) ? <LineChart points={points} bodyFat={key === 'body_weight_kg' ? bodyFat : undefined} title={t('measureTrend', { value0: label })} unit={unit} /> : points.length ? null : <EmptyState icon={Scale} title={t('noMeasurementsYet')} body={t('yourFirstCheckinIsYourStartingPoint')} action={checkinAction} />}
          </section>;
        })}
      </div>
      {!v6 && <PlayerGallery checkins={checkins} />}</>}
    </>;
  return <main className={v6 ? 'mx-auto max-w-lg space-y-card-gap px-page-x pt-card' : 'mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32'}>
    {v6 ? <ProgressV3 today={today} checkins={checkins} strength={strength} count={sessionCount} checkinError={checkinError} strengthError={localError} retry={() => { setLocalError(false); setRetryKey(value => value + 1); }} partialStrength={partialStrength} logDisabled={!eligible} onLog={openCheckin} sent={sent}
      body={<>
        {checkins && !checkinError && <details className="glass rounded-card px-card pb-inline">
          <summary className="min-h-12 cursor-pointer content-center text-sm font-bold">{layout('measurements')}</summary>
          {checkins.length ? checkinMeasurements : <p className="text-sm text-muted">{t('noMeasurementsYet')}</p>}
          {latestBodyFat && <section className="space-y-inline py-stack">
            <h2 className="text-sm text-muted">{t('bodyFat')}</h2>
            <p className="font-display font-bold"><bdi>{formatNumber(latestBodyFat.value, locale)}%</bdi></p>
            {bodyFat.length > 1 && <LineChart points={[...bodyFat].reverse()} title={t('bodyFat')} unit="%" />}
          </section>}
        </details>}
        <details className="glass rounded-card px-card">
          <summary className="min-h-12 cursor-pointer content-center text-sm font-bold">{layout('scans')}</summary>
          <BodyScansLoader />
        </details>
        {checkins && !checkinError && <WeightOverview checkins={checkins} onRetry={retryCheckins} goalOnly />}
        {checkins && !checkinError && <ProgressRecords checkins={checkins} kind="photos" />}
      </>}
      training={<>{analytics && <div data-progress-section="muscles">{analytics}</div>}
        {countError && <ErrorState message={t('couldntLoadYourWorkouts')} retryLabel={t('tryAgain')} onRetry={() => setRetryKey(value => value + 1)} />}
        <Link href="/player/history" className={buttonClass({ variant: 'secondary', block: true, className: 'justify-start' })}><Dumbbell aria-hidden className="size-5" />{t('workoutHistory')}</Link>
      </>}
      records={<>{checkins && !checkinError && <ProgressRecords checkins={checkins} kind="history" />}
        <PlayerAssessments layout="link" />{ranksEnabled() && <RankOverview />}</>} /> : <header><h1 className="text-2xl font-extrabold">{t('yourProgress')}</h1></header>}
    {!v6 && <Link href="/player/history" className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center gap-stack p-card font-bold" })}>
      <Dumbbell aria-hidden className="text-lime" />{t('workoutHistory')}
    </Link>}
    {!v6 && partialStrength}
    {!v6 && (localError ? <ErrorState message={t('couldntLoadYourWorkouts')} retryLabel={t('tryAgain')} onRetry={() => {
      setLocalError(false); setRetryKey((value) => value + 1);
    }} /> : !strength ? <LoadingState /> : !lifts.length ?
      !remoteStrengthError && <EmptyState icon={Dumbbell} title={t('workoutsTitle')} body={t('logYourFirstWorkoutToSeeYour')} action={{ label: t('firstWorkout'), href: '/player' }} /> : <>
        <div className="glass flex flex-wrap gap-inline rounded-control p-inline" aria-label={t('mainLifts')}>
          {lifts.map((lift, index) => <Chip key={lift} pressed={lift === active} onClick={() => setSelected(lift)}>{strength.names[lift] || t('exerciseNumber', { value0: formatNumber(index + 1, locale) })}</Chip>)}
        </div>
        <section className="glass-strong space-y-inline rounded-card p-card">
          <h2 className="text-sm text-muted">{t('topWeight')}</h2>
          {top.length > 0 && <p className="text-5xl font-extrabold">{formatNumber(top.at(-1)?.value ?? 0, locale)} <span className="text-sm text-muted">{t('kg')}</span></p>}
          {top.length ? <LineChart points={top} title={t('topWeightTrend')} unit={t('kg')} /> : <EmptyState icon={Dumbbell} title={t('noMeasurementsYet')} body={t('logYourFirstWorkoutToSeeYour')} action={{ label: t('firstWorkout'), href: '/player' }} />}
        </section>
      </>)}
    {!v6 && <>{analytics}<BodyScansLoader />{checkinMeasurements}</>}
    {!v6 && sent && <p role="status" className="min-h-12 py-stack text-center text-muted">{t('sent')}</p>}
    {!v6 && checkins && checkins.length > 0 && <CheckinHistory checkins={checkins} />}
    {!v6 && checkins && checkins.length > 0 && <Button variant="primary" size="lg" className="w-full" disabled={!eligible} onClick={openCheckin}>{t('sendWeeklyCheckin')}</Button>}
    {sheetLoaded && (checkins || checkinError) && <CheckinSheet latest={latest} open={sheet} onClose={() => setSheet(false)} onSent={date => {
      setSentWeek(weekStart(date)); setSheet(false); setRetryKey((value) => value + 1);
    }} />}
  </main>;
}
