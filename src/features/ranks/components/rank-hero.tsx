'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ProgressBar, RankBadge } from '@/ui';
import { messages } from '../messages';
import { nextTier, tierFor, TIERS } from '../tiers';

export function RankHero({ lifetime }: { lifetime: number }) {
  const t = useT(messages);
  const locale = useLocale();
  const tier = tierFor(lifetime);
  const next = nextTier(lifetime);
  const threshold = TIERS.find(entry => entry.tier === tier)?.threshold ?? 0;
  const label = next.needed ? t('next', { n: formatNumber(next.needed, locale), tier: t(next.tier) }) : t('top');
  return <section className="glass-strong flex flex-col items-center gap-3 rounded-card p-6 text-center">
    <RankBadge tier={tier} size="xl" label={t(tier)} />
    <h2 className="text-2xl font-extrabold">{t(tier)}</h2>
    <p className="text-6xl font-extrabold tabular-nums">{formatNumber(lifetime, locale)}</p>
    <p className="text-sm text-muted">{t('lifetime')}</p>
    {next.needed > 0 && <ProgressBar className="w-full" value={lifetime - threshold}
      max={lifetime + next.needed - threshold} aria-label={label} />}
    <p className="text-sm">{label}</p>
  </section>;
}
