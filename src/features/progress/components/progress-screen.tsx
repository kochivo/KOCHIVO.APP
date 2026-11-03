'use client';

import { useCallback, useEffect, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { signedMediaUrl } from '@/core/storage';
import { supabaseBrowser } from '@/core/supabase/browser';
import { localDate } from '@/lib/dates';
import { Button, Chip, ErrorState, LoadingState } from '@/ui';
import { listCheckIns } from '../data/checkins';
import type { CheckIn } from '../data/checkins';
import { readStrength } from '../data/strength';
import { mainLifts, topSets, trendDelta } from '../trends';
import type { TrendPoint } from '../trends';
import { weekStart } from '../week';
import { CheckinSheet } from './checkin-sheet';
import { LineChart } from './line-chart';

function deltaLabel(points: TrendPoint[], unit: string) {
  const delta = trendDelta(points);
  return delta === null ? 'لسه مفيش ٤ أسابيع للمقارنة' : `${delta < 0 ? '−' : '+'}${Math.abs(delta).toFixed(1)} ${unit} في 4 أسابيع`;
}

export function ProgressScreen() {
  const [today, setToday] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [localError, setLocalError] = useState(false);
  const [checkins, setCheckins] = useState<CheckIn[]>();
  const [checkinError, setCheckinError] = useState(false);
  const [selected, setSelected] = useState('');
  const [sheet, setSheet] = useState(false);
  const [photos, setPhotos] = useState<{ rows: CheckIn[]; before: string; after: string }>();
  const [photoError, setPhotoError] = useState<CheckIn[]>();
  const [photoRetry, setPhotoRetry] = useState(0);
  const onLocalError = useCallback(() => setLocalError(true), []);
  const query = useCallback(async () => {
    const snapshot = await localDb().program_snapshot.get('active');
    return readStrength(snapshot ?? null);
  }, []);
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
        const rows = await listCheckIns(supabaseBrowser());
        if (!cancelled) setCheckins(rows);
      } catch { if (!cancelled) setCheckinError(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, [retryKey]);
  useEffect(() => {
    let cancelled = false;
    // The check-in sheet only sends photos when the front one is set, so index 0 is the front.
    const fronts = checkins?.filter((row) => row.photo_paths.length > 0) ?? [];
    const first = fronts.at(-1)?.photo_paths[0];
    const last = fronts[0]?.photo_paths[0];
    if (!first || !last) return;
    async function load(first: string, last: string, rows: CheckIn[]) {
      try {
        const client = supabaseBrowser();
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
    { key: 'body_weight_kg', label: 'الوزن', unit: 'كجم' },
    { key: 'waist_cm', label: 'محيط الوسط', unit: 'سم' },
  ] as const;
  const hasFronts = checkins?.some((row) => row.photo_paths.length > 0);
  return <main className="mx-auto max-w-lg space-y-4 px-5 pt-6 pb-32">
    <header><h1 className="text-2xl font-extrabold">PROGRESS · تطورك</h1></header>
    {localError ? <ErrorState message="مش قادرين نحمّل تمارينك" retryLabel="جرّب تاني" onRetry={() => {
      setLocalError(false); setRetryKey((value) => value + 1);
    }} /> : !strength ? <LoadingState /> : !lifts.length ?
      <p className="glass rounded-card p-6 text-muted">سجّل أول تمرين وهتشوف تطورك هنا</p> : <>
        <div className="glass flex flex-wrap gap-2 rounded-control p-2" aria-label="التمارين الأساسية">
          {lifts.map((lift, index) => <Chip key={lift} pressed={lift === active} onClick={() => setSelected(lift)}>{strength.names[lift] || `تمرين ${index + 1}`}</Chip>)}
        </div>
        <section className="glass-strong space-y-2 rounded-card p-5">
          <h2 className="text-sm text-muted">أعلى وزن</h2>
          {top.length > 0 && <p className="text-5xl font-extrabold">{top.at(-1)?.value} <span className="text-sm text-muted">كجم</span></p>}
          <LineChart points={top} title="تطور أعلى وزن" unit="كجم" />
        </section>
      </>}
    {checkinError ? <ErrorState message="مش قادرين نحمّل تحديثاتك. راجع النت" retryLabel="جرّب تاني" onRetry={() => setRetryKey((value) => value + 1)} /> : !checkins ? <LoadingState /> : <>
      {!checkins.length && <p className="glass rounded-card p-6 text-muted">أول تحديث هيبقى نقطة البداية</p>}
      <div className="grid grid-cols-2 gap-3">
        {measures.map(({ key, label, unit }) => {
          const points = checkins.flatMap((row) => row[key] === null ? [] : [{ date: row.week_start, value: row[key] }]).reverse();
          return <section key={key} className="glass-strong space-y-2 rounded-card p-4">
            <h2 className="text-sm text-muted">{label}</h2>
            <p className="text-2xl font-extrabold">{points.at(-1)?.value ?? '—'} <span className="text-sm text-muted">{unit}</span></p>
            <p className="text-xs text-muted">{deltaLabel(points, unit)}</p>
            <LineChart points={points} title={`تطور ${label}`} unit={unit} />
          </section>;
        })}
      </div>
      <section className="glass space-y-3 rounded-card p-4">
        <h2 className="font-bold">قبل وبعد</h2>
        {photoError === checkins ? <ErrorState message="مش قادرين نعرض الصور" retryLabel="جرّب تاني" onRetry={() => {
          setPhotoError(undefined); setPhotos(undefined); setPhotoRetry((value) => value + 1);
        }} /> : photos?.rows === checkins ?
          <div className="grid grid-cols-2 gap-2">{([
            ['قبل', photos.before], ['بعد', photos.after],
          ] as const).map(([label, url]) => <figure key={label}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Signed private URLs must bypass the image optimizer cache. */}
            <img src={url} alt={`صورة ${label} من قدام`} referrerPolicy="no-referrer" className="aspect-[3/4] w-full rounded-control object-cover" onError={() => setPhotoError(checkins)} />
            <figcaption className="pt-2 text-center text-sm text-muted">{label}</figcaption>
          </figure>)}</div> : hasFronts ? <LoadingState /> : <p className="text-sm text-muted">صور المقارنة لسه مش متاحة</p>}
      </section>
    </>}
    {sent ? <p className="min-h-12 py-3 text-center text-muted">اتبعت ✓</p> : !sheet &&
      <Button size="lg" className="w-full" disabled={!today || (!checkins && !checkinError)} onClick={() => setSheet(true)}>ابعت تحديث الأسبوع</Button>}
    {(checkins || checkinError) && <CheckinSheet latest={latest} open={sheet} onClose={() => setSheet(false)} onSent={() => {
      setSheet(false); setRetryKey((value) => value + 1);
    }} />}
  </main>;
}
