import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { Scale } from 'lucide-react';
import { EmptyState, GlassCard } from '@/ui';
import { formatNumber } from '@/lib/format';
import { LineChart, ProgressGallery, photoPose, progressMessages } from '@/features/progress';
import { weightPoints, weightSummary } from '../model';
import type { ProfileCheckIn } from '../types';

export async function ProgressTab({ checkIns, targetKg, playerId }: { checkIns: ProfileCheckIn[]; targetKg: number | null; playerId: string }) {
  const [t, locale] = await Promise.all([getT(messages), getLocale()]);
  const p = await getT(progressMessages);
  const points = weightPoints(checkIns);
  const summary = weightSummary(points, targetKg);
  const signed = (value: number) => `${value > 0 ? '+' : ''}${formatNumber(value, locale)} ${t('kg')}`;
  const bodyFat = checkIns.flatMap(row => row.bodyFatPct == null ? [] : [{ date: row.weekStart, value: row.bodyFatPct }]);
  const weeks = checkIns.map(row => ({ date: row.weekStart, weight: row.weightKg,
    photos: row.photos.map((url, index) => ({ url, pose: photoPose(row.photoPoses?.[index]) })) }));
  const action = { label: t('remindPlayer'), href: `/captain/players/${playerId}?tab=checkins#voice-recorder-${playerId}` };
  return (
    <div className="space-y-4">
      {summary ? <GlassCard className="space-y-5 p-5">
        <h2 className="text-lg font-bold">{t('weightTrend')}</h2>
        <dl className="grid grid-cols-3 gap-3">
          <div className="glass-strong rounded-control p-3"><dt className="text-xs text-muted">{t('latest')}</dt>
            <dd className="font-display text-2xl font-extrabold">{formatNumber(summary.latest, locale)} <span className="text-sm">{t('kg')}</span></dd></div>
          <div className="glass-strong rounded-control p-3"><dt className="text-xs text-muted">{t('change')}</dt>
            <dd className="font-display text-2xl font-extrabold" dir="ltr">{signed(summary.change)}</dd></div>
          <div className="glass-strong rounded-control p-3"><dt className="text-xs text-muted">{t('toTarget')}</dt>
            <dd className="font-display text-2xl font-extrabold" dir="ltr">{summary.toTarget === null ? t('dash') : signed(summary.toTarget)}</dd></div>
        </dl>
        <LineChart points={points} bodyFat={bodyFat} title={t('weightTrend')} unit={t('kg')} />
      </GlassCard> : <EmptyState icon={Scale} title={t('noWeightsTitle')} body={t('noWeightsBody')} action={action} />}
      {!summary && bodyFat.length > 0 && <LineChart points={points} bodyFat={bodyFat} title={t('weightTrend')} unit={t('kg')} />}
      {checkIns.some(row => row.photoError) && <p role="alert" className="text-danger">{p('couldntLoadPhotos')}</p>}
      {weeks.some(week => week.photos.length) ? <ProgressGallery weeks={weeks} /> :
        <EmptyState icon={Scale} title={t('noPhotos')} body={t('noCheckinsBody')} action={action} />}
    </div>
  );
}
