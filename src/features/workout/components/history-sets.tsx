'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { HistorySet } from '../data/history-grouping';
import { messages } from '../messages';
import { messages as setMessages } from '@/lib/training/messages';

export function HistorySets({ sets }: { sets: HistorySet[] }) {
  const t = useT(messages);
  const locale = useLocale();
  const st = useT(setMessages);
  return <ul className="flex flex-wrap gap-inline">{sets.filter(set => (set.drop_index ?? 0) === 0).map(set => <li key={set.id} className="glass-strong rounded-control px-stack py-inline tabular-nums">
    <bdi>{set.weight_kg === 0 ? t('bodyweightPerformance', { reps: formatNumber(set.reps ?? 0, locale) }) :
      t('historyPerformance', { weight: formatNumber(set.weight_kg ?? 0, locale), reps: formatNumber(set.reps ?? 0, locale) })}</bdi>
    {sets.some(row => row.program_exercise_id === set.program_exercise_id && row.set_index === set.set_index && (row.drop_index ?? 0) > 0) &&
      <p className="text-xs text-warn">{st('drops', { values: sets.filter(row => row.program_exercise_id === set.program_exercise_id && row.set_index === set.set_index && (row.drop_index ?? 0) > 0)
        .sort((a, b) => (a.drop_index ?? 0) - (b.drop_index ?? 0)).map(row => `${formatNumber(row.weight_kg ?? 0, locale)} × ${formatNumber(row.reps ?? 0, locale)}`).join('، ') })}</p>}
  </li>)}</ul>;
}
