'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ProgressBar, RankBadge } from '@/ui';
import { messages } from '../messages';
import { legendStars, LEGEND_STAR_STEP, nextTier, tierFor, TIERS } from '../tiers';
import { ShareRankButton } from './share-rank-button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';

export function RankHero({ lifetime, holdsCrown = false }: { lifetime: number; holdsCrown?: boolean }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled();
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
  return <section className="glass-strong flex flex-col items-center gap-stack rounded-card p-section text-center">
    <RankBadge tier={tier} stars={stars} size="xl" label={rankLabel} />
    <h2 className="text-2xl font-extrabold">{rankLabel}</h2>
    {v6 ? <p className="text-xs text-faint">{v6t('summary', { points: formatNumber(lifetime, locale), needed: formatNumber(next.needed, locale),
      tier: tier === 'legend' ? t('nextStar', { n: formatNumber(next.needed, locale), next: formatNumber(stars + 1, locale) }) : t(next.tier) })}</p>
      : <><p className="text-6xl font-extrabold tabular-nums">{formatNumber(lifetime, locale)}</p>
        <p className="text-sm text-muted">{t('lifetime')}</p></>}
    {next.needed > 0 && <ProgressBar className="w-full" value={lifetime - threshold}
      max={lifetime + next.needed - threshold} aria-label={label} />}
    {!v6 && <p className="text-sm">{label}</p>}
    <ShareRankButton kind={holdsCrown ? 'crown' : 'rank'} />
  </section>;
}
