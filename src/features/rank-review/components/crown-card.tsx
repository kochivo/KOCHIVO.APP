import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { RankBadge } from '@/ui';
import { messages } from '../messages';

export function CrownCard({ holder, locale }: { holder?: LeaderboardRow; locale: Locale }) {
  const t = createT(messages, locale);
  return <section className="glass-strong flex items-center gap-5 rounded-card p-5" aria-label={t('crown')}>
    <RankBadge tier="crown" size="lg" label={t('crown')} />
    <div className="min-w-0 space-y-2">
      <h2 className="break-words text-xl font-bold">{holder ? holder.display_name : t('noCrown')}</h2>
      <p className="text-muted">{holder ? t('monthly', { count: formatNumber(holder.monthly, locale) })
        : t('rule', { count: formatNumber(20, locale) })}</p>
    </div>
  </section>;
}
