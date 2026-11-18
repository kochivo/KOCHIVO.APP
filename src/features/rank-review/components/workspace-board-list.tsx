import Link from 'next/link';
import { Medal, Users } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { useArabicStyle } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { medalRank, ranksMessages } from '@/features/ranks';
import type { LeaderboardRow } from '@/features/ranks';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { clickableClass } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { messages } from '../messages';
import { workspaceMessages } from './workspace/messages';

const columns = 'grid grid-cols-[2ch_minmax(0,2fr)_repeat(3,minmax(0,1fr))] items-center gap-inline px-stack min-[1000px]:grid-cols-[3rem_minmax(0,2fr)_repeat(3,minmax(0,1fr))] min-[760px]:px-card';

export function WorkspaceBoardList({ rows, locale, allTime, phoneLeader }: {
  rows: LeaderboardRow[]; locale: Locale; allTime: boolean; phoneLeader?: LeaderboardRow;
}) {
  const style = useArabicStyle();
  const t = createT(workspaceMessages, locale, style);
  const labels = createT(messages, locale, style);
  const medals = createT(ranksMessages, locale, style);
  if (!rows.length) return <EmptyState icon={Users} title={labels('empty')} body={labels('emptyBody')} />;

  return <div role="table" className={cn('glass overflow-hidden rounded-card', phoneLeader && rows.length === 1 && 'max-md:hidden')} aria-label={labels('workspaceTitle')}>
    <div role="row" className={cn(columns, 'min-h-10 text-micro text-muted max-md:sr-only')}>
      <span role="columnheader" aria-label={t('rank')}><span aria-hidden>#</span></span>
      <span role="columnheader">{t('player')}</span>
      <span role="columnheader">{t('medal')}</span>
      <span role="columnheader">{t('workouts')}</span>
      <span role="columnheader">{t('points')}</span>
    </div>
    {rows.map((row, index) => {
      const points = allTime ? row.lifetime : row.monthly;
      const rank = allTime ? index + 1 : row.position;
      return <div role="row" key={row.player_id ?? index}
        className={cn(columns, 'relative min-h-15 border-t border-line-soft text-row max-md:min-h-16 max-md:grid-cols-[2ch_minmax(0,1fr)_auto] max-md:px-card',
          row === phoneLeader && 'max-md:hidden', row.player_id && 'hover:bg-ink/5 focus-within:bg-ink/5 active:bg-ink/10')}>
        <span role="cell" className={cn('min-w-4 font-display font-extrabold tabular-nums', rank === 1 && points > 0 ? 'text-warn' : 'text-muted')}>
          {formatNumber(rank, locale)}
        </span>
        <span role="cell" className="flex min-w-0 items-center gap-stack">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-raised font-bold">
            {row.display_name.trim().slice(0, 1)}
          </span>
          {row.player_id ?
            <Link href={`/captain/players/${row.player_id}`}
              className={`${clickableClass} min-w-0 break-words font-bold transform-none! after:absolute after:inset-0 focus-visible:underline`}>
              {row.display_name}
            </Link> : <b className="min-w-0 break-words">{row.display_name}</b>}
        </span>
        <span role="cell" className="flex min-w-0 items-center gap-inline text-xs max-md:hidden">
          <Medal aria-hidden className="hidden size-4 shrink-0 text-muted min-[960px]:block" />
          <span className="break-words">{medals(medalRank(row.lifetime))}</span>
        </span>
        <span role="cell" className="font-display font-extrabold tabular-nums max-md:hidden">{allTime ? t('missing') : formatNumber(row.done, locale)}</span>
        <span role="cell" className="break-words font-display text-md font-extrabold tabular-nums">{formatNumber(points, locale)}</span>
      </div>;
    })}
  </div>;
}
