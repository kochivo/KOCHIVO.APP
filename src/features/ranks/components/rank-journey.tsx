'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Medal } from '@/ui/medal';
import type { MedalMetal } from '../medals';
import { messages } from '../messages';
import { MEDAL_RANKS, medalRank } from '../tiers';

export function RankJourney({ lifetime }: { lifetime: number }) {
  const t = useT(messages);
  const locale = useLocale();
  const current = MEDAL_RANKS.findIndex(entry => entry.rank === medalRank(lifetime));
  return <section className="space-y-stack">
    <h2 className="font-display text-title font-bold">{t('rankMedals')}</h2>
    <ol className="grid grid-cols-3 gap-inline">
      {MEDAL_RANKS.map(({ rank, threshold }, index) => {
        const next = index === current + 1;
        const previous = MEDAL_RANKS[index - 1]?.threshold ?? 0;
        return <li key={rank} className={`flex flex-col items-center gap-inline rounded-control border p-stack text-center text-xs ${next ? 'border-lime/40 bg-lime-soft' : 'border-line bg-surface'}`}>
          <Medal rank={index as MedalMetal} locked={index > current + 1} label={t(rank)} />
          <b>{t(rank)}</b><span className={next ? 'text-lime' : 'text-muted'}>{index <= current ? t('earned') : next
            ? t('percent', { n: formatNumber(Math.floor((lifetime - previous) / (threshold - previous) * 100), locale) })
            : t('points', { n: formatNumber(threshold, locale) })}</span>
        </li>;
      })}
    </ol>
    <p className="text-xs text-muted">{t('starJourney')}</p>
  </section>;
}
