'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { RankBadge } from '@/ui';
import { messages } from '../messages';
import { TIERS } from '../tiers';

export function RankJourney({ lifetime }: { lifetime: number }) {
  const t = useT(messages);
  const locale = useLocale();
  return <section className="glass space-y-card-gap rounded-card p-card">
    <h2 className="font-bold">{t('journey')}</h2>
    <ol className="grid grid-cols-4 gap-inline">
      {TIERS.map(({ tier, threshold }) => <li key={tier} className="flex flex-col items-center gap-inline text-center text-xs">
        <RankBadge tier={tier} size="md" locked={lifetime < threshold} label={t(tier)} />
        <span>{t(tier)}</span><span className="text-muted">{t('points', { n: formatNumber(threshold, locale) })}</span>
      </li>)}
      <li className="col-span-4 text-center text-sm text-muted">{t('starJourney')}</li>
    </ol>
  </section>;
}
