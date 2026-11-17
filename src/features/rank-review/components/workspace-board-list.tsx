import { clickableClass } from '@/ui/button';
import { RowChevron } from '@/ui/row-chevron';
import Link from 'next/link';
import { Users } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { EmptyState } from '@/ui/empty-state';
import { messages } from '../messages';
import { MEDAL_RANKS, medalRank, ranksMessages } from '@/features/ranks';
import { Medal } from '@/ui/medal';

export function WorkspaceBoardList({ rows, locale, allTime }: {
  rows: LeaderboardRow[]; locale: Locale; allTime: boolean;
}) {
  const t = createT(messages, locale);
  if (!rows.length) return <EmptyState icon={Users} title={t('empty')} body={t('emptyBody')} />;
  return <ol className="glass divide-y divide-line rounded-card p-card" aria-label={t('workspaceTitle')}>
    {rows.map((row, index) => {
      const content = <>
        <span className="shrink-0 font-display text-muted tabular-nums">{(allTime ? row.lifetime : row.monthly) > 0 ? formatNumber(index + 1, locale) : t('notYet')}</span>
        <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-line bg-surface text-sm font-bold">
          {row.display_name.trim().slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1"><b className="block break-words text-sm">{row.display_name}</b>
          <small className="block truncate text-xs text-muted">{allTime ? t('points', { n: row.lifetime, points: formatNumber(row.lifetime, locale) }) :
            `${t('workoutCount', { n: row.done, count: formatNumber(row.done, locale) })} · ${t('points', { n: row.monthly, points: formatNumber(row.monthly, locale) })}`}</small></div>
        <Medal rank={MEDAL_RANKS.findIndex(entry => entry.rank === medalRank(row.lifetime)) as 0 | 1 | 2 | 3 | 4 | 5 | 6} size={36} label={createT(ranksMessages, locale)(medalRank(row.lifetime))} />
      </>;
      return <li key={row.player_id ?? index}>{row.player_id ?
        <Link href={`/captain/players/${row.player_id}`} className={`${clickableClass} flex min-h-[58px] items-center gap-stack rounded-xl p-stack`}>{content}<RowChevron /></Link> :
        <div className="flex min-h-[58px] items-center gap-stack rounded-xl p-stack">{content}</div>}</li>;
    })}
  </ol>;
}
