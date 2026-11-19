import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { CROWN_MIN_WORKOUTS } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { RankBadge } from '@/ui';
import { messages } from '../messages';

export function CrownCard({ holder, locale }: { holder?: LeaderboardRow; locale: Locale }) {
  const t = createT(messages, locale);
  return <section className="glass-strong flex items-center gap-card-gap rounded-card p-card" aria-label={t('crown')}>
    <RankBadge tier="crown" size="lg" label={t('crown')} />
    <div className="min-w-0 space-y-inline">
      <h2 className="break-words text-xl font-bold">{holder ? holder.display_name : t('noCrown')}</h2>
      <p className="text-muted">{holder ? t('adherence', {
        n: formatNumber(holder.adherence, locale), done: formatNumber(holder.done, locale),
        planned: formatNumber(holder.planned, locale),
      }, holder.planned) : t('rule', { n: CROWN_MIN_WORKOUTS, count: formatNumber(CROWN_MIN_WORKOUTS, locale) })}</p>
    </div>
  </section>;
}
