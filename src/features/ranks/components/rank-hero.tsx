'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ProgressBar, RankBadge } from '@/ui';
import { messages } from '../messages';
import { legendStars, LEGEND_STAR_STEP, nextTier, tierFor, TIERS } from '../tiers';
import { ShareRankButton } from './share-rank-button';

export function RankHero({ lifetime, holdsCrown = false }: { lifetime: number; holdsCrown?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const tier = tierFor(lifetime);
  const next = nextTier(lifetime);
  const stars = legendStars(lifetime);
  const rankLabel = stars ? t('legendWithStars', { n: formatNumber(stars, locale) }) : t(tier);
  const threshold = tier === 'legend' ? 600 + stars * LEGEND_STAR_STEP
    : TIERS.find(entry => entry.tier === tier)?.threshold ?? 0;
  const label = tier === 'legend' ? t('nextStar', {
    n: formatNumber(next.needed, locale), next: formatNumber(stars + 1, locale),
  }) : t('next', { n: formatNumber(next.needed, locale), tier: t(next.tier) });
  return <section className="glass-strong flex flex-col items-center gap-3 rounded-card p-6 text-center">
    <RankBadge tier={tier} stars={stars} size="xl" label={rankLabel} />
    <h2 className="text-2xl font-extrabold">{rankLabel}</h2>
    <p className="text-6xl font-extrabold tabular-nums">{formatNumber(lifetime, locale)}</p>
    <p className="text-sm text-muted">{t('lifetime')}</p>
    {next.needed > 0 && <ProgressBar className="w-full" value={lifetime - threshold}
      max={lifetime + next.needed - threshold} aria-label={label} />}
    <p className="text-sm">{label}</p>
    <ShareRankButton kind={holdsCrown ? 'crown' : 'rank'} />
  </section>;
}
