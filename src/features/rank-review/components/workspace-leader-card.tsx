import Link from 'next/link';
import { useArabicStyle } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { medalRank, ranksMessages } from '@/features/ranks';
import type { LeaderboardRow } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { workspaceMessages } from './workspace/messages';
import styles from './workspace-leader-card.module.css';

export function WorkspaceLeaderCard({ row, locale, allTime }: {
  row: LeaderboardRow; locale: Locale; allTime: boolean;
}) {
  const points = allTime ? row.lifetime : row.monthly;
  const style = useArabicStyle();
  const t = createT(workspaceMessages, locale, style);
  const labels = createT(messages, locale, style);
  const medals = createT(ranksMessages, locale, style);
  if (points <= 0) return null;
  const title = t(allTime ? 'firstAllTime' : 'firstMonthly');
  return <section aria-label={title} className={`${styles.card} glass-strong cut-corner relative flex min-w-0 items-center gap-inline rounded-card p-card min-[760px]:gap-card-gap`}>
    <span aria-hidden className={`${styles.engraved} engraved shrink-0 text-stat-large-wide max-md:hidden`}>{formatNumber(1, locale)}</span>
    <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-warn bg-surface-raised text-title font-bold md:size-15">
      {row.display_name.trim().slice(0, 1)}
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold text-warn">{title}</p>
      {row.player_id ?
        <Link href={`/captain/players/${row.player_id}`}
          className="cursor-pointer break-words text-title font-bold after:absolute after:inset-0 hover:underline focus-visible:underline">
          {row.display_name}
        </Link> : <b className="break-words text-title">{row.display_name}</b>}
      <p className="flex flex-wrap items-center gap-x-inline text-xs text-muted">
        {!allTime && <><span>{labels('workoutCount', { n: row.done, count: formatNumber(row.done, locale) })}</span><span aria-hidden>·</span></>}
        <span>{t('leaderMedal', { medal: medals(medalRank(row.lifetime)) })}</span>
      </p>
    </div>
    <div className="max-w-1/3 text-end">
      <b className="hidden break-words font-display text-stat font-extrabold tabular-nums md:inline">{formatNumber(points, locale)}</b>
      <b className={`${styles.engraved} engraved whitespace-nowrap text-stat-large md:hidden`}>{formatNumber(points, locale)}</b>
      <p className="text-xs text-muted max-md:sr-only">{t('points')}</p>
    </div>
  </section>;
}
