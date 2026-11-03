'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CalendarCheck, Camera, Dumbbell, Scale } from 'lucide-react';
import { localDb, useLiveQuery } from '@/core/offline';
import { signedMediaUrl } from '@/core/storage';
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
const CheckinSheet = dynamic(() => import('./checkin-sheet').then(module => module.CheckinSheet), { ssr: false });
const LineChart = dynamic(() => import('./line-chart').then(module => module.LineChart), {
  ssr: false, loading: () => <div aria-hidden className="aspect-[350/155] w-full" />,
});

export function ProgressScreen() {
  const t = useT(messages);
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
  const [photos, setPhotos] = useState<{ rows: CheckIn[]; before: string; after: string }>();
  const [photoError, setPhotoError] = useState<CheckIn[]>();
  const [photoRetry, setPhotoRetry] = useState(0);
  const onLocalError = useCallback(() => setLocalError(true), []);
  const query = useCallback(async () => {
    const snapshot = await localDb().program_snapshot.get('active');
    return readStrength(snapshot ?? null, locale);
  }, [locale]);
  const strength = useLiveQuery(query, onLocalError, retryKey);
  useEffect(() => {
    const update = () => setToday(localDate(new Date()));
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
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
  useEffect(() => {
    let cancelled = false;
    // The check-in sheet only sends photos when the front one is set, so index 0 is the front.
    const fronts = checkins?.filter((row) => row.photo_paths.length > 0) ?? [];
    const first = fronts.at(-1)?.photo_paths[0];
    const last = fronts[0]?.photo_paths[0];
    if (!first || !last) return;
    async function load(first: string, last: string, rows: CheckIn[]) {
      try {
        const client = await loadSupabaseBrowser();
        const [before, after] = await Promise.all([
          signedMediaUrl(client, 'checkin-photos', first),
          signedMediaUrl(client, 'checkin-photos', last),
        ]);
        if (!cancelled) setPhotos({ rows, before, after });
      } catch { if (!cancelled) setPhotoError(rows); }
    }
    void load(first, last, checkins ?? []);
    return () => { cancelled = true; };
  }, [checkins, photoRetry]);
  const lifts = mainLifts(strength?.sets ?? []);
  const active = lifts.includes(selected) ? selected : lifts[0] ?? '';
  const top = topSets(strength?.sets ?? [], active);
  const latest = checkins?.[0];
  const sent = today && checkins?.some((row) => row.week_start === weekStart(today));
  const measures = [
    { key: 'body_weight_kg', label: t('weight'), unit: t('kg') },
    { key: 'waist_cm', label: t('waist'), unit: t('cm') },
  ] as const;
  const hasFronts = checkins?.some((row) => row.photo_paths.length > 0);
  const checkinAction = sent ? { label: t('messageCoach'), href: '/player/captain' } :
    { label: t('sendWeeklyCheckin'), onClick: () => { setSheetLoaded(true); setSheet(true); } };
  return <main className="mx-auto max-w-lg space-y-4 px-5 pt-6 pb-32">
    <header><h1 className="text-2xl font-extrabold">{t('yourProgress')}</h1></header>
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
    {checkinError ? <ErrorState message={t('couldntLoadCheckinsCheckYourConnection')} retryLabel={t('tryAgain')} onRetry={() => setRetryKey((value) => value + 1)} /> : !checkins ? <LoadingState variant="cards" /> : <>
      {!checkins.length && <EmptyState icon={CalendarCheck} title={t('firstCheckin')} body={t('yourFirstCheckinIsYourStartingPoint')} action={{ label: t('sendWeeklyCheckin'), onClick: () => { setSheetLoaded(true); setSheet(true); } }} />}
      {checkins.length > 0 && <><div className="grid grid-cols-2 gap-3">
        {measures.map(({ key, label, unit }) => {
          const points = checkins.flatMap((row) => row[key] === null ? [] : [{ date: row.week_start, value: row[key] }]).reverse();
          return <section key={key} className="glass-strong space-y-2 rounded-card p-4">
            <h2 className="text-sm text-muted">{label}</h2>
            <p className="text-2xl font-extrabold">{points.length ? formatNumber(points.at(-1)?.value ?? 0, locale) : '—'} <span className="text-sm text-muted">{unit}</span></p>
            <p className="text-xs text-muted">{deltaLabel(points, unit)}</p>
            {points.length ? <LineChart points={points} title={t('measureTrend', { value0: label })} unit={unit} /> : <EmptyState icon={Scale} title={t('noMeasurementsYet')} body={t('yourFirstCheckinIsYourStartingPoint')} action={checkinAction} />}
          </section>;
        })}
      </div>
      <section className="glass space-y-3 rounded-card p-4">
        <h2 className="font-bold">{t('beforeAndAfter')}</h2>
        {photoError === checkins ? <ErrorState message={t('couldntLoadPhotos')} retryLabel={t('tryAgain')} onRetry={() => {
          setPhotoError(undefined); setPhotos(undefined); setPhotoRetry((value) => value + 1);
        }} /> : photos?.rows === checkins ?
          <div className="grid grid-cols-2 gap-2">{([
            [t('before'), photos.before], [t('after'), photos.after],
          ] as const).map(([label, url]) => <figure key={label}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Signed private URLs must bypass the image optimizer cache. */}
            <img src={url} alt={t('frontPhoto', { value0: label })} loading="lazy" decoding="async" width={480} height={640} referrerPolicy="no-referrer" className="aspect-[3/4] w-full rounded-control object-cover" onError={() => setPhotoError(checkins)} />
            <figcaption className="pt-2 text-center text-sm text-muted">{label}</figcaption>
          </figure>)}</div> : hasFronts ? <LoadingState /> : <EmptyState icon={Camera} title={t('comparisonPhotosArentAvailableYet')} body={t('yourFirstCheckinIsYourStartingPoint')} action={checkinAction} />}
      </section></>}
    </>}
    {sent && <p role="status" className="min-h-12 py-3 text-center text-muted">{t('sent')}</p>}
    {(checkins?.length !== 0 || checkinError) && <Button size="lg" className="w-full" aria-disabled={Boolean(sent)} disabled={!today || (!checkins && !checkinError)} onClick={() => { if (!sent) { setSheetLoaded(true); setSheet(true); } }}>{t('sendWeeklyCheckin')}</Button>}
    {sheetLoaded && (checkins || checkinError) && <CheckinSheet latest={latest} open={sheet} onClose={() => setSheet(false)} onSent={() => {
      setSheet(false); setRetryKey((value) => value + 1);
    }} />}
  </main>;
}
