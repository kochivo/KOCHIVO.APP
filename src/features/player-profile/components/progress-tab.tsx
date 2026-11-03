import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';

import Image from 'next/image';
import { Scale } from 'lucide-react';
import { EmptyState, GlassCard } from '@/ui';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { LineChart } from '@/features/progress';
import { weightPoints, weightSummary } from '../model';
import type { ProfileCheckIn } from '../types';

export async function ProgressTab({ checkIns, targetKg, playerId }: { checkIns: ProfileCheckIn[]; targetKg: number | null; playerId: string }) {
  const [t, locale] = await Promise.all([getT(messages), getLocale()]);
  const points = weightPoints(checkIns);
  const summary = weightSummary(points, targetKg);
  const signed = (value: number) => `${value > 0 ? '+' : ''}${formatNumber(value, locale)} ${t('kg')}`;
  const photos = checkIns.filter((row) => row.photos.length);
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
        <LineChart points={points} title={t('weightTrend')} unit={t('kg')} />
      </GlassCard> : <EmptyState icon={Scale} title={t('noWeightsTitle')} body={t('noWeightsBody')} action={action} />}
      <GlassCard className="space-y-4 p-5">
        <h2 className="text-lg font-bold">{t('photos')}</h2>
        {photos.length ? <ul className="space-y-4">{photos.map((row) => {
          const date = formatDateAr(row.weekStart, { day: 'numeric', month: 'long' }, locale);
          return <li key={row.id} className="space-y-2">
            <p className="text-sm text-muted">{t('week', { date })}</p>
            <div className="grid grid-cols-3 gap-2">{row.photos.map((url) =>
              <Image key={url} src={url} alt={t('photoAlt', { date })} width={320} height={427} unoptimized
                className="aspect-3/4 h-auto w-full rounded-control object-cover" />)}</div>
          </li>;
        })}</ul> : <EmptyState icon={Scale} title={t('noPhotos')} body={t('noCheckinsBody')} action={action} />}
      </GlassCard>
    </div>
  );
}
