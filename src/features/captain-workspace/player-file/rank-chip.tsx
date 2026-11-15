import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { MEDAL_RANKS, medalRank, ranksMessages } from '@/features/ranks/server';
import { formatNumber } from '@/lib/format';
import { Medal } from '@/ui/medal';

export function PlayerMedalChip({ lifetime, locale }: { lifetime: number; locale: Locale }) {
  const t = createT(ranksMessages, locale);
  const rank = medalRank(lifetime);
  return <div className="mb-stack inline-flex h-chip items-center gap-inline rounded-full border border-line bg-surface px-stack text-xs">
    <Medal rank={MEDAL_RANKS.findIndex(entry => entry.rank === rank) as 0 | 1 | 2 | 3 | 4 | 5 | 6} size={28} label={t(rank)} />
    <span>{t(rank)}</span><span>{t('points', { n: formatNumber(lifetime, locale) })}</span>
  </div>;
}
