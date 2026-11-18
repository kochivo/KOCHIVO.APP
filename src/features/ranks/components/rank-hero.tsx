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

export function RankHero({ lifetime, weekly }: { lifetime: number; holdsCrown?: boolean; weekly?: number }) {
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
  const estimateLabel = t('estimate', { next: label, time: estimate
    ? t(estimate.key, { n: formatNumber(estimate.n, locale) }) : t('moreHistoryForEstimate') });
  const refined = captainWorkspaceEnabled();
  const rankLabel = stars ? t('legendWithStars', { n: formatNumber(stars, locale) }) : t(rank);
  if (refined) return <section data-rank-section="hero" className="glass-strong cut-corner space-y-stack rounded-card border-warn/30 bg-warn-soft p-card text-center">
    <div className="flex justify-center"><Medal rank={index} size={84} label={rankLabel} /></div>
    <h2 className="font-display text-title font-extrabold">{rankLabel}</h2>
    <p className="flex flex-col items-center gap-inline text-xs text-muted">
      <bdi className="engraved text-stat-large-wide [-webkit-text-stroke-color:var(--color-warn)] [background-image:repeating-linear-gradient(135deg,var(--color-warn)_0_1.6px,transparent_1.6px_5.5px)]">{formatNumber(lifetime, locale)}</bdi>{t('lifetime')}
    </p>
    <ProgressBar thin className="[&>div]:bg-warn [&>div]:bg-none" value={lifetime - threshold} max={lifetime + next.needed - threshold} aria-label={label} />
    <p className="text-xs text-muted">{estimateLabel}</p>
  </section>;
  return <section className="glass-strong space-y-stack rounded-card p-card">
    <div className="flex items-center gap-stack">
      <Medal rank={index} size={96} label={rankLabel} />
      <div className="min-w-0 flex-1 space-y-inline">
        <h2 className="font-display text-h font-extrabold">{rankLabel}</h2>
        <p className="text-sm text-muted">{t('points', { n: formatNumber(lifetime, locale) })}</p>
        <ProgressBar thin={refined} value={lifetime - threshold} max={lifetime + next.needed - threshold} aria-label={label} />
        <p className="text-xs text-muted">{estimateLabel}</p>
      </div>
    </div>
  </section>;
}
