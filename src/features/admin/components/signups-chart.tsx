'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { endsLabel } from '../format';
import { messages } from '../dashboard/messages';
import type { AdminDashboard } from '../dashboard-types';

export function SignupsChart({ signups }: { signups: AdminDashboard['signups'] }) {
  const t = useT(messages); const locale = useLocale();
  const peak = signups.reduce<(typeof signups)[number] | null>((best, day) =>
    !best || day.captains + day.players > best.captains + best.players ? day : best, null);
  const max = Math.max(1, ...signups.flatMap(day => [day.captains, day.players]));
  return <figure className="glass grid gap-card-gap rounded-card p-card" aria-labelledby="signup-title">
    <header className="flex flex-wrap items-center justify-between gap-stack">
      <h2 id="signup-title" className="text-title font-semibold">{t('signups')}</h2>
      <div className="flex gap-inline text-xs"><span className="text-lime">{t('captainSeries')}</span><span className="text-calm">{t('playerSeries')}</span></div>
    </header>
    {signups.length ? <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="h-32 w-full" role="img"
      aria-label={t('chartSummary', { days: formatNumber(signups.length, locale) })}>
      {signups.map((day, i) => (['captains', 'players'] as const).map((series, j) => {
        const height = day[series] / max * 116;
        return <rect key={`${day.day}-${series}`} data-series={series} x={i * 600 / signups.length + j * 8} y={120 - height}
          width="7" height={height} rx="2" className={series === 'captains' ? 'fill-lime/70' : 'fill-calm/70'} />;
      }))}
    </svg> : <p className="text-sm text-muted">{t('noSignups')}</p>}
    <figcaption className="text-xs text-muted">{peak && peak.captains + peak.players > 0 ? t('peak', {
      day: endsLabel(peak.day, locale), count: formatNumber(peak.captains + peak.players, locale),
    }) : t('noSignups')}</figcaption>
  </figure>;
}
