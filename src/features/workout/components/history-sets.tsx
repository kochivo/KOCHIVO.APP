'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { HistorySet } from '../data/history-grouping';
import { messages } from '../messages';

export function HistorySets({ sets }: { sets: HistorySet[] }) {
  const t = useT(messages);
  const locale = useLocale();
  return <ul className="flex flex-wrap gap-inline">{sets.map(set => <li key={set.id} className="glass-strong rounded-control px-stack py-inline tabular-nums">
    <bdi>{set.weight_kg === 0 ? t('bodyweightPerformance', { reps: formatNumber(set.reps ?? 0, locale) }) :
      t('historyPerformance', { weight: formatNumber(set.weight_kg ?? 0, locale), reps: formatNumber(set.reps ?? 0, locale) })}</bdi>
  </li>)}</ul>;
}
