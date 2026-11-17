'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { formatNumber } from '@/lib/format';
import { ProgressBar } from '@/ui/progress-bar';
import { Medal } from '@/ui/medal';
import type { MedalMetal } from '../medals';
import { messages } from '../messages';
import { legendStars, nextMedalRank, medalRank, MEDAL_RANKS } from '../tiers';
import { timeEstimate } from '../time-estimate';

export function RankHero({ lifetime, weekly = 24 }: { lifetime: number; holdsCrown?: boolean; weekly?: number }) {
  const t = useT(messages);
  const locale = useLocale();
  const rank = medalRank(lifetime);
  const next = nextMedalRank(lifetime);
  const stars = legendStars(lifetime);
  const index = MEDAL_RANKS.findIndex(entry => entry.rank === rank) as MedalMetal;
  const threshold = rank === 'legend' ? 900 + stars * 300 : MEDAL_RANKS[index]?.threshold ?? 0;
  const label = rank === 'legend' ? t('nextStar', { n: formatNumber(next.needed, locale), next: formatNumber(stars + 1, locale) })
    : t('next', { n: formatNumber(next.needed, locale), tier: t(next.rank) });
  const estimate = timeEstimate(next.needed, weekly);
  const refined = captainWorkspaceEnabled();
  const rankLabel = stars ? t('legendWithStars', { n: formatNumber(stars, locale) }) : t(rank);
  return <section className={refined ? "glass-strong cut-corner space-y-stack rounded-card border-lime/20 p-card" : "glass-strong space-y-stack rounded-card p-card"}>
    <div className="flex items-center gap-stack">
      <Medal rank={index} size={96} label={rankLabel} />
      <div className="min-w-0 flex-1 space-y-inline">
        <h2 className="font-display text-h font-extrabold">{rankLabel}</h2>
        {refined ? <p className="flex flex-wrap items-baseline gap-inline text-xs text-muted"><bdi className="engraved text-stat">{formatNumber(lifetime, locale)}</bdi>{t('lifetime')}</p>
          : <p className="text-sm text-muted">{t('points', { n: formatNumber(lifetime, locale) })}</p>}
        <ProgressBar thin={refined} value={lifetime - threshold} max={lifetime + next.needed - threshold} aria-label={label} />
        <p className="text-xs text-muted">{t('estimate', { next: label, time: t(estimate.key, { n: formatNumber(estimate.n, locale) }) })}</p>
      </div>
    </div>
  </section>;
}
