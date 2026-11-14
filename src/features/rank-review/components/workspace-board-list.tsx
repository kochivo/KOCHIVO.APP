import Link from 'next/link';
import { Users } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { EmptyState } from '@/ui/empty-state';
import { messages } from '../messages';

// These metals match the existing RankBadge tier artwork.
const tags = { beginner: 'bronzeTag', champion: 'silverTag', elite: 'goldTag', legend: 'platinumTag' } as const;

export function WorkspaceBoardList({ rows, locale, allTime }: {
  rows: LeaderboardRow[]; locale: Locale; allTime: boolean;
}) {
  const t = createT(messages, locale);
  if (!rows.length) return <EmptyState icon={Users} title={t('empty')} body={t('emptyBody')} />;
  return <ol className="glass divide-y divide-line rounded-card p-[18px]" aria-label={t('workspaceTitle')}>
    {rows.map((row, index) => {
      const content = <>
        <span className="w-[18px] shrink-0 font-display text-muted tabular-nums">{formatNumber(index + 1, locale)}</span>
        <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-line bg-surface text-sm font-bold">
          {row.display_name.trim().slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1"><b className="block break-words text-sm">{row.display_name}</b>
          <small className="block truncate text-xs text-muted">{allTime ? t('points', { points: formatNumber(row.lifetime, locale) }) : t('workoutPoints', {
            count: formatNumber(row.done, locale), points: formatNumber(row.monthly, locale),
          })}</small></div>
        <span className="shrink-0 rounded-full bg-gold-2/10 px-[7px] py-0.5 font-display text-[9.5px] font-extrabold tracking-wider text-gold-2">
          {t(tags[row.tier])}
        </span>
      </>;
      return <li key={row.player_id ?? index}>{row.player_id ?
        <Link href={`/captain/players/${row.player_id}`} className="flex min-h-[58px] items-center gap-3 rounded-xl p-2.5">{content}</Link> :
        <div className="flex min-h-[58px] items-center gap-3 rounded-xl p-2.5">{content}</div>}</li>;
    })}
  </ol>;
}
